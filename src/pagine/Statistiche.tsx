import { useEffect, useMemo, useState } from 'react'
import { riepiloga } from '../lib/aggregazioni'
import { caricaAccount, caricaTrades } from '../lib/dati'
import { primoDelMese, spostaMese } from '../lib/date'
import { formattaPercent, formattaR, formattaUsd, oggiIso, VUOTO } from '../lib/formato'
import {
  analisiProcesso,
  costoChiusuraManuale,
  curvaEquity,
  disciplinaPerMese,
  distribuzioneR,
  drawdownMassimo,
  effettoTradePrecedente,
  perGiornoSettimana,
  perMese,
  perTradeGiornalieri,
} from '../lib/statistiche'
import type { Account, TradeCompleto } from '../lib/tipi'
import AnalisiProcesso from '../componenti/AnalisiProcesso'
import { Campo, Input, Kpi } from '../componenti/campi'
import { GraficoDisciplina, GraficoDistribuzioneR, GraficoEquity } from '../componenti/Grafici'
import TabellaPeriodi from '../componenti/TabellaPeriodi'
import SelettoreAccount, {
  accountSelezionati,
  type SelezioneAccount,
} from '../componenti/SelettoreAccount'

interface Periodo {
  da: string | null
  a: string | null
}

/** Scorciatoie di periodo: coprono i tagli che si guardano davvero. */
function scorciatoie(): { etichetta: string; periodo: Periodo }[] {
  const ora = new Date()
  const anno = ora.getFullYear()
  const mese = ora.getMonth()
  const [annoTre, meseTre] = spostaMese(anno, mese, -2)

  return [
    { etichetta: 'Questo mese', periodo: { da: primoDelMese(anno, mese), a: null } },
    { etichetta: 'Ultimi 3 mesi', periodo: { da: primoDelMese(annoTre, meseTre), a: null } },
    { etichetta: "Quest'anno", periodo: { da: `${anno}-01-01`, a: null } },
    { etichetta: 'Tutto', periodo: { da: null, a: null } },
  ]
}

function classeSegno(n: number | null): string {
  if (n == null || n === 0) return 'text-testo'
  return n > 0 ? 'text-positivo' : 'text-negativo'
}

function Sezione({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-bordo bg-superficie p-4">
      <h3 className="mb-2 text-sm font-medium text-testo">{titolo}</h3>
      {children}
    </section>
  )
}

