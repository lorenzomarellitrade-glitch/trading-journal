import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { raggruppaPerGiorno } from '../lib/aggregazioni'
import { caricaAccount, caricaSettimanaDiario, caricaTrades, salvaSettimanaDiario } from '../lib/dati'
import { aggiungiGiorni, fineSettimana, inizioSettimana } from '../lib/date'
import { GIORNI_FERIALI, RIGA_VUOTA, RISPOSTE_PIANO } from '../lib/diario'
import { formattaData, formattaUsd, oggiIso, testoInDigitazione } from '../lib/formato'
import { compilaRigaSettimana, riassuntoGiorno, type RiassuntoGiorno } from '../lib/giorno'
import type {
  Account,
  GiornoFeriale,
  PianoRispettato,
  RigaSettimana,
  SettimanaDiario as Settimana,
  TradeCompleto,
} from '../lib/tipi'
import RiassuntoGiornoChip from '../componenti/RiassuntoGiornoChip'
import SchedeDiario from '../componenti/SchedeDiario'

/**
 * Il riepilogo della settimana, compilato a mano come il foglio: una riga per
 * giorno, poi la cosa fatta meglio, l'errore che si è ripetuto e una sola
 * regola per la settimana dopo.
 *
 * In cima compare, solo in lettura, la regola che ti eri dato la settimana
 * prima: il foglio chiede di scriverla in modo che si possa verificare, e
 * questo è il momento per farlo.
 */

type Bozza = Pick<
  Settimana,
  'strumenti' | 'giorni' | 'fatto_meglio' | 'errore_ripetuto' | 'riflesso' | 'regola'
>

const BOZZA_VUOTA: Bozza = {
  strumenti: null,
  giorni: {},
  fatto_meglio: null,
  errore_ripetuto: null,
  riflesso: null,
  regola: null,
}

const CLASSI_CAMPO =
  'w-full rounded-md border border-bordo bg-sfondo px-2.5 py-2 text-sm text-testo ' +
  'placeholder:text-testo-soft/60'

const testoONull = testoInDigitazione

function Domanda({ etichetta, aiuto, children }: { etichetta: string; aiuto?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-testo">{etichetta}</span>
      {aiuto && <span className="block text-[11px] text-testo-soft">{aiuto}</span>}
      <span className="mt-0.5 block">{children}</span>
    </label>
  )
}

