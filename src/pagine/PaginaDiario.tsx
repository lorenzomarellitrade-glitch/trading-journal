import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  aggiornaPaginaDiario,
  caricaAccount,
  caricaPaginaDiario,
  caricaTrades,
  creaPaginaDiario,
  eliminaPaginaDiario,
} from '../lib/dati'
import {
  CAMPI_BLOCCATI,
  CAMPI_PRIMA,
  LIVELLI,
  RIFLESSI,
  RISPOSTE_PIANO,
  TIME_FRAME_COMUNI,
  type CampoRiflesso,
} from '../lib/diario'
import { formattaDataEstesa, oggiIso, testoInDigitazione } from '../lib/formato'
import { COPPIE_FOREX } from '../lib/journal'
import { segmentiMessaggio, type Segmento } from '../lib/messaggio'
import { riassuntoGiorno } from '../lib/giorno'
import type { Account, PaginaDiario as Pagina, TradeCompleto } from '../lib/tipi'
import ElencoTradeGiorno from '../componenti/ElencoTradeGiorno'
import RiassuntoGiornoChip from '../componenti/RiassuntoGiornoChip'

/**
 * La pagina del giorno: a sinistra il piano, a destra la verifica.
 *
 * La metà PRIMA si compila prima di entrare e poi si blocca: da quel momento
 * non si modifica più, e il database rifiuterebbe comunque ogni modifica. Se
 * durante l'operazione il piano cambia, lo si scrive in "Se l'ho cambiato".
 * La metà DOPO si apre solo a piano bloccato.
 */

/** Campi testuali della metà DOPO. */
const CAMPI_DOPO_TESTO = ['cosa_successo', 'risultato', 'cambiamenti', 'prossima_volta'] as const

type Bozza = Partial<Pagina>

const testoONull = testoInDigitazione

/** Estrae da un oggetto solo i campi indicati. */
function soloCampi<K extends keyof Pagina>(bozza: Bozza, campi: readonly K[]): Pick<Bozza, K> {
  const risultato: Partial<Pick<Bozza, K>> = {}
  for (const c of campi) risultato[c] = bozza[c]
  return risultato as Pick<Bozza, K>
}

const CLASSI_CAMPO =
  'mt-0.5 w-full rounded-md border border-bordo bg-sfondo px-2.5 py-2 text-sm text-testo ' +
  'placeholder:text-testo-soft/60 disabled:cursor-not-allowed disabled:opacity-60'

function Voce({ etichetta, aiuto, children }: { etichetta: string; aiuto?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-testo">{etichetta}</span>
      {aiuto && <span className="block text-[11px] text-testo-soft">{aiuto}</span>}
      {children}
    </label>
  )
}

/**
 * I grafici incollati nel piano, mostrati come immagini. I link che non sono
 * immagini restano link; un'immagine che non si carica torna a essere un link.
 */
function AnteprimaGrafici({ testo }: { testo: string | null | undefined }) {
  const [rotte, setRotte] = useState<Record<string, boolean>>({})
  if (!testo) return null

  const segmenti = segmentiMessaggio(testo)
  const immagini = segmenti.filter(
    (s): s is Extract<Segmento, { tipo: 'immagine' }> => s.tipo === 'immagine' && !rotte[s.valore],
  )
  const link = segmenti.filter(
    (s) => s.tipo === 'link' || (s.tipo === 'immagine' && rotte[s.valore]),
  )

  if (immagini.length === 0 && link.length === 0) return null

  return (
    <div className="space-y-2">
      {immagini.length > 0 && (
        <div className="grid gap-2">
          {immagini.map((s) => (
            <a
              key={s.valore}
              href={s.valore}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-md border border-bordo"
            >
              <img
                src={s.sorgente}
                alt="Grafico del piano"
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setRotte((p) => ({ ...p, [s.valore]: true }))}
                className="block h-auto w-full"
              />
            </a>
          ))}
        </div>
      )}
      {link.map((s) => (
        <a
          key={s.valore}
          href={s.valore}
          target="_blank"
          rel="noopener noreferrer"
          className="block break-all text-xs text-accento hover:underline"
        >
          {s.valore}
        </a>
      ))}
    </div>
  )
}

