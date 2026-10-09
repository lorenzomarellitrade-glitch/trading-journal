import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { consumoRischio, giornateVinteEPerse, riepiloga } from '../lib/aggregazioni'
import { caricaAccount, caricaImpostazioni, caricaTrades, IMPOSTAZIONI_DEFAULT } from '../lib/dati'
import { inizioSettimana, primoDelMese } from '../lib/date'
import {
  formattaData,
  formattaPercent,
  formattaR,
  formattaRR,
  formattaUsd,
  oggiIso,
  VUOTO,
} from '../lib/formato'
import { statoConti } from '../lib/obiettivi'
import {
  andamentoCumulato,
  curvaPnl,
  drawdownMassimo,
  giornate as calcolaGiornate,
  giornoMiglioreEPeggiore,
  mappaSettimane,
  mediaVincitaPerdita,
  pesoGiornoMigliore,
  profitFactor,
  punteggioProcesso,
  punteggioRisultati,
  rischioOltreSoglia,
  rrMedioPianificato,
  serieGiornate,
  SOGLIA_CAMPIONE,
  tradePerGiorno,
  type Giornata,
} from '../lib/statistiche'
import type { Account, TradeCompleto } from '../lib/tipi'
import BarraRischio from '../componenti/BarraRischio'
import { Kpi } from '../componenti/campi'
import MappaSettimane from '../componenti/MappaSettimane'
import MicroCurva from '../componenti/MicroCurva'
import MiniCurva from '../componenti/MiniCurva'
import Punteggio from '../componenti/Punteggio'
import StatoConti from '../componenti/StatoConti'
import { useConteggio } from '../componenti/useAnimazione'
import SelettoreAccount, {
  accountSelezionati,
  type SelezioneAccount,
} from '../componenti/SelettoreAccount'

/**
 * La schermata iniziale: il riassunto del periodo, processo prima dei
 * risultati. Le analisi complete restano in Statistiche; qui si guarda in
 * un colpo d'occhio dove si è e se si sta seguendo il piano.
 */

type Periodo = 'tutto' | 'mese' | 'settimana'

/** Settimane della mappa a calore nella scheda Costanza. */
const SETTIMANE_MAPPA = 8
type Unita = 'usd' | 'percent'

const PERIODI: { valore: Periodo; etichetta: string }[] = [
  { valore: 'tutto', etichetta: 'Tutto' },
  { valore: 'mese', etichetta: 'Mese' },
  { valore: 'settimana', etichetta: 'Settimana' },
]

/** Tracciati delle icone dei riquadri, nello stile a linea sottile di Statistiche. */
const ICONE = {
  bersaglio: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  bilancia: 'M12 3v18M5 7h14M5 7l-3 7a3 3 0 0 0 6 0L5 7Zm14 0-3 7a3 3 0 0 0 6 0l-3-7ZM8 21h8',
  salita: 'M3 17l6-6 4 4 7-7M14 4h7v7',
  battito: 'M22 12h-4l-3 9L9 3l-3 9H2',
} as const

/** Primo giorno del periodo, o null per "Tutto". */
function inizioPeriodo(periodo: Periodo, oggi: string): string | null {
  if (periodo === 'settimana') return inizioSettimana(oggi)
  if (periodo === 'mese') {
    const [anno, mese] = oggi.split('-').map(Number)
    return primoDelMese(anno, mese - 1)
  }
  return null
}

function classeSegno(n: number | null | undefined): string {
  if (n == null || n === 0) return 'text-testo'
  return n > 0 ? 'text-positivo' : 'text-negativo'
}

/** Pulsanti affiancati, come il selettore account: uno attivo alla volta. */
function Scelta<T extends string>({
  voci,
  valore,
  onChange,
  etichetta,
}: {
  voci: { valore: T; etichetta: string }[]
  valore: T
  onChange: (v: T) => void
  etichetta: string
}) {
  return (
    <div role="group" aria-label={etichetta} className="flex flex-wrap gap-1">
      {voci.map((v) => (
        <button
          key={v.valore}
          type="button"
          aria-pressed={v.valore === valore}
          onClick={() => onChange(v.valore)}
          className={`rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
            v.valore === valore
              ? 'border-accento bg-accento/15 text-accento'
              : 'border-bordo text-testo-soft hover:text-testo'
          }`}
        >
          {v.etichetta}
        </button>
      ))}
    </div>
  )
}

