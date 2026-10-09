import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { metricheTrade } from '../lib/aggregazioni'
import { calcolaMetriche, CONFERME_TOTALI, contaConferme } from '../lib/calcoli'
import {
  caricaAccount,
  caricaImpostazioni,
  caricaTrade,
  caricaTrades,
  IMPOSTAZIONI_DEFAULT,
} from '../lib/dati'
import {
  formattaData,
  formattaPercent,
  formattaPrezzo,
  formattaR,
  formattaUsd,
  oraBreve,
  VUOTO,
} from '../lib/formato'
import { verificheProcesso } from '../lib/processo'
import { punteggioProcesso } from '../lib/statistiche'
import { immagineSnapshot } from '../lib/tradingview'
import {
  CAMPI_LINK,
  FLAG_COMPORTAMENTALI,
  STEP_CHECKLIST,
  type Account,
  type Bias,
  type TradeCompleto,
} from '../lib/tipi'
import { Sezione } from '../componenti/campi'
import RiepilogoMetriche from '../componenti/RiepilogoMetriche'
import VerificheProcesso from '../componenti/VerificheProcesso'

/**
 * Resoconto di un trade in sola lettura: com'era il mercato, cosa diceva la
 * checklist, come è andata, e gli screenshot presi al momento.
 * Per cambiare qualcosa si passa dal pulsante "Modifica".
 */

function classeSegno(n: number | null): string {
  if (n == null || n === 0) return 'text-testo'
  return n > 0 ? 'text-positivo' : 'text-negativo'
}

const FRECCIA_BIAS: Record<Bias, string> = {
  rialzista: '↑',
  ribassista: '↓',
  laterale: '→',
}

function Voce({ etichetta, children }: { etichetta: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-testo-soft">{etichetta}</dt>
      <dd className="text-sm text-testo">{children}</dd>
    </div>
  )
}

/** Uno screenshot, con ripiego sul link se l'immagine non si può mostrare. */
function Snapshot({
  etichetta,
  link,
  onIngrandisci,
}: {
  etichetta: string
  link: string
  onIngrandisci: (src: string) => void
}) {
  const immagine = immagineSnapshot(link)
  const [nonCaricata, setNonCaricata] = useState(false)

  return (
    <figure className="overflow-hidden rounded-md border border-bordo bg-sfondo">
      <figcaption className="flex items-center justify-between gap-2 border-b border-bordo px-3 py-2">
        <span className="text-xs font-medium text-testo">{etichetta}</span>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-accento hover:underline"
        >
          Apri su TradingView ↗
        </a>
      </figcaption>

      {immagine && !nonCaricata ? (
        <button
          type="button"
          onClick={() => onIngrandisci(immagine)}
          className="block w-full cursor-zoom-in"
          aria-label={`Ingrandisci il grafico ${etichetta}`}
        >
          <img
            src={immagine}
            alt={`Grafico ${etichetta}`}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setNonCaricata(true)}
            className="block h-auto w-full"
          />
        </button>
      ) : (
        <p className="px-3 py-8 text-center text-xs text-testo-soft">
          {immagine
            ? 'Anteprima non disponibile: apri il link per vedere il grafico.'
            : 'Questo link non è uno snapshot di TradingView: aprilo per vederlo.'}
        </p>
      )}
    </figure>
  )
}

/** Immagine a tutto schermo. Si chiude con un clic o con Esc. */
function Ingrandimento({ src, onChiudi }: { src: string; onChiudi: () => void }) {
  useEffect(() => {
    const suTasto = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onChiudi()
    }
    window.addEventListener('keydown', suTasto)
    return () => window.removeEventListener('keydown', suTasto)
  }, [onChiudi])

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onChiudi}
      className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-sfondo/92 p-2 sm:p-6"
    >
      <img
        src={src}
        alt="Grafico ingrandito"
        referrerPolicy="no-referrer"
        className="max-h-full max-w-full rounded-md"
      />
    </div>
  )
}

