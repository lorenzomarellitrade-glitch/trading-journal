import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { metricheTrade, riepiloga } from '../lib/aggregazioni'
import { CONFERME_TOTALI, contaConferme } from '../lib/calcoli'
import { scaricaCsv, tradesInCsv } from '../lib/csv'
import { caricaAccount, caricaTrades } from '../lib/dati'
import {
  FILTRI_VUOTI,
  filtraTrades,
  ordinaTrades,
  type Colonna,
  type Filtri,
  type Verso,
} from '../lib/filtri'
import {
  formattaData,
  formattaPercent,
  formattaR,
  formattaUsd,
  oggiIso,
  VUOTO,
} from '../lib/formato'
import { verificheProcesso } from '../lib/processo'
import { immagineSnapshot, linkAnteprima } from '../lib/tradingview'
import { ESITI, FINESTRE, FLAG_COMPORTAMENTALI, type Account, type TradeCompleto } from '../lib/tipi'
import { Campo, GruppoOpzioni, Input } from '../componenti/campi'
import SelettoreAccount, {
  accountSelezionati,
  type SelezioneAccount,
} from '../componenti/SelettoreAccount'
import VerificheProcesso from '../componenti/VerificheProcesso'

const COLONNE: { chiave: Colonna; etichetta: string; allineaDestra?: boolean }[] = [
  { chiave: 'data', etichetta: 'Data' },
  { chiave: 'direzione', etichetta: 'Dir.' },
  { chiave: 'finestra', etichetta: 'Finestra' },
  { chiave: 'conferme', etichetta: 'Conf.', allineaDestra: true },
  { chiave: 'esito', etichetta: 'Esito' },
  { chiave: 'r', etichetta: 'R', allineaDestra: true },
  { chiave: 'pnl', etichetta: 'P&L', allineaDestra: true },
  { chiave: 'pnlPercent', etichetta: 'P&L %', allineaDestra: true },
]

type Vista = 'griglia' | 'tabella'

function classeSegno(n: number | null): string {
  if (n == null || n === 0) return 'text-testo'
  return n > 0 ? 'text-positivo' : 'text-negativo'
}

/** Sigle dei flag comportamentali attivi, con il nome esteso nel tooltip. */
function Flag({ trade }: { trade: TradeCompleto }) {
  const attivi = FLAG_COMPORTAMENTALI.filter((f) => trade[f.campo])
  if (attivi.length === 0) return <span className="text-testo-soft">—</span>

  return (
    <span className="flex flex-wrap gap-1">
      {attivi.map((f) => (
        <span
          key={f.campo}
          title={f.etichetta}
          className="rounded border border-bordo px-1 py-0.5 text-[10px] tracking-wide text-testo-soft"
        >
          {f.sigla}
        </span>
      ))}
    </span>
  )
}

