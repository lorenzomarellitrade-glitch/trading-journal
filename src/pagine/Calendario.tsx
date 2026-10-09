import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  consumoRischio,
  giornateVinteEPerse,
  intensita,
  metricheTrade,
  perditaPeggiorePercent,
  raggruppaPerGiorno,
  riepiloga,
} from '../lib/aggregazioni'
import { contaConferme, CONFERME_TOTALI } from '../lib/calcoli'
import { caricaAccount, caricaImpostazioni, caricaTrades, IMPOSTAZIONI_DEFAULT } from '../lib/dati'
import {
  etichettaMese,
  grigliaMese,
  NOMI_GIORNI,
  primoDelMese,
  spostaMese,
  ultimoDelMese,
  type GiornoGriglia,
} from '../lib/date'
import {
  formattaData,
  formattaPercent,
  formattaR,
  formattaUsd,
  formattaUsdCompatto,
  oggiIso,
  oraBreve,
  VUOTO,
} from '../lib/formato'
import { velato } from '../lib/colori'
import { statoConti } from '../lib/obiettivi'
import type { Account, TradeCompleto } from '../lib/tipi'
import BarraRischio from '../componenti/BarraRischio'
import StatoConti from '../componenti/StatoConti'
import SelettoreAccount, {
  accountSelezionati,
  type SelezioneAccount,
} from '../componenti/SelettoreAccount'

/**
 * Opacità massima della tinta di una casella. Il testo della casella ha lo
 * stesso colore della tinta: a 0,20 l'importo, il giorno e il numero di trade
 * restano almeno a 4.5:1 in tutti e tre i temi; oltre scendono sotto la soglia.
 */
const OPACITA_MAX = 0.2

function sfondoGiorno(pnl: number | null, massimo: number): string | undefined {
  if (pnl == null || pnl === 0) return undefined
  return velato(pnl > 0 ? 'positivo' : 'negativo', intensita(pnl, massimo) * OPACITA_MAX)
}

function classeSegno(n: number | null): string {
  if (n == null || n === 0) return 'text-testo'
  return n > 0 ? 'text-positivo' : 'text-negativo'
}

function Voce({
  etichetta,
  valore,
  classe,
}: {
  etichetta: string
  valore: string
  classe?: string
}) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-testo-soft">{etichetta}</dt>
      <dd className={`num text-sm ${classe ?? 'text-testo'}`}>{valore}</dd>
    </div>
  )
}

/** Dati precalcolati di una casella giorno. */
interface DatiGiorno {
  pnl: number | null
  percent: number | null
  numero: number
}