/** Una riga delle schede Rischio e Costanza: etichetta a sinistra, valore a destra. */
function Riga({ etichetta, children, nota }: { etichetta: string; children: ReactNode; nota?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-bordo/60 py-2 last:border-0">
      <dt className="text-sm text-testo-soft">{etichetta}</dt>
      <dd className="num text-right text-sm text-testo">
        {children}
        {nota && <span className="block text-[11px] text-testo-soft">{nota}</span>}
      </dd>
    </div>
  )
}

function Scheda({
  titolo,
  sottotitolo,
  children,
}: {
  titolo: string
  sottotitolo: string
  children: ReactNode
}) {
  return (
    <section className="riquadro p-4">
      <header className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium text-testo">{titolo}</h2>
        <p className="text-xs text-testo-soft">{sottotitolo}</p>
      </header>
      {children}
    </section>
  )
}

export default function Home() {
  const oggi = oggiIso()

  const [trades, setTrades] = useState<TradeCompleto[]>([])
  const [account, setAccount] = useState<Account[]>([])
  const [impostazioni, setImpostazioni] = useState(IMPOSTAZIONI_DEFAULT)
  const [selezione, setSelezione] = useState<SelezioneAccount>(null)
  const [periodo, setPeriodo] = useState<Periodo>('tutto')
  const [unita, setUnita] = useState<Unita>('usd')

  const [caricamento, setCaricamento] = useState(true)
  const [errore, setErrore] = useState<string | null>(null)

  useEffect(() => {
    let annullato = false

    async function carica() {
      try {
        const [t, a, imp] = await Promise.all([caricaTrades(), caricaAccount(), caricaImpostazioni()])
        if (annullato) return
        setTrades(t)
        setAccount(a)
        setImpostazioni(imp)
      } catch (e) {
        if (!annullato) setErrore(e instanceof Error ? e.message : String(e))
      } finally {
        if (!annullato) setCaricamento(false)
      }
    }

    void carica()
    return () => {
      annullato = true
    }
  }, [])

  const selezionati = useMemo(() => accountSelezionati(account, selezione), [account, selezione])
  const da = inizioPeriodo(periodo, oggi)

  /** I trade dei conti selezionati, di qualsiasi data. */
  const deiConti = useMemo(() => {
    const ids = new Set(selezionati.map((a) => a.id))
    return trades.filter((t) => (t.executions ?? []).some((e) => ids.has(e.account_id)))
  }, [trades, selezionati])

  /** Il filtro di periodo vale per tutto, tranne limiti, mappa e stato dei conti. */
  const filtrati = useMemo(
    () => (da == null ? deiConti : deiConti.filter((t) => t.data >= da)),
    [deiConti, da],
  )

  /** La mappa guarda sempre le ultime settimane: con il filtro "Settimana" sarebbe vuota. */
  const mappa = useMemo(
    () => mappaSettimane(calcolaGiornate(deiConti, selezionati), oggi, SETTIMANE_MAPPA),
    [deiConti, selezionati, oggi],
  )

  const dati = useMemo(() => {
    const generale = riepiloga(filtrati, selezionati)
    const elenco = calcolaGiornate(filtrati, selezionati)
    return {
      generale,
      elenco,
      giornate: giornateVinteEPerse(filtrati, selezionati),
      processo: punteggioProcesso(filtrati),
      risultati: punteggioRisultati(filtrati, selezionati),
      curva: curvaPnl(filtrati, selezionati),
      pf: profitFactor(filtrati, selezionati),
      medie: mediaVincitaPerdita(filtrati, selezionati),
      rr: rrMedioPianificato(filtrati, selezionati),
      oltreSoglia: rischioOltreSoglia(filtrati, selezionati, impostazioni.soglia_rischio_trade_percent),
      dd: drawdownMassimo(filtrati, selezionati),
      serie: serieGiornate(elenco),
      estremi: giornoMiglioreEPeggiore(elenco),
      peso: pesoGiornoMigliore(elenco),
      perGiorno: tradePerGiorno(filtrati),
      andamento: andamentoCumulato(filtrati, selezionati),
    }
  }, [filtrati, selezionati, impostazioni])

  /**
   * Limiti di perdita e stato dei conti ignorano il periodo: parlano sempre di
   * oggi, di questa settimana e dei conti su cui si opera adesso.
   */
  const attivi = useMemo(() => selezionati.filter((a) => a.attivo), [selezionati])
  const consumo = useMemo(
    () =>
      consumoRischio(
        trades,
        attivi,
        oggi,
        impostazioni.limite_giornaliero_percent,
        impostazioni.limite_settimanale_percent,
      ),
    [trades, attivi, oggi, impostazioni],
  )
  const stati = useMemo(
    () => statoConti(trades, account.filter((a) => a.attivo), oggi),
    [trades, account, oggi],
  )

  if (caricamento) return <p className="text-sm text-testo-soft">Caricamento…</p>

  if (errore) {
    return (
      <p className="rounded-md border border-negativo/40 bg-negativo/10 px-3 py-2 text-sm text-negativo">
        {errore}
      </p>
    )
  }

  const { generale, medie, serie, estremi } = dati
  const chiusi = generale.numeroChiusi
  const inUsd = unita === 'usd'

  /** Un importo nell'unità scelta, sempre col segno. */
  const importo = (usd: number | null, percent: number | null) =>
    inUsd ? formattaUsd(usd, true) : formattaPercent(percent, 2, true)
  /** Lo stesso importo nell'altra unità, come nota. */
  const altraUnita = (usd: number | null, percent: number | null) =>
    inUsd ? formattaPercent(percent, 2, true) : formattaUsd(usd, true)

  const giornoBreve = (g: Giornata | null) =>
    g == null ? undefined : formattaData(g.data).replace(/ \d{4}$/, '')

  const giornateTotali = dati.giornate.vinte + dati.giornate.perse + dati.giornate.pari

  return (
    <div className="space-y-4">
      {/* --- Filtri ------------------------------------------------------- */}
      <section className="riquadro flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-medium tracking-tight">Home</h1>
          <span className="num text-xs text-testo-soft">
            {da ? `dal ${formattaData(da)} a oggi` : 'tutto lo storico'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <SelettoreAccount account={account} selezione={selezione} onChange={setSelezione} />
          <span className="hidden h-6 w-px bg-bordo sm:block" aria-hidden="true" />
          <Scelta etichetta="Periodo" voci={PERIODI} valore={periodo} onChange={setPeriodo} />
          <span className="hidden h-6 w-px bg-bordo sm:block" aria-hidden="true" />
          <Scelta
            etichetta="Unità"
            voci={[
              { valore: 'usd', etichetta: '$' },
              { valore: 'percent', etichetta: '%' },
            ]}
            valore={unita}
            onChange={setUnita}
          />
        </div>
      </section>

      {chiusi > 0 && chiusi < SOGLIA_CAMPIONE && (
        <p className="rounded-md border border-accento/40 bg-accento/10 px-3 py-2 text-xs text-accento">
          Solo {chiusi} {chiusi === 1 ? 'trade concluso' : 'trade conclusi'} nel periodo: sotto i{' '}
          {SOGLIA_CAMPIONE} questi numeri dicono poco.
        </p>
      )}

      {/* --- Punteggi e P&L ----------------------------------------------- */}
      {/* Processo in alto a sinistra, dove parte la lettura; il P&L è la card
          più grande ma viene dopo. */}
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="grid gap-3">
          <Punteggio
            titolo="Processo"
            spiegazione="Quanto hai seguito il piano: conferme, finestra, stop fermo, uscita a piano, idea tua."
            punteggio={dati.processo}
          />
          <Punteggio
            titolo="Risultati"
            spiegazione="Dall'expectancy in R: 50 è il pareggio, 100 vuol dire +1R medio a trade."
            punteggio={dati.risultati}
          />
        </div>

        <section
          className={`riquadro flex flex-col p-5 lg:col-span-2 ${
            chiusi === 0 || generale.pnlUsd === 0
              ? ''
              : generale.pnlUsd > 0
                ? 'alone-positivo'
                : 'alone-negativo'
          }`}
        >
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-testo-soft">P&amp;L del periodo</p>
              {chiusi > 0 ? (
                <NumeroContato
                  key={unita}
                  valore={inUsd ? generale.pnlUsd : generale.pnlPercent}
                  formatta={(v) => importo(v, v)}
                  className={`mt-1 text-5xl font-medium tracking-tight ${classeSegno(generale.pnlUsd)}`}
                />
              ) : (
                <p className="mt-1 text-5xl text-testo-soft">{VUOTO}</p>
              )}
            </div>

            <dl className="num grid grid-cols-3 gap-x-6 gap-y-1 text-right">
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-testo-soft">
                  {inUsd ? 'In %' : 'In $'}
                </dt>
                <dd className={`text-sm ${classeSegno(chiusi > 0 ? generale.pnlUsd : null)}`}>
                  {chiusi > 0 ? altraUnita(generale.pnlUsd, generale.pnlPercent) : VUOTO}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-testo-soft">Trade</dt>
                <dd className="text-sm text-testo">{generale.numeroTrade}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wide text-testo-soft">Giornate</dt>
                <dd className="text-sm text-testo">{giornateTotali}</dd>
              </div>
            </dl>
          </div>

          <div className="mt-4 flex-1">
            <MiniCurva
              punti={dati.curva.map((p) => ({ data: p.data, valore: (inUsd ? p.usd : p.percent) ?? 0 }))}
              formatta={(v) => importo(v, v)}
            />
          </div>
        </section>
      </div>

      {/* --- Riquadri: il numero sopra, la sua forma sotto ----------------- */}
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          etichetta="Win rate"
          icona={ICONE.bersaglio}
          valore={generale.winRate == null ? VUOTO : formattaPercent(generale.winRate, 0)}
          nota={`${generale.vittorie} su ${chiusi} conclusi`}
          grafico={
            <MicroCurva valori={dati.andamento.winRate} descrizione="win rate trade dopo trade" />
          }
        />
        <Kpi
          etichetta="Profit factor"
          icona={ICONE.bilancia}
          valore={
            dati.pf == null
              ? VUOTO
              : dati.pf.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          }
          nota={dati.pf == null && medie.vincite > 0 ? 'nessuna perdita' : 'vinto lordo ÷ perso lordo'}
          grafico={
            <MicroCurva
              valori={dati.andamento.profitFactor.filter((v): v is number => v != null)}
              descrizione="profit factor trade dopo trade"
            />
          }
        />
        <Kpi
          etichetta="Expectancy"
          icona={ICONE.salita}
          valore={formattaR(generale.expectancyR)}
          classe={classeSegno(generale.expectancyR)}
          nota={
            chiusi > 0
              ? `${importo(
                  generale.pnlUsd / chiusi,
                  generale.pnlPercent == null ? null : generale.pnlPercent / chiusi,
                )} per trade`
              : undefined
          }
          grafico={
            <MicroCurva valori={dati.andamento.expectancyR} descrizione="expectancy in R trade dopo trade" />
          }
        />
        <Kpi
          etichetta="Media vincita / perdita"
          icona={ICONE.battito}
          valore={
            <span className="flex flex-wrap items-baseline gap-x-1.5">
              <span className="text-positivo">{importo(medie.vincitaUsd, medie.vincitaPercent)}</span>
              <span className="text-testo-soft">/</span>
              <span className="text-negativo">{importo(medie.perditaUsd, medie.perditaPercent)}</span>
            </span>
          }
          nota={
            medie.rapporto == null
              ? undefined
              : `rapporto ${medie.rapporto.toLocaleString('it-IT', { maximumFractionDigits: 2 })}`
          }
          grafico={<Proporzione vincita={medie.vincitaUsd} perdita={medie.perditaUsd} />}
        />
      </dl>

      {/* --- Rischio e Costanza ------------------------------------------- */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Scheda titolo="Rischio" sottotitolo="Quanto metto in gioco e quanto vicino vado ai limiti">
          <dl>
            <Riga
              etichetta="Rischio medio per trade"
              nota={`soglia ${formattaPercent(impostazioni.soglia_rischio_trade_percent, 1)}`}
            >
              <span
                className={
                  generale.rischioMedioPercent != null &&
                  generale.rischioMedioPercent > impostazioni.soglia_rischio_trade_percent
                    ? 'text-negativo'
                    : ''
                }
              >
                {formattaPercent(generale.rischioMedioPercent)}
              </span>
            </Riga>
            <Riga
              etichetta="Trade oltre la soglia"
              nota={dati.oltreSoglia.totale > 0 ? `su ${dati.oltreSoglia.totale}` : undefined}
            >
              <span className={dati.oltreSoglia.oltre > 0 ? 'text-negativo' : ''}>
                {dati.oltreSoglia.oltre}
              </span>
            </Riga>
            <Riga etichetta="R:R pianificato medio" nota="al momento dell'entrata">
              {formattaRR(dati.rr)}
            </Riga>
            <Riga
              etichetta="Perdita media"
              nota={medie.perdite > 0 ? altraUnita(medie.perditaUsd, medie.perditaPercent) : undefined}
            >
              <span className="text-negativo">{importo(medie.perditaUsd, medie.perditaPercent)}</span>
            </Riga>
            <Riga
              etichetta="Drawdown massimo"
              nota={
                dati.dd.usd > 0
                  ? inUsd
                    ? `${formattaPercent(dati.dd.percent)} del capitale`
                    : formattaUsd(-dati.dd.usd)
                  : undefined
              }
            >
              <span className={dati.dd.usd > 0 ? 'text-negativo' : ''}>
                {dati.dd.usd > 0
                  ? importo(-dati.dd.usd, dati.dd.percent == null ? null : -dati.dd.percent)
                  : importo(0, 0)}
              </span>
            </Riga>
          </dl>

          {attivi.length > 0 && (
            <div className="mt-3 border-t border-bordo pt-3">
              <BarraRischio consumo={consumo} incorniciata={false} />
            </div>
          )}
        </Scheda>

        <Scheda titolo="Costanza" sottotitolo="Si contano le giornate, non i trade">
          <div className="mb-3 border-b border-bordo pb-3">
            <MappaSettimane mappa={mappa} inUsd={inUsd} />
          </div>
          <dl>
            <Riga
              etichetta="Giornate in utile"
              nota={giornateTotali > 0 ? `${dati.giornate.perse} in perdita` : undefined}
            >
              {giornateTotali > 0 ? (
                <>
                  {dati.giornate.vinte} su {giornateTotali}{' '}
                  <span className="text-testo-soft">
                    ({formattaPercent((dati.giornate.vinte / giornateTotali) * 100, 0)})
                  </span>
                </>
              ) : (
                VUOTO
              )}
            </Riga>
            <Riga etichetta="Serie attuale">
              {serie.attuale === 0 ? (
                VUOTO
              ) : (
                <span className={serie.segnoAttuale > 0 ? 'text-positivo' : 'text-negativo'}>
                  {serie.attuale}{' '}
                  {serie.segnoAttuale > 0
                    ? serie.attuale === 1
                      ? 'in utile'
                      : 'in utile di fila'
                    : serie.attuale === 1
                      ? 'in perdita'
                      : 'in perdita di fila'}
                </span>
              )}
            </Riga>
            <Riga etichetta="Serie più lunga">
              <span className="text-positivo">{serie.maxVincenti} in utile</span>
              <span className="text-testo-soft"> · </span>
              <span className="text-negativo">{serie.maxPerdenti} in perdita</span>
            </Riga>
            <Riga
              etichetta="Trade al giorno"
              nota={
                dati.perGiorno.giornate > 0
                  ? `massimo ${dati.perGiorno.massimo} in una giornata`
                  : undefined
              }
            >
              {dati.perGiorno.media == null
                ? VUOTO
                : dati.perGiorno.media.toLocaleString('it-IT', { maximumFractionDigits: 1 })}
            </Riga>
            <Riga etichetta="Giorno migliore" nota={giornoBreve(estremi.migliore)}>
              <span className={classeSegno(estremi.migliore?.pnlUsd)}>
                {estremi.migliore
                  ? importo(estremi.migliore.pnlUsd, estremi.migliore.pnlPercent)
                  : VUOTO}
              </span>
            </Riga>
            <Riga etichetta="Giorno peggiore" nota={giornoBreve(estremi.peggiore)}>
              <span className={classeSegno(estremi.peggiore?.pnlUsd)}>
                {estremi.peggiore
                  ? importo(estremi.peggiore.pnlUsd, estremi.peggiore.pnlPercent)
                  : VUOTO}
              </span>
            </Riga>
            <Riga
              etichetta="Peso del giorno migliore"
              nota={dati.peso == null ? 'serve un periodo in utile' : 'del profitto del periodo'}
            >
              {formattaPercent(dati.peso, 0)}
            </Riga>
          </dl>
        </Scheda>
      </div>

      {/* --- Stato dei conti ---------------------------------------------- */}
      {/* Gli stessi anelli del Calendario: target e margine di drawdown statico. */}
      {stati.length > 0 && <StatoConti stati={stati} />}

      {trades.length === 0 && (
        <p className="riquadro px-4 py-6 text-center text-sm text-testo-soft">
          Nessun trade registrato.{' '}
          <Link to="/trade/nuovo" className="text-accento hover:underline">
            Inserisci il primo
          </Link>
          .
        </p>
      )}

      <p className="text-[11px] text-testo-soft">
        Limiti di perdita, mappa delle settimane e stato dei conti ignorano il filtro di periodo:
        parlano sempre di oggi, delle ultime settimane e di tutto lo storico di ciascun conto. Le analisi complete sono in{' '}
        <Link to="/statistiche" className="text-accento hover:underline">
          Statistiche
        </Link>
        .
      </p>
    </div>
  )
}

/**
 * Un importo grande che conta fino al suo valore: da zero all'apertura, dal
 * valore precedente al cambio di filtro. Con movimento ridotto è subito fermo.
 */
function NumeroContato({
  valore,
  formatta,
  className,
}: {
  valore: number | null
  formatta: (v: number) => string
  className: string
}) {
  const mostrato = useConteggio(valore)
  return (
    <p className={`num ${className}`}>
      {/* Il lettore di schermo legge solo il valore finale, non i passaggi. */}
      <span aria-hidden="true">{mostrato == null ? VUOTO : formatta(mostrato)}</span>
      <span className="sr-only">{valore == null ? VUOTO : formatta(valore)}</span>
    </p>
  )
}

/**
 * Vincita media contro perdita media come due barre in proporzione: si vede
 * subito se si vince più di quanto si perde, a parità di trade.
 */
function Proporzione({ vincita, perdita }: { vincita: number | null; perdita: number | null }) {
  if (vincita == null || perdita == null) return <div className="h-7" aria-hidden="true" />
  const totale = vincita + Math.abs(perdita)
  const quotaVincita = totale > 0 ? (vincita / totale) * 100 : 50

  return (
    <div className="flex h-7 items-center" aria-hidden="true">
      <div className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full">
        <span className="h-full rounded-l-full bg-positivo" style={{ width: `${quotaVincita}%` }} />
        <span className="h-full flex-1 rounded-r-full bg-negativo" />
      </div>
    </div>
  )
}