export default function ResocontoTrade() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [trade, setTrade] = useState<TradeCompleto | null>(null)
  const [account, setAccount] = useState<Account[]>([])
  const [soglia, setSoglia] = useState(IMPOSTAZIONI_DEFAULT.soglia_rischio_trade_percent)
  const [ingrandita, setIngrandita] = useState<string | null>(null)
  /** Trade prima e dopo questo, in ordine di data e ora: per ripassare una giornata. */
  const [vicini, setVicini] = useState<{ prec: string | null; succ: string | null }>({
    prec: null,
    succ: null,
  })

  const [caricamento, setCaricamento] = useState(true)
  const [errore, setErrore] = useState<string | null>(null)

  useEffect(() => {
    let annullato = false

    async function carica() {
      if (!id) return
      try {
        const [t, a, imp, tutti] = await Promise.all([
          caricaTrade(id),
          caricaAccount(),
          caricaImpostazioni(),
          caricaTrades(),
        ])
        if (annullato) return

        const chiave = (x: { data: string; ora_entrata: string | null }) =>
          `${x.data} ${x.ora_entrata ?? ''}`
        const ordinati = [...tutti].sort((x, y) => chiave(x).localeCompare(chiave(y)))
        const i = ordinati.findIndex((x) => x.id === id)
        setVicini({
          prec: i > 0 ? ordinati[i - 1].id : null,
          succ: i >= 0 && i < ordinati.length - 1 ? ordinati[i + 1].id : null,
        })
        if (!t) setErrore('Trade non trovato.')
        setTrade(t)
        setAccount(a)
        setSoglia(imp.soglia_rischio_trade_percent)
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
  }, [id])

  /** Le frecce ← → passano al trade precedente o successivo, se non si sta scrivendo. */
  useEffect(() => {
    function suTasto(e: KeyboardEvent) {
      if (ingrandita || e.ctrlKey || e.metaKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return
      const destinazione =
        e.key === 'ArrowLeft' ? vicini.prec : e.key === 'ArrowRight' ? vicini.succ : null
      if (destinazione) navigate(`/trade/${destinazione}`, { replace: true })
    }
    window.addEventListener('keydown', suTasto)
    return () => window.removeEventListener('keydown', suTasto)
  }, [vicini, ingrandita, navigate])

  function indietro() {
    // Se la pagina è stata aperta da un link diretto non c'è una pagina
    // precedente dentro l'app a cui tornare.
    if (window.history.length > 1) navigate(-1)
    else navigate('/trade')
  }

  if (caricamento) return <p className="text-sm text-testo-soft">Caricamento…</p>

  if (errore || !trade) {
    return (
      <div className="space-y-3">
        <p className="rounded-md border border-negativo/40 bg-negativo/10 px-3 py-2 text-sm text-negativo">
          {errore ?? 'Trade non trovato.'}
        </p>
        <Link to="/trade" className="text-sm text-accento hover:underline">
          ← Torna alla lista
        </Link>
      </div>
    )
  }

  // Solo i conti su cui questo trade è stato davvero eseguito, nell'ordine abituale.
  const contiDelTrade = account.filter((a) =>
    (trade.executions ?? []).some((e) => e.account_id === a.id),
  )
  const m = metricheTrade(trade, contiDelTrade)
  const conferme = contaConferme(trade)
  // flatMap invece di map+filter: così TypeScript sa che `link` non è più null.
  const collegamenti = CAMPI_LINK.flatMap((c) => {
    const link = trade[c.campo]
    return link ? [{ campo: c.campo, etichetta: c.etichetta, link }] : []
  })
  const flagAttivi = FLAG_COMPORTAMENTALI.filter((f) => trade[f.campo])
  const processo = punteggioProcesso([trade]).valore

  return (
    <div className="space-y-4">
      {/* --- Intestazione ------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={indietro}
          className="text-sm text-testo-soft transition-colors hover:text-testo"
        >
          ← Indietro
        </button>
        <div className="flex items-center gap-2">
          <div className="flex" role="group" aria-label="Scorri i trade">
            <Link
              to={vicini.prec ? `/trade/${vicini.prec}` : '#'}
              replace
              aria-disabled={!vicini.prec}
              title="Trade precedente (←)"
              className={`rounded-l-md border border-bordo px-3 py-1.5 text-sm transition-colors ${
                vicini.prec ? 'text-testo-soft hover:text-testo' : 'pointer-events-none text-testo-soft/40'
              }`}
            >
              ← Prec.
            </Link>
            <Link
              to={vicini.succ ? `/trade/${vicini.succ}` : '#'}
              replace
              aria-disabled={!vicini.succ}
              title="Trade successivo (→)"
              className={`-ml-px rounded-r-md border border-bordo px-3 py-1.5 text-sm transition-colors ${
                vicini.succ ? 'text-testo-soft hover:text-testo' : 'pointer-events-none text-testo-soft/40'
              }`}
            >
              Succ. →
            </Link>
          </div>
          <Link
            to={`/trade/${trade.id}/modifica`}
            className="rounded-md border border-accento px-4 py-1.5 text-sm text-accento transition-opacity hover:opacity-80"
          >
            Modifica
          </Link>
        </div>
      </div>

      <header className="riquadro p-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-xl font-medium tracking-tight">
            {trade.direzione === 'long' ? 'Long' : 'Short'}
          </h1>
          <span className="num text-sm text-testo-soft">
            {formattaData(trade.data)}
            {trade.ora_entrata && ` · ${oraBreve(trade.ora_entrata)}`}
          </span>
          {trade.finestra && (
            <span
              className={`rounded-md px-2 py-0.5 text-xs ${
                trade.finestra === 'fuori finestra'
                  ? 'bg-negativo/10 text-negativo'
                  : 'bg-positivo/10 text-positivo'
              }`}
            >
              {trade.finestra === 'fuori finestra' ? 'Fuori finestra' : `Finestra ${trade.finestra}`}
            </span>
          )}
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Voce etichetta="Esito">{m.esito ?? 'aperto'}</Voce>
          <Voce etichetta="P&L">
            <span className={`num ${classeSegno(m.pnlUsd)}`}>
              {m.pnlUsd == null ? VUOTO : formattaUsd(m.pnlUsd, true)}
            </span>
          </Voce>
          <Voce etichetta="P&L %">
            <span className={`num ${classeSegno(m.pnlPercent)}`}>
              {formattaPercent(m.pnlPercent, 2, true)}
            </span>
          </Voce>
          <Voce etichetta="R realizzato">
            <span className={`num ${classeSegno(m.rMedio)}`}>{formattaR(m.rMedio)}</span>
          </Voce>
        </dl>
      </header>

      {/* --- Processo, prima di mercato e prezzi ---------------------------- */}
      <Sezione
        titolo="Processo"
        azione={
          <span className="num text-xs text-testo-soft">
            <span className="text-sm text-testo">
              {processo == null ? VUOTO : Math.round(processo)}
            </span>
            /100
          </span>
        }
      >
        <VerificheProcesso verifiche={verificheProcesso(trade)} />
      </Sezione>

      {/* --- Mercato e checklist ------------------------------------------ */}
      <div className="grid gap-4 md:grid-cols-2">
        <Sezione titolo="Situazione di mercato">
          <dl className="grid grid-cols-3 gap-4">
            {(
              [
                ['bias_daily', 'Daily'],
                ['bias_h4', 'H4'],
                ['bias_h1', 'H1'],
              ] as const
            ).map(([campo, etichetta]) => {
              const bias = trade[campo]
              return (
                <Voce key={campo} etichetta={`Bias ${etichetta}`}>
                  {bias ? (
                    <>
                      <span aria-hidden="true" className="mr-1 text-testo-soft">
                        {FRECCIA_BIAS[bias]}
                      </span>
                      {bias}
                    </>
                  ) : (
                    <span className="text-testo-soft">{VUOTO}</span>
                  )}
                </Voce>
              )
            })}
          </dl>
        </Sezione>

        <Sezione
          titolo="Checklist"
          azione={
            <span
              className={`num rounded-md px-2 py-0.5 text-xs ${
                conferme === CONFERME_TOTALI
                  ? 'bg-positivo/15 text-positivo'
                  : 'bg-sfondo text-testo-soft'
              }`}
            >
              {conferme}/{CONFERME_TOTALI} conferme
            </span>
          }
        >
          <ul className="space-y-1.5">
            {STEP_CHECKLIST.map((s) => {
              const presente = Boolean(trade[s.campo])
              return (
                <li key={s.campo} className="flex items-center gap-2 text-sm">
                  <span
                    aria-hidden="true"
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                      presente
                        ? 'border-positivo bg-positivo text-superficie'
                        : 'border-bordo text-testo-soft'
                    }`}
                  >
                    {presente ? '✓' : ''}
                  </span>
                  <span className={presente ? 'text-testo' : 'text-testo-soft line-through'}>
                    {s.etichetta}
                  </span>
                  {s.campo === 'step5_fallimento_rottura' && trade.numero_fr && (
                    <span className="rounded border border-bordo px-1.5 py-0.5 text-[11px] text-testo-soft">
                      {trade.numero_fr === 'primo' ? 'Prima F+R' : 'Seconda F+R'}
                    </span>
                  )}
                  <span className="sr-only">{presente ? 'presente' : 'assente'}</span>
                </li>
              )
            })}
          </ul>
        </Sezione>
      </div>

      {/* --- Grafici ------------------------------------------------------ */}
      <Sezione titolo="Grafici">
        {collegamenti.length === 0 ? (
          <p className="py-4 text-center text-sm text-testo-soft">
            Nessuno screenshot collegato a questo trade.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {collegamenti.map((c) => (
              <Snapshot
                key={c.campo}
                etichetta={c.etichetta}
                link={c.link}
                onIngrandisci={setIngrandita}
              />
            ))}
          </div>
        )}
      </Sezione>

      {/* --- Esecuzione --------------------------------------------------- */}
      <Sezione titolo="Esecuzione">
        {contiDelTrade.length === 0 ? (
          <p className="text-sm text-testo-soft">Nessuna esecuzione registrata.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {contiDelTrade.map((a) => {
              const e = trade.executions.find((x) => x.account_id === a.id)!
              return (
                <div key={a.id} className="rounded-md border border-bordo p-3">
                  <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-testo-soft">
                    {a.nome}
                  </h3>
                  <dl className="grid grid-cols-3 gap-3">
                    <Voce etichetta="Entry">
                      <span className="num">{formattaPrezzo(e.entry)}</span>
                    </Voce>
                    <Voce etichetta="Stop loss">
                      <span className="num">{formattaPrezzo(e.stop_loss)}</span>
                    </Voce>
                    <Voce etichetta="Take profit">
                      <span className="num">{formattaPrezzo(e.take_profit)}</span>
                    </Voce>
                    <Voce etichetta="Exit">
                      <span className="num">{formattaPrezzo(e.exit)}</span>
                    </Voce>
                    <Voce etichetta="Lotti">
                      <span className="num">{formattaPrezzo(e.lotti)}</span>
                    </Voce>
                    <Voce etichetta="Esito">{e.esito ?? VUOTO}</Voce>
                  </dl>
                  <RiepilogoMetriche
                    metriche={calcolaMetriche(e, trade.direzione, a.saldo_iniziale)}
                    sogliaRischioPercent={soglia}
                  />
                </div>
              )
            })}
          </div>
        )}
      </Sezione>

      {/* --- Comportamento e note ----------------------------------------- */}
      <div className="grid gap-4 md:grid-cols-2">
        <Sezione titolo="Comportamento">
          {flagAttivi.length === 0 ? (
            <p className="text-sm text-positivo">Nessuna deviazione dal piano segnalata.</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {flagAttivi.map((f) => (
                <li
                  key={f.campo}
                  className="rounded-md border border-negativo/40 bg-negativo/10 px-2.5 py-1 text-xs text-negativo"
                >
                  {f.etichetta}
                </li>
              ))}
            </ul>
          )}
        </Sezione>

        <Sezione titolo="Note">
          <dl className="space-y-3">
            <Voce etichetta="Uscita">
              {trade.nota_uscita ? (
                <span className="whitespace-pre-line">{trade.nota_uscita}</span>
              ) : (
                <span className="text-testo-soft">{VUOTO}</span>
              )}
            </Voce>
            <Voce etichetta="Emozione">
              {trade.emozione ?? <span className="text-testo-soft">{VUOTO}</span>}
            </Voce>
          </dl>
        </Sezione>
      </div>

      {ingrandita && <Ingrandimento src={ingrandita} onChiudi={() => setIngrandita(null)} />}
    </div>
  )
}