export default function Calendario() {
  const navigate = useNavigate()
  const oggi = oggiIso()

  const [trades, setTrades] = useState<TradeCompleto[]>([])
  const [account, setAccount] = useState<Account[]>([])
  const [limiti, setLimiti] = useState(IMPOSTAZIONI_DEFAULT)
  const [selezione, setSelezione] = useState<SelezioneAccount>(null)
  const [giornoAperto, setGiornoAperto] = useState<string | null>(null)

  const [anno, setAnno] = useState(() => new Date().getFullYear())
  const [mese, setMese] = useState(() => new Date().getMonth())

  const [caricamento, setCaricamento] = useState(true)
  const [errore, setErrore] = useState<string | null>(null)

  useEffect(() => {
    let annullato = false

    async function carica() {
      try {
        // Si caricano tutti i trade una volta sola: un journal personale sta
        // nell'ordine delle centinaia di righe, e averli in memoria rende
        // istantanei i cambi di mese e di account.
        const [t, a, imp] = await Promise.all([
          caricaTrades(),
          caricaAccount(),
          caricaImpostazioni(),
        ])
        if (annullato) return
        setTrades(t)
        setAccount(a)
        setLimiti(imp)
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
  /** I limiti di perdita riguardano solo i conti su cui si opera adesso. */
  const attivi = useMemo(() => selezionati.filter((a) => a.attivo), [selezionati])

  const griglia = useMemo(() => grigliaMese(anno, mese), [anno, mese])
  const perGiorno = useMemo(() => raggruppaPerGiorno(trades), [trades])

  /** Le caselle divise in settimane, da lunedì a domenica. */
  const settimane = useMemo(() => {
    const righe: GiornoGriglia[][] = []
    for (let i = 0; i < griglia.length; i += 7) righe.push(griglia.slice(i, i + 7))
    return righe
  }, [griglia])

  const { pnlPerGiorno, massimoAssoluto } = useMemo(() => {
    const mappa = new Map<string, DatiGiorno>()
    let massimo = 0

    for (const casella of griglia) {
      const delGiorno = perGiorno.get(casella.iso)
      if (!delGiorno || delGiorno.length === 0) continue

      const r = riepiloga(delGiorno, selezionati)
      const pnl = r.numeroChiusi > 0 ? r.pnlUsd : null
      mappa.set(casella.iso, { pnl, numero: delGiorno.length, percent: r.pnlPercent })
      if (pnl != null) massimo = Math.max(massimo, Math.abs(pnl))
    }

    return { pnlPerGiorno: mappa, massimoAssoluto: massimo }
  }, [griglia, perGiorno, selezionati])

  const tradesDelMese = useMemo(() => {
    const da = primoDelMese(anno, mese)
    const a = ultimoDelMese(anno, mese)
    return trades.filter((t) => t.data >= da && t.data <= a)
  }, [trades, anno, mese])

  const riepilogoMese = useMemo(
    () => riepiloga(tradesDelMese, selezionati),
    [tradesDelMese, selezionati],
  )
  const giornate = useMemo(
    () => giornateVinteEPerse(tradesDelMese, selezionati),
    [tradesDelMese, selezionati],
  )

  /**
   * Lo stato dei conti ignora sia il selettore sia il mese: parla dei conti,
   * non del periodo. Servono a vedere in un colpo d'occhio che nessuno dei due
   * conti sia vicino a un limite, anche mentre se ne guarda un altro.
   */
  const tuttiAttivi = useMemo(() => account.filter((a) => a.attivo), [account])
  const stati = useMemo(
    () => statoConti(trades, tuttiAttivi, oggi),
    [trades, tuttiAttivi, oggi],
  )

  const consumo = useMemo(
    () =>
      consumoRischio(
        trades,
        attivi,
        oggi,
        limiti.limite_giornaliero_percent,
        limiti.limite_settimanale_percent,
      ),
    [trades, attivi, oggi, limiti],
  )

  function vaiA(nuovoAnno: number, nuovoMese: number) {
    setAnno(nuovoAnno)
    setMese(nuovoMese)
    setGiornoAperto(null)
  }

  function apriGiorno(iso: string) {
    const delGiorno = perGiorno.get(iso)
    // Giorno vuoto: si va dritti al form, senza un pannello inutile di mezzo.
    if (!delGiorno || delGiorno.length === 0) {
      navigate(`/trade/nuovo?data=${iso}`)
      return
    }
    setGiornoAperto((prec) => (prec === iso ? null : iso))
  }

  if (caricamento) return <p className="text-sm text-testo-soft">Caricamento…</p>

  if (errore) {
    return (
      <p className="rounded-md border border-negativo/40 bg-negativo/10 px-3 py-2 text-sm text-negativo">
        {errore}
      </p>
    )
  }

  const sulMeseCorrente =
    anno === new Date().getFullYear() && mese === new Date().getMonth()

  return (
    <div className="space-y-4">
      {/* --- Barra superiore ---------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => vaiA(...spostaMese(anno, mese, -1))}
            aria-label="Mese precedente"
            className="rounded-md border border-bordo px-2 py-1 text-testo-soft transition-colors hover:text-testo"
          >
            ‹
          </button>
          <span className="min-w-40 px-2 text-center text-sm font-medium">
            {etichettaMese(anno, mese)}
          </span>
          <button
            onClick={() => vaiA(...spostaMese(anno, mese, 1))}
            aria-label="Mese successivo"
            className="rounded-md border border-bordo px-2 py-1 text-testo-soft transition-colors hover:text-testo"
          >
            ›
          </button>
          {!sulMeseCorrente && (
            <button
              onClick={() => vaiA(new Date().getFullYear(), new Date().getMonth())}
              className="ml-1 rounded-md border border-accento px-2.5 py-1 text-xs text-accento"
            >
              Oggi
            </button>
          )}
        </div>

        <SelettoreAccount account={account} selezione={selezione} onChange={setSelezione} />
      </div>

      {/* --- Stato dei conti, prima di tutto il resto --------------------- */}
      <StatoConti stati={stati} />

      <div className="grid gap-4 lg:grid-cols-[1fr_17rem]">
        {/* --- Riepilogo del mese ----------------------------------------- */}
        <aside className="space-y-4 lg:order-2">
          <div className="rounded-card border border-bordo bg-superficie p-4">
            <dl className="grid grid-cols-2 gap-4 lg:grid-cols-1">
              <Voce
                etichetta="P&L mese"
                valore={
                  riepilogoMese.numeroChiusi > 0
                    ? formattaUsd(riepilogoMese.pnlUsd, true)
                    : VUOTO
                }
                classe={`text-base ${classeSegno(
                  riepilogoMese.numeroChiusi > 0 ? riepilogoMese.pnlUsd : null,
                )}`}
              />
              <Voce
                etichetta="P&L %"
                valore={
                  riepilogoMese.numeroChiusi > 0
                    ? formattaPercent(riepilogoMese.pnlPercent, 2, true)
                    : VUOTO
                }
                classe={classeSegno(
                  riepilogoMese.numeroChiusi > 0 ? riepilogoMese.pnlUsd : null,
                )}
              />
              <Voce etichetta="Trade" valore={String(riepilogoMese.numeroTrade)} />
              <Voce
                etichetta="Win rate"
                valore={
                  riepilogoMese.winRate == null
                    ? VUOTO
                    : formattaPercent(riepilogoMese.winRate, 0)
                }
              />
              <div className="col-span-2 lg:col-span-1">
                <dt className="text-[11px] uppercase tracking-wide text-testo-soft">Giornate</dt>
                <dd className="num text-sm">
                  <span className="text-positivo">{giornate.vinte}</span>
                  <span className="text-testo-soft"> in utile · </span>
                  <span className="text-negativo">{giornate.perse}</span>
                  <span className="text-testo-soft"> in perdita</span>
                  {giornate.pari > 0 && (
                    <span className="text-testo-soft"> · {giornate.pari} in pari</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <BarraRischio consumo={consumo} />
        </aside>

        {/* --- Griglia mensile -------------------------------------------- */}
        <div className="rounded-card border border-bordo bg-superficie p-2 sm:p-4 lg:order-1">
          <div className="grid grid-cols-[repeat(7,1fr)_3.5rem] gap-1 sm:gap-2">
            {NOMI_GIORNI.map((g) => (
              <div
                key={g}
                className="pb-1 text-center text-[11px] uppercase tracking-wide text-testo-soft"
              >
                {g}
              </div>
            ))}
            <div className="pb-1 text-center text-[11px] uppercase tracking-wide text-testo-soft">
              Sett.
            </div>

            {settimane.map((settimana) => (
              <SettimanaRiga
                key={settimana[0].iso}
                settimana={settimana}
                datiPerGiorno={pnlPerGiorno}
                massimoAssoluto={massimoAssoluto}
                oggi={oggi}
                giornoAperto={giornoAperto}
                onApri={apriGiorno}
                trades={trades}
                selezionati={selezionati}
                attivi={attivi}
                limiteSettimanale={limiti.limite_settimanale_percent}
              />
            ))}
          </div>

          <Legenda />
        </div>
      </div>

      {/* --- Pannello del giorno ------------------------------------------ */}
      {giornoAperto && (
        <PannelloGiorno
          iso={giornoAperto}
          trades={perGiorno.get(giornoAperto) ?? []}
          account={selezionati}
          onChiudi={() => setGiornoAperto(null)}
        />
      )}
    </div>
  )
}

/** Una riga di sette giorni più il totale settimanale. */
function SettimanaRiga({
  settimana,
  datiPerGiorno,
  massimoAssoluto,
  oggi,
  giornoAperto,
  onApri,
  trades,
  selezionati,
  attivi,
  limiteSettimanale,
}: {
  settimana: GiornoGriglia[]
  datiPerGiorno: Map<string, DatiGiorno>
  massimoAssoluto: number
  oggi: string
  giornoAperto: string | null
  onApri: (iso: string) => void
  trades: TradeCompleto[]
  selezionati: Account[]
  attivi: Account[]
  limiteSettimanale: number
}) {
  const da = settimana[0].iso
  const a = settimana[settimana.length - 1].iso

  const dellaSettimana = trades.filter((t) => t.data >= da && t.data <= a)
  const r = riepiloga(dellaSettimana, selezionati)
  const chiusa = r.numeroChiusi > 0

  // Quanto del limite settimanale è stato consumato dal conto messo peggio.
  const perdita = perditaPeggiorePercent(trades, attivi, da, a)
  const quota = limiteSettimanale > 0 ? perdita / limiteSettimanale : 0

  return (
    <>
      {settimana.map((casella) => {
        const dati = datiPerGiorno.get(casella.iso)
        const eOggi = casella.iso === oggi
        const aperto = giornoAperto === casella.iso

        return (
          <button
            key={casella.iso}
            onClick={() => onApri(casella.iso)}
            style={{ backgroundColor: sfondoGiorno(dati?.pnl ?? null, massimoAssoluto) }}
            className={`min-h-16 rounded-md border p-1.5 text-left transition-colors sm:min-h-20 sm:p-2 ${
              aperto ? 'border-accento' : eOggi ? 'border-testo-soft' : 'border-bordo'
            } ${casella.nelMese ? '' : 'opacity-40'} hover:border-accento`}
          >
            <span className={`num text-xs ${eOggi ? 'font-medium text-testo' : 'text-testo-soft'}`}>
              {casella.giorno}
            </span>

            {dati && (
              <span className="mt-0.5 block leading-tight">
                <span className={`num block text-xs sm:text-sm ${classeSegno(dati.pnl)}`}>
                  {formattaUsdCompatto(dati.pnl)}
                </span>
                <span className={`num hidden text-[11px] sm:block ${classeSegno(dati.pnl)}`}>
                  {formattaPercent(dati.percent, 2, true)}
                </span>
                <span className="num block text-[10px] text-testo-soft">
                  {dati.numero} trade
                </span>
              </span>
            )}
          </button>
        )
      })}

      {/* Totale della settimana e consumo del limite */}
      <div className="flex min-h-16 flex-col justify-center rounded-md bg-sfondo px-1 py-1.5 text-center sm:min-h-20">
        {chiusa ? (
          <>
            <span className={`num block text-[11px] sm:text-xs ${classeSegno(r.pnlUsd)}`}>
              {formattaUsdCompatto(r.pnlUsd)}
            </span>
            <span className={`num block text-[10px] ${classeSegno(r.pnlUsd)}`}>
              {formattaPercent(r.pnlPercent, 1, true)}
            </span>
            {perdita > 0 && (
              <span
                className={`num mt-0.5 block text-[10px] ${
                  quota >= 1 ? 'font-medium text-negativo' : quota >= 0.8 ? 'text-accento' : 'text-testo-soft'
                }`}
                title={`Consumo del limite settimanale del ${limiteSettimanale}%`}
              >
                {Math.round(quota * 100)}% lim.
              </span>
            )}
          </>
        ) : (
          <span className="text-[11px] text-testo-soft">—</span>
        )}
      </div>
    </>
  )
}

function Legenda() {
  const voci = [
    { colore: velato('positivo', OPACITA_MAX), testo: 'Giornata in utile' },
    { colore: velato('negativo', OPACITA_MAX), testo: 'Giornata in perdita' },
    { colore: 'transparent', testo: 'Nessun trade' },
  ]

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-bordo pt-3 text-[11px] text-testo-soft">
      {voci.map((v) => (
        <span key={v.testo} className="flex items-center gap-1.5">
          <span
            className="h-3 w-3 rounded border border-bordo"
            style={{ backgroundColor: v.colore }}
            aria-hidden="true"
          />
          {v.testo}
        </span>
      ))}
      <span className="text-testo-soft/70">
        L'intensità del colore è proporzionale al giorno più mosso del mese.
      </span>
    </div>
  )
}

function PannelloGiorno({
  iso,
  trades,
  account,
  onChiudi,
}: {
  iso: string
  trades: TradeCompleto[]
  account: Account[]
  onChiudi: () => void
}) {
  return (
    <div className="rounded-card border border-accento bg-superficie p-4">
      <header className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">{formattaData(iso)}</h2>
        <div className="flex items-center gap-2">
          <Link
            to={`/trade/nuovo?data=${iso}`}
            className="rounded-md bg-accento px-3 py-1.5 text-xs font-medium text-superficie transition-opacity hover:opacity-90"
          >
            Nuovo trade
          </Link>
          <button
            onClick={onChiudi}
            aria-label="Chiudi"
            className="rounded-md border border-bordo px-2 py-1.5 text-xs text-testo-soft transition-colors hover:text-testo"
          >
            ✕
          </button>
        </div>
      </header>

      <ul className="divide-y divide-bordo">
        {trades.map((t) => {
          const m = metricheTrade(t, account)
          const conferme = contaConferme(t)

          return (
            <li key={t.id}>
              <Link
                to={`/trade/${t.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 transition-colors hover:text-accento"
              >
                <span className="num w-12 text-xs text-testo-soft">
                  {oraBreve(t.ora_entrata) || VUOTO}
                </span>
                <span className="w-12 text-xs uppercase tracking-wide text-testo-soft">
                  {t.direzione}
                </span>
                <span
                  className={`num w-10 text-xs ${
                    conferme === CONFERME_TOTALI ? 'text-positivo' : 'text-testo-soft'
                  }`}
                >
                  {conferme}/{CONFERME_TOTALI}
                </span>
                <span className={`num w-24 text-sm ${classeSegno(m.pnlUsd)}`}>
                  {m.pnlUsd == null ? VUOTO : formattaUsd(m.pnlUsd, true)}
                </span>
                <span className={`num w-16 text-sm ${classeSegno(m.rMedio)}`}>
                  {formattaR(m.rMedio)}
                </span>
                <span className="text-xs text-testo-soft">{t.finestra ?? ''}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
