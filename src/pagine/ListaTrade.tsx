import { useEffect, useMemo, useState } from 'react'
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
import { ESITI, FINESTRE, FLAG_COMPORTAMENTALI, type Account, type TradeCompleto } from '../lib/tipi'
import { Campo, GruppoOpzioni, Input } from '../componenti/campi'
import SelettoreAccount, {
  accountSelezionati,
  type SelezioneAccount,
} from '../componenti/SelettoreAccount'

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

export default function ListaTrade() {
  const [trades, setTrades] = useState<TradeCompleto[]>([])
  const [account, setAccount] = useState<Account[]>([])
  const [selezione, setSelezione] = useState<SelezioneAccount>(null)
  const [filtri, setFiltri] = useState<Filtri>(FILTRI_VUOTI)
  const [colonna, setColonna] = useState<Colonna>('data')
  const [verso, setVerso] = useState<Verso>('desc')

  const [caricamento, setCaricamento] = useState(true)
  const [errore, setErrore] = useState<string | null>(null)

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

  const riepilogoFiltrato = useMemo(
    () => riepiloga(visibili, selezionati),
    [visibili, selezionati],
  )

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
    filtri.soloProcessoCompleto

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
      <div className="rounded-card border border-bordo bg-superficie p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SelettoreAccount account={account} selezione={selezione} onChange={setSelezione} />

          <div className="flex items-center gap-2">
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
            className="h-4 w-4 accent-[#B08968]"
          />
          Solo trade con {CONFERME_TOTALI}/{CONFERME_TOTALI} conferme
        </label>
      </div>

      {/* --- Riepilogo di ciò che è filtrato -------------------------------- */}
      <div className="flex flex-wrap gap-x-8 gap-y-2 rounded-card border border-bordo bg-superficie px-4 py-3 text-sm">
        <span className="text-testo-soft">
          {visibili.length} {visibili.length === 1 ? 'trade' : 'trade'}
          {filtriAttivi && ` su ${trades.length}`}
        </span>
        <span className={`num ${classeSegno(riepilogoFiltrato.pnlUsd)}`}>
          {riepilogoFiltrato.numeroChiusi > 0
            ? formattaUsd(riepilogoFiltrato.pnlUsd, true)
            : VUOTO}
        </span>
        <span className="num text-testo-soft">
          Win rate{' '}
          {riepilogoFiltrato.winRate == null
            ? VUOTO
            : formattaPercent(riepilogoFiltrato.winRate, 0)}
        </span>
        <span className="num text-testo-soft">
          R medio {formattaR(riepilogoFiltrato.rMedio)}
        </span>
      </div>

      {/* --- Tabella -------------------------------------------------------- */}
      <div className="overflow-x-auto rounded-card border border-bordo bg-superficie">
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
              <th scope="col" className="px-3 py-2 text-left text-[11px] uppercase tracking-wide font-normal text-testo-soft">
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
                    {/* Il link avvolge solo la prima cella ma copre la riga:
                        una riga <tr> non può essere un elemento cliccabile valido. */}
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

        {visibili.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-testo-soft">
            {trades.length === 0
              ? 'Nessun trade registrato.'
              : 'Nessun trade corrisponde ai filtri.'}
          </p>
        )}
      </div>
    </div>
  )
}
