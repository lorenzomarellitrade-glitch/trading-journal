import { useEffect, useMemo, useRef, useState } from 'react'
import { raggruppaPerGiorno } from '../lib/aggregazioni'
import {
  aggiornaNota,
  caricaAccount,
  caricaMesiConNote,
  caricaNote,
  caricaTrades,
  creaNota,
  eliminaNota,
} from '../lib/dati'
import { primoDelMese, ultimoDelMese } from '../lib/date'
import { formattaData, formattaDataEstesa, formattaUsd, oggiIso } from '../lib/formato'
import { riassuntoGiorno, type RiassuntoGiorno } from '../lib/giorno'
import {
  CANALI_MERCATO,
  COPPIE_FOREX,
  coppiaObbligatoria,
  descrizionePosizione,
  MERCATI,
  POSIZIONE_INIZIALE,
  STATO_MENTALE,
  stessaPosizione,
  titoloPosizione,
  usaCoppia,
  type Posizione,
} from '../lib/journal'
import { segmentiMessaggio, type Segmento } from '../lib/messaggio'
import type { Account, Mercato, NotaJournal, TradeCompleto } from '../lib/tipi'
import SelettoreMese, {
  chiaveMese,
  daChiave,
  etichettaChiave,
} from '../componenti/SelettoreMese'

/**
 * Journal emotivo, organizzato come un server Discord: un gruppo per mercato
 * (XAUUSD e Forex) con gli stessi canali, più lo Stato mentale in comune.
 *
 * Il mese si sceglie in cima e resta lo stesso cambiando canale. Non è un
 * contenitore da creare: ogni nota ha la sua data e finisce da sola nel posto
 * giusto. Sul forex ogni messaggio porta la sua coppia, e un filtro in cima al
 * canale permette di leggerne una sola.
 */

/** Numero progressivo di un mese, per poterli scorrere con l'aritmetica. */
function indiceMese(chiave: string): number {
  const [anno, mese] = daChiave(chiave)
  return anno * 12 + mese
}

function chiaveDaIndice(i: number): string {
  return chiaveMese(Math.floor(i / 12), i % 12)
}