export default function SettimanaDiario() {
  const [lunedi, setLunedi] = useState(() => inizioSettimana(oggiIso()))
  const [bozza, setBozza] = useState<Bozza>(BOZZA_VUOTA)
  const [regolaPrecedente, setRegolaPrecedente] = useState<string | null>(null)

  const [caricamento, setCaricamento] = useState(true)
  const [salvataggio, setSalvataggio] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [messaggio, setMessaggio] = useState<string | null>(null)

  /** I trade della settimana, per affiancare i fatti a quello che si scrive. */
  const [tradeSettimana, setTradeSettimana] = useState<TradeCompleto[]>([])
  const [conti, setConti] = useState<Account[]>([])
  useEffect(() => {
    let annullato = false
    Promise.all([caricaTrades(lunedi, aggiungiGiorni(lunedi, 6)), caricaAccount()])
      .then(([t, acc]) => {
        if (annullato) return
        setTradeSettimana(t)
        setConti(acc)
      })
      // Un di più: senza trade il riepilogo resta compilabile a mano.
      .catch(() => {
        if (!annullato) setTradeSettimana([])
      })
    return () => {
      annullato = true
    }
  }, [lunedi])

  /** Il riassunto dei trade di ogni giorno feriale, se ce ne sono. */
  const riassunti = useMemo(() => {
    const perData = raggruppaPerGiorno(tradeSettimana)
    const mappa = new Map<GiornoFeriale, RiassuntoGiorno>()
    GIORNI_FERIALI.forEach(({ giorno }, i) => {
      const delGiorno = perData.get(aggiungiGiorni(lunedi, i))
      if (delGiorno) mappa.set(giorno, riassuntoGiorno(delGiorno, conti))
    })
    return mappa
  }, [tradeSettimana, conti, lunedi])

  /** Copia i dati dei trade nei campi ancora vuoti di un giorno. */
  function compilaGiorno(giorno: GiornoFeriale) {
    const r = riassunti.get(giorno)
    if (!r) return
    const riga = { ...RIGA_VUOTA, ...bozza.giorni[giorno] }
    const patch = compilaRigaSettimana(riga, r, r.pnlUsd == null ? null : formattaUsd(r.pnlUsd, true))
    if (Object.keys(patch).length > 0) aggiornaGiorno(giorno, patch)
  }

  useEffect(() => {
    let annullato = false
    setCaricamento(true)
    setErrore(null)
    setMessaggio(null)

    Promise.all([caricaSettimanaDiario(lunedi), caricaSettimanaDiario(aggiungiGiorni(lunedi, -7))])
      .then(([questa, precedente]) => {
        if (annullato) return
        setBozza(
          questa
            ? {
                strumenti: questa.strumenti,
                giorni: questa.giorni ?? {},
                fatto_meglio: questa.fatto_meglio,
                errore_ripetuto: questa.errore_ripetuto,
                riflesso: questa.riflesso,
                regola: questa.regola,
              }
            : BOZZA_VUOTA,
        )
        setRegolaPrecedente(precedente?.regola ?? null)
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
  }, [lunedi])

  function aggiorna(patch: Partial<Bozza>) {
    setBozza((p) => ({ ...p, ...patch }))
    setMessaggio(null)
  }

  function aggiornaGiorno(giorno: GiornoFeriale, patch: Partial<RigaSettimana>) {
    setBozza((p) => ({
      ...p,
      giorni: { ...p.giorni, [giorno]: { ...RIGA_VUOTA, ...p.giorni[giorno], ...patch } },
    }))
    setMessaggio(null)
  }

  async function salva() {
    setSalvataggio(true)
    setErrore(null)
    try {
      await salvaSettimanaDiario({ settimana_dal: lunedi, ...bozza })
      setMessaggio('Settimana salvata.')
    } catch (e) {
      setErrore(e instanceof Error ? e.message : String(e))
    } finally {
      setSalvataggio(false)
    }
  }

  const settimanaCorrente = lunedi === inizioSettimana(oggiIso())

  return (
    <div className="space-y-4">
      <SchedeDiario />

      {/* --- Scelta della settimana ---------------------------------------- */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setLunedi((l) => aggiungiGiorni(l, -7))}
          aria-label="Settimana precedente"
          className="rounded-md border border-bordo px-2 py-1 text-testo-soft transition-colors hover:text-testo"
        >
          ‹
        </button>
        <span className="num min-w-56 text-center text-sm font-medium">
          Dal {formattaData(lunedi)} al {formattaData(fineSettimana(lunedi))}
        </span>
        <button
          onClick={() => setLunedi((l) => aggiungiGiorni(l, 7))}
          aria-label="Settimana successiva"
          className="rounded-md border border-bordo px-2 py-1 text-testo-soft transition-colors hover:text-testo"
        >
          ›
        </button>
        {!settimanaCorrente && (
          <button
            onClick={() => setLunedi(inizioSettimana(oggiIso()))}
            className="rounded-md border border-accento px-2.5 py-1 text-xs text-accento"
          >
            Questa settimana
          </button>
        )}
      </div>

      {errore && (
        <p
          role="alert"
          className="rounded-md border border-negativo/40 bg-negativo/10 px-3 py-2 text-sm text-negativo"
        >
          {errore}
        </p>
      )}

      {caricamento ? (
        <p className="text-sm text-testo-soft">Caricamento…</p>
      ) : (
        <>
          {regolaPrecedente && (
            <div className="rounded-card border border-accento/50 bg-accento/10 p-4">
              <p className="text-[11px] uppercase tracking-wide text-accento">
                La regola che ti eri dato la settimana scorsa
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-testo">{regolaPrecedente}</p>
            </div>
          )}

          <section className="riquadro space-y-4 p-4">
            <Domanda etichetta="Strumenti seguiti">
              <input
                value={bozza.strumenti ?? ''}
                onChange={(e) => aggiorna({ strumenti: testoONull(e.target.value) })}
                placeholder="XAUUSD, EURUSD…"
                className={`num ${CLASSI_CAMPO}`}
              />
            </Domanda>

            {/* --- La tabella dei giorni --------------------------------------- */}
            <div>
              {riassunti.size > 0 && (
                <div className="mb-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => GIORNI_FERIALI.forEach(({ giorno }) => compilaGiorno(giorno))}
                    className="rounded-md border border-bordo px-3 py-1.5 text-xs text-testo-soft transition-colors hover:text-testo"
                  >
                    Compila dai trade i campi vuoti
                  </button>
                </div>
              )}
              {/* Intestazioni: su telefono ogni giorno diventa un blocco a sé. */}
              <div className="hidden grid-cols-[6rem_1fr_8rem_8rem_1.5fr] gap-2 pb-1 text-[11px] uppercase tracking-wide text-testo-soft md:grid">
                <span>Giorno</span>
                <span>Operazioni</span>
                <span>Piano rispettato</span>
                <span>Risultato</span>
                <span>Una riga di nota</span>
              </div>

              <div className="space-y-2">
                {GIORNI_FERIALI.map(({ giorno, etichetta }) => {
                  const riga = { ...RIGA_VUOTA, ...bozza.giorni[giorno] }
                  return (
                    <div
                      key={giorno}
                      className="grid gap-2 rounded-md border border-bordo p-2 md:grid-cols-[6rem_1fr_8rem_8rem_1.5fr] md:items-center md:border-0 md:p-0"
                    >
                      <span className="text-sm font-medium text-testo">{etichetta}</span>
                      <input
                        value={riga.operazioni}
                        onChange={(e) => aggiornaGiorno(giorno, { operazioni: e.target.value })}
                        placeholder="Operazioni"
                        aria-label={`Operazioni di ${etichetta}`}
                        className={CLASSI_CAMPO}
                      />
                      <select
                        value={riga.piano}
                        onChange={(e) =>
                          aggiornaGiorno(giorno, { piano: e.target.value as PianoRispettato | '' })
                        }
                        aria-label={`Piano rispettato ${etichetta}`}
                        className={CLASSI_CAMPO}
                      >
                        <option value="">Piano rispettato?</option>
                        {RISPOSTE_PIANO.map((r) => (
                          <option key={r.valore} value={r.valore}>
                            {r.etichetta}
                          </option>
                        ))}
                      </select>
                      <input
                        value={riga.risultato}
                        onChange={(e) => aggiornaGiorno(giorno, { risultato: e.target.value })}
                        placeholder="Risultato"
                        aria-label={`Risultato di ${etichetta}`}
                        className={`num ${CLASSI_CAMPO}`}
                      />
                      <input
                        value={riga.nota}
                        onChange={(e) => aggiornaGiorno(giorno, { nota: e.target.value })}
                        placeholder="Una riga di nota"
                        aria-label={`Nota di ${etichetta}`}
                        className={CLASSI_CAMPO}
                      />
                      {riassunti.has(giorno) && (
                        <div className="flex flex-wrap items-center gap-2 md:col-span-5 md:col-start-2">
                          <span className="text-[11px] text-testo-soft">Dal journal:</span>
                          <RiassuntoGiornoChip r={riassunti.get(giorno)!} />
                          <button
                            type="button"
                            onClick={() => compilaGiorno(giorno)}
                            className="text-[11px] text-accento hover:underline"
                          >
                            Copia nei campi vuoti
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          <section className="riquadro grid gap-4 p-4 md:grid-cols-2">
            <Domanda etichetta="La cosa che ho fatto meglio">
              <textarea
                rows={3}
                value={bozza.fatto_meglio ?? ''}
                onChange={(e) => aggiorna({ fatto_meglio: testoONull(e.target.value) })}
                className={CLASSI_CAMPO}
              />
            </Domanda>
            <Domanda etichetta="L'errore che si è ripetuto">
              <textarea
                rows={3}
                value={bozza.errore_ripetuto ?? ''}
                onChange={(e) => aggiorna({ errore_ripetuto: testoONull(e.target.value) })}
                className={CLASSI_CAMPO}
              />
            </Domanda>
            <div className="md:col-span-2">
              <Domanda etichetta="Quante volte ha deciso il riflesso, e quale">
                <textarea
                  rows={2}
                  value={bozza.riflesso ?? ''}
                  onChange={(e) => aggiorna({ riflesso: testoONull(e.target.value) })}
                  className={CLASSI_CAMPO}
                />
              </Domanda>
            </div>
            <div className="md:col-span-2">
              <Domanda
                etichetta="La regola che mi do per la prossima settimana"
                aiuto="Una sola, scritta in modo che la settimana prossima si possa dire se l'hai rispettata."
              >
                <textarea
                  rows={2}
                  value={bozza.regola ?? ''}
                  onChange={(e) => aggiorna({ regola: testoONull(e.target.value) })}
                  className={CLASSI_CAMPO}
                />
              </Domanda>
            </div>
          </section>

          <div className="flex items-center gap-3 pb-4">
            <button
              onClick={() => void salva()}
              disabled={salvataggio}
              className="rounded-md bg-accento px-4 py-2 text-sm font-medium text-superficie transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {salvataggio ? 'Salvataggio…' : 'Salva settimana'}
            </button>
            {messaggio && (
              <span role="status" className="text-sm text-positivo">
                {messaggio}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