export default function Statistiche() {
  const [trades, setTrades] = useState<TradeCompleto[]>([])
  const [account, setAccount] = useState<Account[]>([])
  const [selezione, setSelezione] = useState<SelezioneAccount>(null)
  const [periodo, setPeriodo] = useState<Periodo>({ da: null, a: null })

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

  /** Il filtro di periodo e account si applica a tutto ciò che sta sotto. */
  const filtrati = useMemo(
    () =>
      trades.filter((t) => {
        if (periodo.da && t.data < periodo.da) return false
        if (periodo.a && t.data > periodo.a) return false
        const ids = new Set(selezionati.map((a) => a.id))
        return (t.executions ?? []).some((e) => ids.has(e.account_id))
      }),
    [trades, periodo, selezionati],
  )

  const generale = useMemo(() => riepiloga(filtrati, selezionati), [filtrati, selezionati])
  /**
   * Una linea dell'equity solo per i conti che hanno trade nel periodo: con
   * "Tutti" i conti di fase chiusa resterebbero piatti per mesi, a occupare
   * spazio e legenda senza dire niente.
   */
  const contiNelGrafico = useMemo(
    () =>
      selezionati.filter((a) =>
        filtrati.some((t) => (t.executions ?? []).some((e) => e.account_id === a.id)),
      ),
    [filtrati, selezionati],
  )
  const equity = useMemo(
    () => curvaEquity(filtrati, contiNelGrafico),
    [filtrati, contiNelGrafico],
  )
  const dd = useMemo(() => drawdownMassimo(filtrati, selezionati), [filtrati, selezionati])
  const istogramma = useMemo(() => distribuzioneR(filtrati, selezionati), [filtrati, selezionati])
  const confronti = useMemo(
    () => [
      ...analisiProcesso(filtrati, selezionati),
      effettoTradePrecedente(filtrati, selezionati),
      perTradeGiornalieri(filtrati, selezionati),
    ],
    [filtrati, selezionati],
  )
  const giorni = useMemo(() => perGiornoSettimana(filtrati, selezionati), [filtrati, selezionati])
  const mesi = useMemo(() => perMese(filtrati, selezionati), [filtrati, selezionati])
  const disciplina = useMemo(() => disciplinaPerMese(filtrati), [filtrati])
  const costoUscita = useMemo(
    () => costoChiusuraManuale(filtrati, selezionati),
    [filtrati, selezionati],
  )

  if (caricamento) return <p className="text-sm text-testo-soft">Caricamento…</p>

  if (errore) {
    return (
      <p className="rounded-md border border-negativo/40 bg-negativo/10 px-3 py-2 text-sm text-negativo">
        {errore}
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {/* --- Filtri, validi per tutta la pagina --------------------------- */}
      <div className="rounded-card border border-bordo bg-superficie p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SelettoreAccount account={account} selezione={selezione} onChange={setSelezione} />

          <div className="flex flex-wrap gap-1">
            {scorciatoie().map((s) => {
              const attiva = periodo.da === s.periodo.da && periodo.a === s.periodo.a
              return (
                <button
                  key={s.etichetta}
                  onClick={() => setPeriodo(s.periodo)}
                  className={`rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                    attiva
                      ? 'border-accento bg-accento/15 text-accento'
                      : 'border-bordo text-testo-soft hover:text-testo'
                  }`}
                >
                  {s.etichetta}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:max-w-md">
          <Campo etichetta="Dal">
            <Input
              type="date"
              value={periodo.da ?? ''}
              max={oggiIso()}
              onChange={(e) => setPeriodo({ ...periodo, da: e.target.value || null })}
            />
          </Campo>
          <Campo etichetta="Al">
            <Input
              type="date"
              value={periodo.a ?? ''}
              onChange={(e) => setPeriodo({ ...periodo, a: e.target.value || null })}
            />
          </Campo>
        </div>
      </div>

      {/* --- Metriche generali -------------------------------------------- */}
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          etichetta="P&L totale"
          valore={generale.numeroChiusi > 0 ? formattaUsd(generale.pnlUsd, true) : VUOTO}
          classe={classeSegno(generale.numeroChiusi > 0 ? generale.pnlUsd : null)}
          nota={
            generale.numeroChiusi > 0 ? formattaPercent(generale.pnlPercent, 2, true) : undefined
          }
        />
        <Kpi
          etichetta="Win rate"
          valore={generale.winRate == null ? VUOTO : formattaPercent(generale.winRate, 0)}
          nota={`${generale.vittorie} su ${generale.numeroChiusi}`}
        />
        <Kpi
          etichetta="Expectancy"
          valore={formattaR(generale.expectancyR)}
          nota="per trade"
        />
        <Kpi
          etichetta="Drawdown max"
          valore={dd.usd > 0 ? formattaUsd(-dd.usd) : formattaUsd(0)}
          classe={dd.usd > 0 ? 'text-negativo' : 'text-testo'}
          nota={dd.percent == null ? undefined : formattaPercent(dd.percent)}
        />
        <Kpi etichetta="Trade" valore={String(generale.numeroTrade)} nota={
          generale.numeroTrade === generale.numeroChiusi
            ? undefined
            : `${generale.numeroChiusi} conclusi`
        } />
        <Kpi etichetta="R medio" valore={formattaR(generale.rMedio)} />
      </dl>

      {/* --- Disciplina nel tempo ------------------------------------------ */}
      <section className="rounded-card border border-bordo bg-superficie p-4">
        <header className="mb-2">
          <h3 className="text-sm font-medium text-testo">Aderenza al processo, mese per mese</h3>
          <p className="text-xs text-testo-soft">
            La linea delle 5/5 conferme dovrebbe salire, le altre scendere. È l'unico grafico che
            misura te e non il mercato.
          </p>
        </header>
        <GraficoDisciplina righe={disciplina} />
      </section>

      {/* --- Costo delle uscite anticipate --------------------------------- */}
      {costoUscita.numeroTrade > 0 && (
        <section className="rounded-card border border-bordo bg-superficie p-4">
          <h3 className="text-sm font-medium text-testo">Costo delle uscite anticipate</h3>
          <p className="mt-1 text-sm text-testo">
            Sui{' '}
            <span className="num">{costoUscita.numeroTrade}</span>{' '}
            {costoUscita.numeroTrade === 1 ? 'trade chiuso' : 'trade chiusi'} a mano in utile, hai
            lasciato sul piatto{' '}
            <span className="num font-medium text-negativo">
              {formattaR(costoUscita.rLasciato)}
            </span>{' '}
            rispetto al piano, in media{' '}
            <span className="num">{formattaR(costoUscita.rLasciatoMedio)}</span> a trade.
          </p>
          <p className="mt-2 text-xs text-testo-soft">
            È una stima ottimistica: confronta il target che avevi fissato con l'uscita reale, ma
            nessuno sa se quel target sarebbe stato raggiunto. Serve l'ordine di grandezza.
          </p>
        </section>
      )}

      {/* --- Analisi di processo, prima dei grafici ------------------------ */}
      <AnalisiProcesso confronti={confronti} />

      {/* --- Quando vado meglio -------------------------------------------- */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Sezione titolo="Per giorno della settimana">
          <TabellaPeriodi righe={giorni} intestazionePrimaColonna="Giorno" />
        </Sezione>
        <Sezione titolo="Per mese">
          <TabellaPeriodi righe={mesi} intestazionePrimaColonna="Mese" />
        </Sezione>
      </div>

      {/* --- Grafici ------------------------------------------------------- */}
      <Sezione titolo="Equity curve">
        <GraficoEquity punti={equity} account={contiNelGrafico} />
      </Sezione>

      <Sezione titolo="Distribuzione degli R realizzati">
        <GraficoDistribuzioneR barre={istogramma} />
      </Sezione>
    </div>
  )
}