/** Ora del messaggio, senza secondi. */
function ora(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

/** Menu delle coppie forex, raggruppate per valuta come nella watchlist. */
function SelettoreCoppia({
  valore,
  onChange,
  vuoto,
  etichetta,
}: {
  valore: string | null
  onChange: (coppia: string | null) => void
  /** Testo dell'opzione "nessuna coppia" */
  vuoto: string
  etichetta: string
}) {
  return (
    <select
      value={valore ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      aria-label={etichetta}
      className="num rounded-md border border-bordo bg-sfondo px-2 py-1 text-sm text-testo"
    >
      <option value="">{vuoto}</option>
      {COPPIE_FOREX.map((g) => (
        <optgroup key={g.valuta} label={g.valuta}>
          {g.coppie.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}

/**
 * Il testo di una nota, con i link trasformati in immagini dove possibile.
 * Le immagini vengono raccolte sotto al testo, come fa Discord con le anteprime.
 */
function Contenuto({ testo }: { testo: string }) {
  const segmenti = useMemo(() => segmentiMessaggio(testo), [testo])
  // Un'immagine che non si carica torna a essere un link: meglio di un riquadro rotto.
  const [rotte, setRotte] = useState<Record<string, boolean>>({})

  const immagini = segmenti.filter(
    (s): s is Extract<Segmento, { tipo: 'immagine' }> => s.tipo === 'immagine' && !rotte[s.valore],
  )

  return (
    <div className="space-y-2">
      <p className="whitespace-pre-wrap break-words text-sm text-testo">
        {segmenti.map((s, i) => {
          if (s.tipo === 'testo') return <span key={i}>{s.valore}</span>
          if (s.tipo === 'immagine' && !rotte[s.valore]) return null
          return (
            <a
              key={i}
              href={s.valore}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-accento hover:underline"
            >
              {s.valore}
            </a>
          )
        })}
      </p>

      {immagini.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
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
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setRotte((p) => ({ ...p, [s.valore]: true }))}
                className="block h-auto w-full"
              />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

function Messaggio({
  nota,
  onModifica,
  onElimina,
}: {
  nota: NotaJournal
  onModifica: (testo: string) => Promise<void>
  onElimina: () => Promise<void>
}) {
  const [inModifica, setInModifica] = useState(false)
  const [bozza, setBozza] = useState(nota.testo)
  const [confermaElimina, setConfermaElimina] = useState(false)

  return (
    <article className="group rounded-md px-3 py-2 transition-colors hover:bg-sfondo">
      <header className="mb-1 flex flex-wrap items-center gap-2">
        {nota.coppia && (
          <span className="num rounded border border-accento/50 bg-accento/10 px-1.5 py-0.5 text-[11px] font-medium text-accento">
            {nota.coppia}
          </span>
        )}
        {/* Data e ora su ogni messaggio: scorrendo non serve risalire al
            separatore di giornata per capire quando è stato scritto. */}
        <span className="num text-[11px] text-testo-soft">
          {formattaData(nota.data)} · {ora(nota.created_at)}
        </span>
        {nota.updated_at !== nota.created_at && (
          <span className="text-[11px] text-testo-soft/70">(modificato)</span>
        )}

        <span className="ml-auto flex gap-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <button
            onClick={() => {
              setBozza(nota.testo)
              setInModifica(true)
            }}
            className="text-[11px] text-testo-soft hover:text-testo"
          >
            Modifica
          </button>
          {confermaElimina ? (
            <>
              <button
                onClick={() => void onElimina()}
                className="text-[11px] text-negativo hover:underline"
              >
                Confermi?
              </button>
              <button
                onClick={() => setConfermaElimina(false)}
                className="text-[11px] text-testo-soft hover:text-testo"
              >
                No
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfermaElimina(true)}
              className="text-[11px] text-testo-soft hover:text-negativo"
            >
              Elimina
            </button>
          )}
        </span>
      </header>

      {inModifica ? (
        <div className="space-y-2">
          <textarea
            value={bozza}
            onChange={(e) => setBozza(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-bordo bg-sfondo px-3 py-2 text-sm text-testo"
          />
          <div className="flex gap-2">
            <button
              onClick={async () => {
                await onModifica(bozza)
                setInModifica(false)
              }}
              className="rounded-md bg-accento px-3 py-1.5 text-xs font-medium text-superficie"
            >
              Salva
            </button>
            <button
              onClick={() => setInModifica(false)}
              className="rounded-md border border-bordo px-3 py-1.5 text-xs text-testo-soft"
            >
              Annulla
            </button>
          </div>
        </div>
      ) : (
        <Contenuto testo={nota.testo} />
      )}
    </article>
  )
}

/** Una voce della colonna dei canali. */
function VoceCanale({
  etichetta,
  attiva,
  onClick,
}: {
  etichetta: string
  attiva: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={attiva}
      className={`w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
        attiva ? 'bg-accento/15 text-accento' : 'text-testo-soft hover:bg-superficie hover:text-testo'
      }`}
    >
      <span className="text-testo-soft/60">#</span> {etichetta}
    </button>
  )
}

export default function Journal() {
  const adesso = new Date()
  const meseCorrente = chiaveMese(adesso.getFullYear(), adesso.getMonth())

  const [posizione, setPosizione] = useState<Posizione>(POSIZIONE_INIZIALE)
  const [mese, setMese] = useState(meseCorrente)
  const [mesiConNote, setMesiConNote] = useState<string[]>([])
  /** Filtro sulla coppia in lettura; null = tutte */
  const [coppiaFiltro, setCoppiaFiltro] = useState<string | null>(null)

  const [note, setNote] = useState<NotaJournal[]>([])
  const [bozza, setBozza] = useState('')
  const [dataNota, setDataNota] = useState(oggiIso())
  const [coppiaNota, setCoppiaNota] = useState<string | null>(null)

  const [caricamento, setCaricamento] = useState(true)
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const fondo = useRef<HTMLDivElement>(null)

  /** I trade del mese mostrato, per il riassunto accanto a ogni data. */
  const [tradeMese, setTradeMese] = useState<TradeCompleto[]>([])
  const [conti, setConti] = useState<Account[]>([])

  const conNote = useMemo(() => new Set(mesiConNote), [mesiConNote])

  const [anno, numeroMese] = daChiave(mese)
  const da = primoDelMese(anno, numeroMese)
  const a = ultimoDelMese(anno, numeroMese)

  const conCoppia = usaCoppia(posizione)
  const mancaCoppia = coppiaObbligatoria(posizione) && coppiaNota == null

  useEffect(() => {
    caricaMesiConNote()
      .then(setMesiConNote)
      .catch((e) => setErrore(e instanceof Error ? e.message : String(e)))
  }, [])

  useEffect(() => {
    let annullato = false

    async function carica() {
      setCaricamento(true)
      setErrore(null)
      try {
        const n = await caricaNote(posizione, da, a, conCoppia ? coppiaFiltro : null)
        if (!annullato) setNote(n)
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
  }, [posizione, da, a, coppiaFiltro, conCoppia])

  useEffect(() => {
    let annullato = false
    Promise.all([caricaTrades(da, a), caricaAccount()])
      .then(([t, acc]) => {
        if (annullato) return
        setTradeMese(t)
        setConti(acc)
      })
      // Il riassunto è un di più: senza trade il journal funziona lo stesso.
      .catch(() => {
        if (!annullato) setTradeMese([])
      })
    return () => {
      annullato = true
    }
  }, [da, a])

  /**
   * Il riassunto dei trade per data. I trade del journal sono su XAUUSD:
   * il riassunto ha senso nei canali dell'oro e nello Stato mentale, non
   * in quelli del forex.
   */
  const riassunti = useMemo(() => {
    const mappa = new Map<string, RiassuntoGiorno>()
    if (posizione.mercato === 'forex') return mappa
    for (const [data, delGiorno] of raggruppaPerGiorno(tradeMese)) {
      mappa.set(data, riassuntoGiorno(delGiorno, conti))
    }
    return mappa
  }, [tradeMese, conti, posizione.mercato])

  // Aprendo un canale si finisce in fondo, sull'ultimo messaggio.
  useEffect(() => {
    fondo.current?.scrollIntoView({ block: 'end' })
  }, [note])

  function vaiA(nuova: Posizione) {
    // Uscendo dal forex la coppia non ha più senso; restando nel forex si
    // tiene, perché capita di scrivere più messaggi di fila sulla stessa coppia.
    if (nuova.mercato !== 'forex') {
      setCoppiaFiltro(null)
      setCoppiaNota(null)
    }
    setPosizione(nuova)
  }

  function filtraCoppia(coppia: string | null) {
    setCoppiaFiltro(coppia)
    // Chi sta leggendo una coppia di solito scrive su quella.
    if (coppia) setCoppiaNota(coppia)
  }

  /**
   * Cambiando mese la data del nuovo messaggio segue il mese visualizzato:
   * scrivere in settembre mentre si guarda ottobre sarebbe una sorpresa.
   */
  function cambiaMese(nuovo: string) {
    setMese(nuovo)
    const [y, m] = daChiave(nuovo)
    setDataNota(nuovo === meseCorrente ? oggiIso() : ultimoDelMese(y, m))
  }

  async function invia() {
    const testo = bozza.trim()
    if (testo === '' || invio || mancaCoppia) return

    setInvio(true)
    setErrore(null)
    try {
      const creata = await creaNota(posizione, dataNota, testo, coppiaNota)
      setBozza('')

      const meseNota = creata.data.slice(0, 7)
      setMesiConNote((p) => (p.includes(meseNota) ? p : [...p, meseNota]))

      // Se il messaggio non rientra in ciò che si sta guardando, ci si sposta
      // lì invece di farlo "sparire" dopo l'invio.
      if (meseNota !== mese) cambiaMese(meseNota)
      else if (coppiaFiltro && creata.coppia !== coppiaFiltro) setCoppiaFiltro(creata.coppia)
      else setNote((p) => [...p, creata])
    } catch (e) {
      setErrore(e instanceof Error ? e.message : String(e))
    } finally {
      setInvio(false)
    }
  }

  async function modifica(id: string, testo: string) {
    await aggiornaNota(id, testo)
    setNote((p) =>
      p.map((n) => (n.id === id ? { ...n, testo, updated_at: new Date().toISOString() } : n)),
    )
  }

  async function elimina(id: string) {
    await eliminaNota(id)
    setNote((p) => p.filter((n) => n.id !== id))
  }

  /** Messaggi raggruppati per giorno, per il separatore di data. */
  const perGiorno = useMemo(() => {
    const gruppi = new Map<string, NotaJournal[]>()
    for (const n of note) {
      const esistenti = gruppi.get(n.data)
      if (esistenti) esistenti.push(n)
      else gruppi.set(n.data, [n])
    }
    return [...gruppi.entries()]
  }, [note])

  const titolo = titoloPosizione(posizione)
  const statoMentale: Posizione = { mercato: null, canale: STATO_MENTALE.canale }

  /** Gruppo mostrato nelle schede su telefono. */
  const gruppoMobile: Mercato | 'stato-mentale' = posizione.mercato ?? 'stato-mentale'

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-medium tracking-tight">Journal emotivo</h1>

      <div className="flex flex-col gap-4 md:flex-row">
        {/* --- Mese e canali ---------------------------------------------- */}
        <aside className="shrink-0 space-y-2 md:w-52">
          <div className="flex items-center gap-1">
            <button
              onClick={() => cambiaMese(chiaveDaIndice(indiceMese(mese) - 1))}
              aria-label="Mese precedente"
              className="rounded-md border border-bordo px-2 py-1.5 text-testo-soft transition-colors hover:text-testo"
            >
              ‹
            </button>
            <SelettoreMese mese={mese} mesiConNote={conNote} onChange={cambiaMese} />
            <button
              onClick={() => cambiaMese(chiaveDaIndice(indiceMese(mese) + 1))}
              aria-label="Mese successivo"
              className="rounded-md border border-bordo px-2 py-1.5 text-testo-soft transition-colors hover:text-testo"
            >
              ›
            </button>
          </div>

          {/* Desktop: la colonna a gruppi, come le categorie di Discord. */}
          <nav className="hidden md:block">
            {MERCATI.map((m) => (
              <div key={m.mercato}>
                <p className="px-3 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wide text-testo-soft">
                  {m.etichetta}
                </p>
                {CANALI_MERCATO.map((c) => {
                  const p: Posizione = { mercato: m.mercato, canale: c.canale }
                  return (
                    <VoceCanale
                      key={c.canale}
                      etichetta={c.etichetta}
                      attiva={stessaPosizione(posizione, p)}
                      onClick={() => vaiA(p)}
                    />
                  )
                })}
              </div>
            ))}

            <div className="mt-3 border-t border-bordo pt-3">
              <VoceCanale
                etichetta={STATO_MENTALE.etichetta}
                attiva={stessaPosizione(posizione, statoMentale)}
                onClick={() => vaiA(statoMentale)}
              />
            </div>
          </nav>

          {/* Telefono: prima il gruppo, poi i canali del gruppo in una fila. */}
          <div className="space-y-2 md:hidden">
            <div className="flex gap-1">
              {[
                ...MERCATI.map((m) => ({ chiave: m.mercato, etichetta: m.etichetta })),
                { chiave: 'stato-mentale' as const, etichetta: STATO_MENTALE.etichetta },
              ].map((g) => (
                <button
                  key={g.chiave}
                  onClick={() =>
                    g.chiave === 'stato-mentale'
                      ? vaiA(statoMentale)
                      : vaiA({
                          mercato: g.chiave,
                          canale: posizione.mercato ? posizione.canale : 'tp',
                        })
                  }
                  aria-pressed={gruppoMobile === g.chiave}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-xs transition-colors ${
                    gruppoMobile === g.chiave
                      ? 'border-accento bg-accento/15 text-accento'
                      : 'border-bordo text-testo-soft'
                  }`}
                >
                  {g.etichetta}
                </button>
              ))}
            </div>

            {posizione.mercato && (
              <div className="flex gap-1 overflow-x-auto pb-1">
                {CANALI_MERCATO.map((c) => {
                  const p: Posizione = { mercato: posizione.mercato, canale: c.canale }
                  const attiva = stessaPosizione(posizione, p)
                  return (
                    <button
                      key={c.canale}
                      onClick={() => vaiA(p)}
                      aria-pressed={attiva}
                      className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors ${
                        attiva ? 'bg-accento/15 text-accento' : 'text-testo-soft'
                      }`}
                    >
                      <span className="text-testo-soft/60">#</span> {c.etichetta}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </aside>

        {/* --- Messaggi ---------------------------------------------------- */}
        <div className="riquadro min-w-0 flex-1">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-bordo px-4 py-2">
            <div>
              <h2 className="text-sm font-medium text-testo">
                <span className="text-testo-soft/60">#</span> {titolo}
              </h2>
              <p className="text-xs text-testo-soft">{descrizionePosizione(posizione)}</p>
            </div>

            {conCoppia && (
              <SelettoreCoppia
                valore={coppiaFiltro}
                onChange={filtraCoppia}
                vuoto="Tutte le coppie"
                etichetta="Filtra per coppia"
              />
            )}
          </header>

          {errore && (
            <p
              role="alert"
              className="m-3 rounded-md border border-negativo/40 bg-negativo/10 px-3 py-2 text-sm text-negativo"
            >
              {errore}
            </p>
          )}

          <div className="max-h-[55vh] min-h-64 overflow-y-auto p-2 lg:max-h-[65vh]">
            {caricamento ? (
              <p className="p-4 text-sm text-testo-soft">Caricamento…</p>
            ) : note.length === 0 ? (
              <p className="p-8 text-center text-sm text-testo-soft">
                Niente in {titolo}
                {coppiaFiltro && conCoppia ? ` su ${coppiaFiltro}` : ''} per{' '}
                {etichettaChiave(mese).toLowerCase()}.
              </p>
            ) : (
              perGiorno.map(([giorno, delGiorno]) => (
                <section key={giorno}>
                  <div className="my-3 flex items-center gap-3">
                    <span className="h-px flex-1 bg-bordo" />
                    <span className="rounded-full border border-bordo px-3 py-0.5 text-[11px] capitalize text-testo">
                      {formattaDataEstesa(giorno)}
                    </span>
                    {riassunti.has(giorno) && <RiassuntoTrade r={riassunti.get(giorno)!} />}
                    <span className="h-px flex-1 bg-bordo" />
                  </div>

                  {delGiorno.map((n) => (
                    <Messaggio
                      key={n.id}
                      nota={n}
                      onModifica={(testo) => modifica(n.id, testo)}
                      onElimina={() => elimina(n.id)}
                    />
                  ))}
                </section>
              ))
            )}
            <div ref={fondo} />
          </div>

          {/* --- Casella di scrittura -------------------------------------- */}
          <div className="border-t border-bordo p-3">
            <textarea
              value={bozza}
              onChange={(e) => setBozza(e.target.value)}
              onKeyDown={(e) => {
                // Invio va a capo, Ctrl+Invio manda: i messaggi qui sono lunghi.
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void invia()
              }}
              rows={3}
              placeholder={`Scrivi in #${titolo}. Incolla i link di TradingView e diventano immagini.`}
              className="w-full rounded-md border border-bordo bg-sfondo px-3 py-2 text-sm text-testo placeholder:text-testo-soft/60"
            />

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {conCoppia && (
                <SelettoreCoppia
                  valore={coppiaNota}
                  onChange={setCoppiaNota}
                  vuoto={coppiaObbligatoria(posizione) ? 'Scegli la coppia' : 'Nessuna coppia'}
                  etichetta="Coppia del messaggio"
                />
              )}

              <label className="flex items-center gap-2 text-xs text-testo-soft">
                Data
                <input
                  type="date"
                  value={dataNota}
                  onChange={(e) => setDataNota(e.target.value)}
                  className="num rounded border border-bordo bg-sfondo px-2 py-1 text-sm text-testo"
                />
              </label>

              {mancaCoppia ? (
                <span className="text-[11px] text-accento">
                  Scegli la coppia su cui hai operato.
                </span>
              ) : (
                <span className="hidden text-[11px] text-testo-soft sm:inline">
                  Ctrl+Invio per inviare
                </span>
              )}

              <button
                onClick={() => void invia()}
                disabled={invio || bozza.trim() === '' || mancaCoppia}
                className="ml-auto rounded-md bg-accento px-4 py-1.5 text-sm font-medium text-superficie transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {invio ? 'Invio…' : 'Invia'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * I trade del giorno in una riga, accanto alla data: quanti, il P&L e quanti
 * a 5/5. Collega quello che si è scritto a quello che si è fatto.
 */
function RiassuntoTrade({ r }: { r: RiassuntoGiorno }) {
  const segno =
    r.pnlUsd == null || r.pnlUsd === 0 ? 'text-testo-soft' : r.pnlUsd > 0 ? 'text-positivo' : 'text-negativo'
  return (
    <span
      title={`${r.numeroTrade} trade, ${r.processoCompleto} con 5 conferme su 5`}
      className="num rounded-full border border-bordo px-2.5 py-0.5 text-[11px] text-testo-soft"
    >
      {r.numeroTrade} trade
      {r.pnlUsd != null && <span className={`ml-1.5 ${segno}`}>{formattaUsd(r.pnlUsd, true)}</span>}
      <span className="ml-1.5">✓ {r.processoCompleto}/{r.numeroTrade}</span>
    </span>
  )
}
