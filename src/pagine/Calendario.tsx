import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  consumoRischio,
  intensita,
  metricheTrade,
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
import type { Account, TradeCompleto } from '../lib/tipi'
import BarraRischio from '../componenti/BarraRischio'
import SelettoreAccount, {
  accountSelezionati,
  type SelezioneAccount,
} from '../componenti/SelettoreAccount'

// Componenti RGB della palette, per costruire gli sfondi a intensità variabile.
const VERDE_OLIVA = '125, 132, 113' // #7D8471
const MATTONE = '168, 115, 90' // #A8735A

/** Opacità massima di una casella: oltre si perde la leggibilità del testo. */
const OPACITA_MAX = 0.5

function sfondoGiorno(pnl: number | null, massimo: number): string | undefined {
  if (pnl == null || pnl === 0) return undefined
  const alpha = intensita(pnl, massimo) * OPACITA_MAX
  return `rgba(${pnl > 0 ? VERDE_OLIVA : MATTONE}, ${alpha})`
}

function Metrica({ etichetta, valore, classe = '' }: { etichetta: string; valore: string; classe?: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-testo-soft">{etichetta}</dt>
      <dd className={`num text-sm ${classe || 'text-testo'}`}>{valore}</dd>
    </div>
  )
}

function classeSegno(n: number | null): string {
  if (n == null || n === 0) return 'text-testo'
  return n > 0 ? 'text-positivo' : 'text-negativo'
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

  const selezionati = useMemo(
    () => accountSelezionati(account, selezione),
    [account, selezione],
  )

  const griglia = useMemo(() => grigliaMese(anno, mese), [anno, mese])

  const perGiorno = useMemo(() => raggruppaPerGiorno(trades), [trades])

  /** P&L per ogni casella della griglia, con il massimo per la scala colore. */
  const { pnlPerGiorno, massimoAssoluto } = useMemo(() => {
    const mappa = new Map<string, { pnl: number | null; numero: number; percent: number | null }>()
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

  const consumo = useMemo(
    () =>
      consumoRischio(
        trades,
        selezionati,
        oggi,
        limiti.limite_giornaliero_percent,
        limiti.limite_settimanale_percent,
      ),
    [trades, selezionati, oggi, limiti],
  )

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

  return (
    <div className="space-y-4">
      {/* --- Riepilogo del mese ------------------------------------------- */}
      <div className="rounded-card border border-bordo bg-superficie p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                const [y, m] = spostaMese(anno, mese, -1)
                setAnno(y)
                setMese(m)
                setGiornoAperto(null)
              }}
              aria-label="Mese precedente"
              className="rounded-md border border-bordo px-2 py-1 text-testo-soft transition-colors hover:text-testo"
            >
              ‹
            </button>
            <span className="min-w-40 px-2 text-center text-sm font-medium">
              {etichettaMese(anno, mese)}
            </span>
            <button
              onClick={() => {
                const [y, m] = spostaMese(anno, mese, 1)
                setAnno(y)
                setMese(m)
                setGiornoAperto(null)
              }}
              aria-label="Mese successivo"
              className="rounded-md border border-bordo px-2 py-1 text-testo-soft transition-colors hover:text-testo"
            >
              ›
            </button>
          </div>

          <SelettoreAccount account={account} selezione={selezione} onChange={setSelezione} />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metrica
            etichetta="P&L mese"
            valore={riepilogoMese.numeroChiusi > 0 ? formattaUsd(riepilogoMese.pnlUsd, true) : VUOTO}
            classe={classeSegno(riepilogoMese.numeroChiusi > 0 ? riepilogoMese.pnlUsd : null)}
          />
          <Metrica
            etichetta="P&L %"
            valore={
              riepilogoMese.numeroChiusi > 0
                ? formattaPercent(riepilogoMese.pnlPercent, 2, true)
                : VUOTO
            }
            classe={classeSegno(riepilogoMese.numeroChiusi > 0 ? riepilogoMese.pnlUsd : null)}
          />
          <Metrica etichetta="Trade" valore={String(riepilogoMese.numeroTrade)} />
          <Metrica
            etichetta="Win rate"
            valore={
              riepilogoMese.winRate == null ? VUOTO : formattaPercent(riepilogoMese.winRate, 0)
            }
          />
        </dl>
      </div>

      {/* --- Consumo dei limiti ------------------------------------------- */}
      <BarraRischio consumo={consumo} />

      {/* --- Griglia mensile ---------------------------------------------- */}
      <div className="rounded-card border border-bordo bg-superficie p-2 sm:p-4">
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {NOMI_GIORNI.map((g) => (
            <div key={g} className="pb-1 text-center text-[11px] uppercase tracking-wide text-testo-soft">
              {g}
            </div>
          ))}

          {griglia.map((casella) => {
            const dati = pnlPerGiorno.get(casella.iso)
            const eOggi = casella.iso === oggi
            const aperto = giornoAperto === casella.iso

            return (
              <button
                key={casella.iso}
                onClick={() => apriGiorno(casella.iso)}
                style={{ backgroundColor: sfondoGiorno(dati?.pnl ?? null, massimoAssoluto) }}
                className={`min-h-16 rounded-md border p-1.5 text-left transition-colors sm:min-h-20 sm:p-2 ${
                  aperto ? 'border-accento' : eOggi ? 'border-testo-soft' : 'border-bordo'
                } ${casella.nelMese ? '' : 'opacity-40'} hover:border-accento`}
              >
                <span
                  className={`num text-xs ${eOggi ? 'font-medium text-testo' : 'text-testo-soft'}`}
                >
                  {casella.giorno}
                </span>

                {dati && (
                  <span className="mt-0.5 block leading-tight">
                    <span
                      className={`num block text-xs sm:text-sm ${classeSegno(dati.pnl)}`}
                    >
                      {formattaUsdCompatto(dati.pnl)}
                    </span>
                    <span className={`num hidden text-[11px] sm:block ${classeSegno(dati.pnl)}`}>
                      {formattaPercent(dati.percent, 2, true)}
                    </span>
                    <span className="num block text-[10px] text-testo-soft">
                      {dati.numero} {dati.numero === 1 ? 'trade' : 'trade'}
                    </span>
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* --- Pannello del giorno ------------------------------------------ */}
      {giornoAperto && <PannelloGiorno
        iso={giornoAperto}
        trades={perGiorno.get(giornoAperto) ?? []}
        account={selezionati}
        onChiudi={() => setGiornoAperto(null)}
      />}
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