/** Scheda di un trade nella griglia: il grafico fa da copertina. */
function SchedaTrade({ trade, account }: { trade: TradeCompleto; account: Account[] }) {
  const m = metricheTrade(trade, account)
  const conferme = contaConferme(trade)
  const anteprima = immagineSnapshot(linkAnteprima(trade))
  const [immagineRotta, setImmagineRotta] = useState(false)

  return (
    <Link
      to={`/trade/${trade.id}`}
      className="riquadro group overflow-hidden transition-colors hover:border-accento"
    >
      <div className="flex aspect-video items-center justify-center bg-sfondo">
        {anteprima && !immagineRotta ? (
          <img
            src={anteprima}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImmagineRotta(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-xs text-testo-soft">Nessun grafico</span>
        )}
      </div>

      <div className="space-y-1 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs uppercase tracking-wide text-testo-soft">
            {trade.direzione}
            {m.esito && <span className="ml-2 text-testo">{m.esito}</span>}
          </span>
          <span className={`num text-sm ${classeSegno(m.pnlUsd)}`}>
            {m.pnlUsd == null ? VUOTO : formattaUsd(m.pnlUsd, true)}
          </span>
        </div>

        <div className="flex items-baseline justify-between gap-2 text-[11px] text-testo-soft">
          <span className="num">{formattaData(trade.data)}</span>
          <span className="num flex items-center gap-2">
            <span className={conferme === CONFERME_TOTALI ? 'text-positivo' : ''}>
              {conferme}/{CONFERME_TOTALI}
            </span>
            <span className={classeSegno(m.rMedio)}>{formattaR(m.rMedio)}</span>
          </span>
        </div>

        {/* Le cinque verifiche del processo: si vedono scorrendo la griglia. */}
        <div className="pt-1">
          <VerificheProcesso verifiche={verificheProcesso(trade)} compatta />
        </div>
      </div>
    </Link>
  )
}

export default function ListaTrade() {
  const [trades, setTrades] = useState<TradeCompleto[]>([])
  const [account, setAccount] = useState<Account[]>([])
  const [selezione, setSelezione] = useState<SelezioneAccount>(null)
  const [filtri, setFiltri] = useState<Filtri>(FILTRI_VUOTI)
  const [colonna, setColonna] = useState<Colonna>('data')
  const [verso, setVerso] = useState<Verso>('desc')
  const [vista, setVista] = useState<Vista>('griglia')

  const [caricamento, setCaricamento] = useState(true)
  const [errore, setErrore] = useState<string | null>(null)
  const ricerca = useRef<HTMLInputElement>(null)

  /** Il tasto / porta alla ricerca, se non si sta già scrivendo altrove. */
  useEffect(() => {
    function suTasto(e: KeyboardEvent) {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return
      e.preventDefault()
      ricerca.current?.focus()
    }
    window.addEventListener('keydown', suTasto)
    return () => window.removeEventListener('keydown', suTasto)
  }, [])

  useEffect(() => {
    let annullato = false

    async function carica() {
      try {
        const [t, a] = await Promise.all([caricaTrades(), caricaAccount()])
        if (annullato) return
        setTrades(t)
        setAccount(a)
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

  const visibili = useMemo(
    () => ordinaTrades(filtraTrades(trades, selezionati, filtri), selezionati, colonna, verso),
    [trades, selezionati, filtri, colonna, verso],
  )

  const riepilogoFiltrato = useMemo(() => riepiloga(visibili, selezionati), [visibili, selezionati])

  /** Riclicca la stessa colonna per invertire il verso. */
  function ordina(c: Colonna) {
    if (c === colonna) setVerso((v) => (v === 'asc' ? 'desc' : 'asc'))
    else {
      setColonna(c)
      setVerso(c === 'data' ? 'desc' : 'asc')
    }
  }

  function esporta() {
    scaricaCsv(tradesInCsv(visibili, selezionati), `trade-${oggiIso()}.csv`)
  }

  const filtriAttivi =
    filtri.da != null ||
    filtri.a != null ||
    filtri.esito != null ||
    filtri.finestra != null ||
    filtri.soloProcessoCompleto ||
    (filtri.testo != null && filtri.testo.trim() !== '')

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
      {/* --- Filtri -------------------------------------------------------- */}
      <div className="riquadro p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SelettoreAccount account={account} selezione={selezione} onChange={setSelezione} />

          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {(['griglia', 'tabella'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setVista(v)}
                  aria-pressed={vista === v}
                  className={`rounded-md border px-2.5 py-1.5 text-xs capitalize transition-colors ${
                    vista === v
                      ? 'border-accento bg-accento/15 text-accento'
                      : 'border-bordo text-testo-soft hover:text-testo'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            {filtriAttivi && (
              <button
                onClick={() => setFiltri(FILTRI_VUOTI)}
                className="rounded-md border border-bordo px-3 py-1.5 text-xs text-testo-soft transition-colors hover:text-testo"
              >
                Azzera filtri
              </button>
            )}
            <button
              onClick={esporta}
              disabled={visibili.length === 0}
              className="rounded-md border border-bordo px-3 py-1.5 text-xs text-testo-soft transition-colors hover:text-testo disabled:opacity-40"
            >
              Esporta CSV
            </button>
          </div>
        </div>

        <div className="mt-3">
          <Input
            ref={ricerca}
            type="search"
            value={filtri.testo ?? ''}
            onChange={(e) => setFiltri({ ...filtri, testo: e.target.value || null })}
            placeholder="Cerca nelle note, nell'emozione, nella direzione o nella data…   ( / )"
          />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo etichetta="Dal">
            <Input
              type="date"
              value={filtri.da ?? ''}
              onChange={(e) => setFiltri({ ...filtri, da: e.target.value || null })}
            />
          </Campo>
          <Campo etichetta="Al">
            <Input
              type="date"
              value={filtri.a ?? ''}
              onChange={(e) => setFiltri({ ...filtri, a: e.target.value || null })}
            />
          </Campo>
          <Campo etichetta="Esito">
            <GruppoOpzioni
              opzioni={ESITI}
              valore={filtri.esito}
              onChange={(v) => setFiltri({ ...filtri, esito: v })}
            />
          </Campo>
          <Campo etichetta="Finestra">
            <GruppoOpzioni
              opzioni={FINESTRE}
              valore={filtri.finestra}
              onChange={(v) => setFiltri({ ...filtri, finestra: v })}
            />
          </Campo>
        </div>

        <label className="mt-3 flex w-fit cursor-pointer items-center gap-2 text-sm text-testo-soft">
          <input
            type="checkbox"
            checked={filtri.soloProcessoCompleto}
            onChange={(e) => setFiltri({ ...filtri, soloProcessoCompleto: e.target.checked })}
            className="h-4 w-4 accent-accento"
          />
          Solo trade con {CONFERME_TOTALI}/{CONFERME_TOTALI} conferme
        </label>
      </div>

      {/* --- Riepilogo di ciò che è filtrato -------------------------------- */}
      <div className="riquadro flex flex-wrap gap-x-8 gap-y-2 px-4 py-3 text-sm">
        <span className="text-testo-soft">
          {visibili.length} trade
          {filtriAttivi && ` su ${trades.length}`}
        </span>
        <span className={`num ${classeSegno(riepilogoFiltrato.pnlUsd)}`}>
          {riepilogoFiltrato.numeroChiusi > 0 ? formattaUsd(riepilogoFiltrato.pnlUsd, true) : VUOTO}
        </span>
        <span className="num text-testo-soft">
          Win rate{' '}
          {riepilogoFiltrato.winRate == null
            ? VUOTO
            : formattaPercent(riepilogoFiltrato.winRate, 0)}
        </span>
        <span className="num text-testo-soft">R medio {formattaR(riepilogoFiltrato.rMedio)}</span>
      </div>

      {/* --- Trade ---------------------------------------------------------- */}
      {visibili.length === 0 ? (
        <p className="rounded-card border border-bordo bg-superficie px-4 py-8 text-center text-sm text-testo-soft">
          {trades.length === 0
            ? 'Nessun trade registrato.'
            : 'Nessun trade corrisponde ai filtri.'}
        </p>
      ) : vista === 'griglia' ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibili.map((t) => (
            <SchedaTrade key={t.id} trade={t} account={selezionati} />
          ))}
        </div>
      ) : (
        <div className="riquadro overflow-x-auto">
          <table className="w-full min-w-3xl text-sm">
            <thead>
              <tr className="border-b border-bordo">
                {COLONNE.map((c) => (
                  <th
                    key={c.chiave}
                    scope="col"
                    className={`px-3 py-2 font-normal ${c.allineaDestra ? 'text-right' : 'text-left'}`}
                  >
                    <button
                      onClick={() => ordina(c.chiave)}
                      className={`text-[11px] uppercase tracking-wide transition-colors hover:text-testo ${
                        colonna === c.chiave ? 'text-accento' : 'text-testo-soft'
                      }`}
                    >
                      {c.etichetta}
                      {colonna === c.chiave && (verso === 'asc' ? ' ↑' : ' ↓')}
                    </button>
                  </th>
                ))}
                <th
                  scope="col"
                  className="px-3 py-2 text-left text-[11px] font-normal uppercase tracking-wide text-testo-soft"
                >
                  Flag
                </th>
              </tr>
            </thead>

            <tbody>
              {visibili.map((t) => {
                const m = metricheTrade(t, selezionati)
                const conferme = contaConferme(t)

                return (
                  <tr
                    key={t.id}
                    className="border-b border-bordo/60 transition-colors last:border-0 hover:bg-sfondo"
                  >
                    <td className="px-3 py-2">
                      {/* Il link avvolge solo la prima cella: una riga <tr> non
                          può essere un elemento cliccabile valido. */}
                      <Link to={`/trade/${t.id}`} className="num block hover:text-accento">
                        {formattaData(t.data)}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-testo-soft">{t.direzione}</td>
                    <td className="px-3 py-2 text-testo-soft">{t.finestra ?? VUOTO}</td>
                    <td
                      className={`num px-3 py-2 text-right ${
                        conferme === CONFERME_TOTALI ? 'text-positivo' : 'text-testo-soft'
                      }`}
                    >
                      {conferme}/{CONFERME_TOTALI}
                    </td>
                    <td className="px-3 py-2 text-testo-soft">{m.esito ?? VUOTO}</td>
                    <td className={`num px-3 py-2 text-right ${classeSegno(m.rMedio)}`}>
                      {formattaR(m.rMedio)}
                    </td>
                    <td className={`num px-3 py-2 text-right ${classeSegno(m.pnlUsd)}`}>
                      {m.pnlUsd == null ? VUOTO : formattaUsd(m.pnlUsd, true)}
                    </td>
                    <td className={`num px-3 py-2 text-right ${classeSegno(m.pnlPercent)}`}>
                      {formattaPercent(m.pnlPercent, 2, true)}
                    </td>
                    <td className="px-3 py-2">
                      <Flag trade={t} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