function ora(iso: string): string {
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

export default function PaginaDiario() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [bozza, setBozza] = useState<Bozza>(() => ({
    data: searchParams.get('data') ?? oggiIso(),
  }))
  const [caricamento, setCaricamento] = useState(Boolean(id))
  const [salvataggio, setSalvataggio] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [messaggio, setMessaggio] = useState<string | null>(null)
  const [confermaBlocco, setConfermaBlocco] = useState(false)
  const [confermaElimina, setConfermaElimina] = useState(false)

  const bloccato = bozza.piano_bloccato_at != null

  /** I trade della data della pagina: la verifica si fa sui fatti. */
  const [tradeGiorno, setTradeGiorno] = useState<TradeCompleto[]>([])
  const [conti, setConti] = useState<Account[]>([])
  useEffect(() => {
    const data = bozza.data
    if (!data) return
    let annullato = false
    Promise.all([caricaTrades(data, data), caricaAccount()])
      .then(([t, acc]) => {
        if (annullato) return
        setTradeGiorno(t)
        setConti(acc)
      })
      // Un di più: senza trade la pagina resta compilabile.
      .catch(() => {
        if (!annullato) setTradeGiorno([])
      })
    return () => {
      annullato = true
    }
  }, [bozza.data])

  useEffect(() => {
    if (!id) return
    let annullato = false

    caricaPaginaDiario(id)
      .then((p) => {
        if (annullato) return
        if (!p) setErrore('Pagina non trovata.')
        else setBozza(p)
      })
      .catch((e) => {
        if (!annullato) setErrore(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!annullato) setCaricamento(false)
      })

    return () => {
      annullato = true
    }
  }, [id])

  function aggiorna(patch: Bozza) {
    setBozza((p) => ({ ...p, ...patch }))
    setMessaggio(null)
  }

  /**
   * Aggiorna un campo scelto a runtime (nei cicli su livelli, domande e
   * riflessi). Il cast serve perché una chiave calcolata produce un tipo con
   * index signature; la coppia campo/valore è comunque verificata dalla firma.
   */
  function aggiornaCampo<K extends keyof Pagina>(campo: K, valore: Pagina[K]) {
    aggiorna({ [campo]: valore } as Bozza)
  }

  /**
   * Salva la metà PRIMA, e se richiesto blocca il piano. Una pagina nuova
   * viene creata al primo salvataggio.
   */
  async function salvaPrima(blocca: boolean) {
    setSalvataggio(true)
    setErrore(null)
    try {
      const campi: Bozza = soloCampi(bozza, CAMPI_BLOCCATI)
      if (blocca) campi.piano_bloccato_at = new Date().toISOString()

      const salvata = id
        ? await aggiornaPaginaDiario(id, campi)
        : await creaPaginaDiario(campi)

      setBozza(salvata)
      setConfermaBlocco(false)
      setMessaggio(blocca ? 'Piano bloccato.' : 'Bozza salvata.')
      if (!id) navigate(`/diario/${salvata.id}`, { replace: true })
    } catch (e) {
      setErrore(e instanceof Error ? e.message : String(e))
    } finally {
      setSalvataggio(false)
    }
  }

  /** Salva la metà DOPO. Si manda solo quella: la PRIMA è bloccata. */
  async function salvaDopo() {
    if (!id) return
    setSalvataggio(true)
    setErrore(null)
    try {
      const campi: Bozza = {
        ...soloCampi(bozza, CAMPI_DOPO_TESTO),
        piano_rispettato: bozza.piano_rispettato ?? null,
        ...soloCampi(
          bozza,
          RIFLESSI.map((r) => r.campo),
        ),
      }
      const salvata = await aggiornaPaginaDiario(id, campi)
      setBozza(salvata)
      setMessaggio('Verifica salvata.')
    } catch (e) {
      setErrore(e instanceof Error ? e.message : String(e))
    } finally {
      setSalvataggio(false)
    }
  }

  async function elimina() {
    if (!id) return
    setSalvataggio(true)
    try {
      await eliminaPaginaDiario(id)
      navigate('/diario', { replace: true })
    } catch (e) {
      setErrore(e instanceof Error ? e.message : String(e))
      setSalvataggio(false)
    }
  }

  if (caricamento) return <p className="text-sm text-testo-soft">Caricamento…</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/diario" className="text-sm text-testo-soft transition-colors hover:text-testo">
          ← Diario
        </Link>
        <h1 className="text-lg font-medium capitalize tracking-tight">
          {id ? formattaDataEstesa(bozza.data) : 'Nuova pagina'}
        </h1>
      </div>

      {errore && (
        <p
          role="alert"
          className="rounded-md border border-negativo/40 bg-negativo/10 px-3 py-2 text-sm text-negativo"
        >
          {errore}
        </p>
      )}

      {/* --- Intestazione: fa parte del piano, quindi si blocca con esso ---- */}
      <fieldset
        disabled={bloccato}
        className="riquadro grid gap-3 p-4 sm:grid-cols-3"
      >
        <Voce etichetta="Data">
          <input
            type="date"
            value={bozza.data ?? ''}
            onChange={(e) => aggiorna({ data: e.target.value })}
            className={`num ${CLASSI_CAMPO}`}
          />
        </Voce>
        <Voce etichetta="Strumento">
          <input
            value={bozza.strumento ?? ''}
            onChange={(e) => aggiorna({ strumento: testoONull(e.target.value) })}
            list="strumenti-diario"
            placeholder="XAUUSD"
            className={`num ${CLASSI_CAMPO}`}
          />
          <datalist id="strumenti-diario">
            <option value="XAUUSD" />
            {COPPIE_FOREX.flatMap((g) => g.coppie).map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Voce>
        <Voce etichetta="Time frame">
          <input
            value={bozza.time_frame ?? ''}
            onChange={(e) => aggiorna({ time_frame: testoONull(e.target.value) })}
            list="tf-diario"
            placeholder="M15"
            className={`num ${CLASSI_CAMPO}`}
          />
          <datalist id="tf-diario">
            {TIME_FRAME_COMUNI.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </Voce>
      </fieldset>

      <div className="grid gap-4 md:grid-cols-2">
        {/* --- PRIMA · dichiaro ------------------------------------------- */}
        <section className="riquadro p-4">
          <header className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-medium uppercase tracking-wide text-accento">
              Prima · dichiaro
            </h2>
            {bloccato && bozza.piano_bloccato_at && (
              <span className="text-[11px] text-testo-soft">
                🔒 Bloccato il {formattaDataEstesa(bozza.piano_bloccato_at.slice(0, 10))} alle{' '}
                {ora(bozza.piano_bloccato_at)}
              </span>
            )}
          </header>

          <fieldset disabled={bloccato} className="space-y-4">
            <Voce etichetta={CAMPI_PRIMA[0].etichetta} aiuto={CAMPI_PRIMA[0].aiuto}>
              <textarea
                rows={CAMPI_PRIMA[0].righe}
                value={bozza.cosa_vedo ?? ''}
                onChange={(e) => aggiorna({ cosa_vedo: testoONull(e.target.value) })}
                className={CLASSI_CAMPO}
              />
            </Voce>

            <div className="space-y-2">
              {/* A piano bloccato i link grezzi non servono più: restano le immagini. */}
              {!bloccato && (
                <Voce
                  etichetta="Il grafico"
                  aiuto="Incolla il link di TradingView. Più grafici: uno per riga."
                >
                  <textarea
                    rows={2}
                    value={bozza.grafici_prima ?? ''}
                    onChange={(e) => aggiorna({ grafici_prima: testoONull(e.target.value) })}
                    placeholder="https://www.tradingview.com/x/…"
                    className={`num ${CLASSI_CAMPO}`}
                  />
                </Voce>
              )}
              {bloccato && bozza.grafici_prima && (
                <span className="text-xs font-medium text-testo">Il grafico</span>
              )}
              <AnteprimaGrafici testo={bozza.grafici_prima} />
            </div>

            <div>
              <span className="text-xs font-medium text-testo">I livelli che conto di usare</span>
              <div className="mt-0.5 grid grid-cols-3 gap-2">
                {LIVELLI.map((l) => (
                  <label key={l.campo} className="block">
                    <span className="text-[11px] uppercase tracking-wide text-testo-soft">
                      {l.etichetta}
                    </span>
                    <input
                      value={bozza[l.campo] ?? ''}
                      onChange={(e) => aggiornaCampo(l.campo, testoONull(e.target.value))}
                      className={`num ${CLASSI_CAMPO}`}
                    />
                  </label>
                ))}
              </div>
            </div>

            <Voce etichetta="Quanto rischio" aiuto="Come preferisci: 150 USD, 0,5%, 1R.">
              <input
                value={bozza.rischio ?? ''}
                onChange={(e) => aggiorna({ rischio: testoONull(e.target.value) })}
                className={`num ${CLASSI_CAMPO}`}
              />
            </Voce>

            {CAMPI_PRIMA.slice(1).map((c) => (
              <Voce key={c.campo} etichetta={c.etichetta} aiuto={c.aiuto || undefined}>
                <textarea
                  rows={c.righe}
                  value={bozza[c.campo] ?? ''}
                  onChange={(e) => aggiornaCampo(c.campo, testoONull(e.target.value))}
                  className={CLASSI_CAMPO}
                />
              </Voce>
            ))}
          </fieldset>

          {!bloccato && (
            <div className="mt-4 space-y-2 border-t border-bordo pt-4">
              {confermaBlocco ? (
                <div className="space-y-2 rounded-md border border-accento/50 bg-accento/10 p-3">
                  <p className="text-sm text-testo">
                    Dopo il blocco questa metà non si potrà più modificare. Se il piano cambierà,
                    lo annoterai nella verifica.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => void salvaPrima(true)}
                      disabled={salvataggio}
                      className="rounded-md bg-accento px-4 py-2 text-sm font-medium text-superficie disabled:opacity-50"
                    >
                      Blocca il piano
                    </button>
                    <button
                      onClick={() => setConfermaBlocco(false)}
                      className="rounded-md border border-bordo px-3 py-2 text-sm text-testo-soft"
                    >
                      Non ancora
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setConfermaBlocco(true)}
                    disabled={salvataggio}
                    className="rounded-md bg-accento px-4 py-2 text-sm font-medium text-superficie transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    🔒 Blocca il piano
                  </button>
                  <button
                    onClick={() => void salvaPrima(false)}
                    disabled={salvataggio}
                    className="rounded-md border border-bordo px-4 py-2 text-sm text-testo-soft transition-colors hover:text-testo disabled:opacity-50"
                  >
                    Salva bozza
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* --- DOPO · verifico -------------------------------------------- */}
        <section className="riquadro p-4">
          <header className="mb-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-accento">
              Dopo · verifico
            </h2>
            {!bloccato && (
              <p className="mt-1 text-xs text-testo-soft">
                Si compila a operazione chiusa, dopo aver bloccato il piano.
              </p>
            )}
          </header>

          {/* I trade registrati quel giorno: si verifica il piano sui fatti. */}
          <div className="mb-4 rounded-md border border-bordo bg-sfondo p-3">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-testo">Trade del giorno</span>
              <span className="flex items-center gap-2">
                {tradeGiorno.length > 0 && (
                  <RiassuntoGiornoChip r={riassuntoGiorno(tradeGiorno, conti)} />
                )}
                {bozza.data && (
                  <Link
                    to={`/trade/nuovo?data=${bozza.data}`}
                    className="text-xs text-accento hover:underline"
                  >
                    + Trade
                  </Link>
                )}
              </span>
            </div>
            <ElencoTradeGiorno trades={tradeGiorno} account={conti} />
          </div>

          <fieldset disabled={!bloccato} className="space-y-4">
            <Voce etichetta="Che cosa è successo" aiuto="Solo i fatti: dove è arrivato il prezzo, cosa è stato eseguito.">
              <textarea
                rows={4}
                value={bozza.cosa_successo ?? ''}
                onChange={(e) => aggiorna({ cosa_successo: testoONull(e.target.value) })}
                className={CLASSI_CAMPO}
              />
            </Voce>

            <Voce etichetta="Risultato">
              <input
                value={bozza.risultato ?? ''}
                onChange={(e) => aggiorna({ risultato: testoONull(e.target.value) })}
                className={`num ${CLASSI_CAMPO}`}
              />
            </Voce>

            <div>
              <span className="text-xs font-medium text-testo">Ho rispettato il piano?</span>
              <div className="mt-1 flex gap-1">
                {RISPOSTE_PIANO.map((r) => {
                  const attiva = bozza.piano_rispettato === r.valore
                  return (
                    <button
                      key={r.valore}
                      type="button"
                      aria-pressed={attiva}
                      onClick={() => aggiorna({ piano_rispettato: attiva ? null : r.valore })}
                      className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                        attiva
                          ? 'border-accento bg-accento/15 text-accento'
                          : 'border-bordo text-testo-soft hover:text-testo'
                      }`}
                    >
                      {r.etichetta}
                    </button>
                  )
                })}
              </div>
            </div>

            <Voce etichetta="Se l'ho cambiato: che cosa, e perché">
              <textarea
                rows={2}
                value={bozza.cambiamenti ?? ''}
                onChange={(e) => aggiorna({ cambiamenti: testoONull(e.target.value) })}
                className={CLASSI_CAMPO}
              />
            </Voce>

            <div>
              <span className="text-xs font-medium text-testo">Chi ha deciso: io o il riflesso?</span>
              <div className="mt-1 grid gap-1.5 sm:grid-cols-2">
                {RIFLESSI.map((r) => (
                  <label
                    key={r.campo}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-bordo bg-sfondo px-3 py-2 text-sm text-testo"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(bozza[r.campo as CampoRiflesso])}
                      onChange={(e) => aggiornaCampo(r.campo, e.target.checked)}
                      className="h-4 w-4 accent-accento"
                    />
                    {r.etichetta}
                  </label>
                ))}
              </div>
            </div>

            <Voce etichetta="La prossima volta">
              <textarea
                rows={2}
                value={bozza.prossima_volta ?? ''}
                onChange={(e) => aggiorna({ prossima_volta: testoONull(e.target.value) })}
                className={CLASSI_CAMPO}
              />
            </Voce>
          </fieldset>

          {bloccato && (
            <div className="mt-4 border-t border-bordo pt-4">
              <button
                onClick={() => void salvaDopo()}
                disabled={salvataggio}
                className="rounded-md bg-accento px-4 py-2 text-sm font-medium text-superficie transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {salvataggio ? 'Salvataggio…' : 'Salva verifica'}
              </button>
            </div>
          )}
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-3 pb-4">
        {messaggio && (
          <span role="status" className="text-sm text-positivo">
            {messaggio}
          </span>
        )}

        {id && (
          <div className="ml-auto">
            {confermaElimina ? (
              <span className="flex items-center gap-2 text-sm">
                <span className="text-testo-soft">Eliminare la pagina?</span>
                <button
                  onClick={() => void elimina()}
                  disabled={salvataggio}
                  className="rounded-md bg-negativo px-3 py-1.5 text-sm text-superficie"
                >
                  Sì, elimina
                </button>
                <button
                  onClick={() => setConfermaElimina(false)}
                  className="rounded-md border border-bordo px-3 py-1.5 text-sm text-testo-soft"
                >
                  No
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfermaElimina(true)}
                className="rounded-md border border-negativo/50 px-3 py-1.5 text-sm text-negativo transition-colors hover:bg-negativo/10"
              >
                Elimina pagina
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
