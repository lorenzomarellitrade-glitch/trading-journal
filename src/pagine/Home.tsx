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
import { statoConti, type StatoConto } from '../lib/obiettivi'
import {
  curvaPnl,
  drawdownMassimo,
  giornate as calcolaGiornate,
  giornoMiglioreEPeggiore,
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
import MiniCurva from '../componenti/MiniCurva'
import Punteggio from '../componenti/Punteggio'
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
    <section className="rounded-card border border-bordo bg-superficie p-4">
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

  /** Il filtro di periodo e conto vale per tutto, tranne limiti e stato dei conti. */
  const filtrati = useMemo(() => {
    const ids = new Set(selezionati.map((a) => a.id))
    return trades.filter(
      (t) => (da == null || t.data >= da) && (t.executions ?? []).some((e) => ids.has(e.account_id)),
    )
  }, [trades, selezionati, da])

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
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-bordo bg-superficie px-4 py-3">
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
      <div className="grid gap-3 lg:grid-cols-4">
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

        <section className="grid gap-5 rounded-card border border-bordo bg-superficie p-4 sm:grid-cols-[auto_1fr] lg:col-span-2">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-testo-soft">P&amp;L del periodo</p>
            <p className={`num mt-0.5 text-3xl tracking-tight ${classeSegno(chiusi > 0 ? generale.pnlUsd : null)}`}>
              {chiusi > 0 ? importo(generale.pnlUsd, generale.pnlPercent) : VUOTO}
            </p>
            {chiusi > 0 && (
              <p className={`num text-xs ${classeSegno(generale.pnlUsd)}`}>
                {altraUnita(generale.pnlUsd, generale.pnlPercent)}
              </p>
            )}
            <p className="num mt-3 text-xs leading-relaxed text-testo-soft">
              {generale.numeroTrade} trade · {giornateTotali}{' '}
              {giornateTotali === 1 ? 'giornata' : 'giornate'}
            </p>
          </div>
          <MiniCurva
            punti={dati.curva.map((p) => ({ data: p.data, valore: (inUsd ? p.usd : p.percent) ?? 0 }))}
          />
        </section>
      </div>

      {/* --- Riquadri ----------------------------------------------------- */}
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          etichetta="Win rate"
          icona={ICONE.bersaglio}
          valore={generale.winRate == null ? VUOTO : formattaPercent(generale.winRate, 0)}
          nota={`${generale.vittorie} su ${chiusi} conclusi`}
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
            <Riga etichetta="Serie attuale" nota={<UltimeGiornate elenco={dati.elenco} />}>
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
      {stati.length > 0 && <StatoContiCompatto stati={stati} />}

      {trades.length === 0 && (
        <p className="rounded-card border border-bordo bg-superficie px-4 py-6 text-center text-sm text-testo-soft">
          Nessun trade registrato.{' '}
          <Link to="/trade/nuovo" className="text-accento hover:underline">
            Inserisci il primo
          </Link>
          .
        </p>
      )}

      <p className="text-[11px] text-testo-soft">
        Limiti di perdita e stato dei conti ignorano il filtro di periodo: parlano sempre di oggi,
        di questa settimana e di tutto lo storico di ciascun conto. Le analisi complete sono in{' '}
        <Link to="/statistiche" className="text-accento hover:underline">
          Statistiche
        </Link>
        .
      </p>
    </div>
  )
}

/** Le ultime dieci giornate come quadretti: utile, perdita o pari. */
function UltimeGiornate({ elenco }: { elenco: Giornata[] }) {
  if (elenco.length === 0) return null
  return (
    <span className="mt-1 flex justify-end gap-0.5" aria-hidden="true">
      {elenco.slice(-10).map((g) => (
        <span
          key={g.data}
          title={`${formattaData(g.data)}: ${formattaUsd(g.pnlUsd, true)}`}
          className={`h-2.5 w-2.5 rounded-sm ${
            g.pnlUsd > 0 ? 'bg-positivo' : g.pnlUsd < 0 ? 'bg-negativo' : 'bg-bordo'
          }`}
        />
      ))}
    </span>
  )
}

/**
 * Stato di ciascun conto attivo rispetto alle regole della prop, in una riga:
 * quanto manca al target e quanto margine resta prima del drawdown massimo,
 * statico sul saldo iniziale (lib/obiettivi.ts).
 */
function StatoContiCompatto({ stati }: { stati: StatoConto[] }) {
  return (
    <section className="rounded-card border border-bordo bg-superficie p-4">
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium text-testo">Stato dei conti</h2>
        <Link to="/calendario" className="text-xs text-accento hover:underline">
          Dettaglio nel calendario
        </Link>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {stati.map((s) => (
          <div key={s.account.id} className="rounded-md border border-bordo bg-sfondo p-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-testo">{s.account.nome}</span>
              <span className={`num text-sm ${classeSegno(s.pnlPercent)}`}>
                {formattaPercent(s.pnlPercent, 2, true)}
                <span className="ml-2 text-xs">{formattaUsd(s.pnlUsd, true)}</span>
              </span>
            </div>

            {s.targetPercent == null && s.drawdownPercent == null ? (
              <p className="mt-2 text-[11px] text-testo-soft">Nessun obiettivo impostato.</p>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {s.targetPercent != null && s.quotaTarget != null && (
                  <Misura
                    etichetta={`Target ${formattaPercent(s.targetPercent, 0)}`}
                    valore={`${Math.round(Math.min(s.quotaTarget, 9.99) * 100)}% raggiunto`}
                    quota={s.quotaTarget}
                    colore={s.quotaTarget >= 1 ? 'bg-positivo' : 'bg-accento'}
                  />
                )}
                {s.drawdownPercent != null && s.marginePercent != null && s.quotaDrawdown != null && (
                  <Misura
                    etichetta={`Drawdown max −${formattaPercent(s.drawdownPercent, 0)}`}
                    valore={`margine ${formattaPercent(s.marginePercent, 2)}`}
                    quota={s.quotaDrawdown}
                    colore={
                      s.quotaDrawdown >= 1
                        ? 'bg-negativo'
                        : s.quotaDrawdown >= 0.8
                          ? 'bg-accento'
                          : 'bg-testo-soft/50'
                    }
                    avviso={s.quotaDrawdown >= 1 ? 'Drawdown massimo superato.' : undefined}
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function Misura({
  etichetta,
  valore,
  quota,
  colore,
  avviso,
}: {
  etichetta: string
  valore: string
  /** Da 0 a 1 e oltre */
  quota: number
  /** Classe di sfondo della barra, da un token */
  colore: string
  avviso?: string
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] uppercase tracking-wide text-testo-soft">{etichetta}</span>
        <span className="num text-xs text-testo">{valore}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bordo">
        <div
          className={`h-full rounded-full ${colore}`}
          style={{ width: `${Math.min(100, Math.max(0, quota) * 100)}%` }}
        />
      </div>
      {avviso && (
        <p role="alert" className="mt-1 text-[11px] text-negativo">
          {avviso}
        </p>
      )}
    </div>
  )
}
