import { useEffect, useMemo, useRef, useState } from 'react'
import {
  aggiornaNota,
  caricaMesiConNote,
  caricaNote,
  creaNota,
  eliminaNota,
} from '../lib/dati'
import { primoDelMese, ultimoDelMese } from '../lib/date'
import SelettoreMese, {
  chiaveMese,
  daChiave,
  etichettaChiave,
} from '../componenti/SelettoreMese'
import { formattaData, formattaDataEstesa, oggiIso } from '../lib/formato'
import { segmentiMessaggio, type Segmento } from '../lib/messaggio'
import { CANALI, type Canale, type NotaJournal } from '../lib/tipi'

/**
 * Journal emotivo: una chat per canale, divisa per mese.
 *
 * I canali stanno fissi nella colonna a sinistra e il mese si sceglie da un
 * menu in cima: così cambiando mese si resta nello stesso canale, che è il
 * confronto che serve più spesso. Il mese non è un contenitore da creare:
 * ogni nota ha la sua data e finisce da sola nel posto giusto.
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
      <header className="mb-1 flex items-center gap-2">
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

export default function Journal() {
  const adesso = new Date()
  const meseCorrente = chiaveMese(adesso.getFullYear(), adesso.getMonth())

  const [canale, setCanale] = useState<Canale>('tp')
  const [mese, setMese] = useState(meseCorrente)
  const [mesiConNote, setMesiConNote] = useState<string[]>([])

  const [note, setNote] = useState<NotaJournal[]>([])
  const [bozza, setBozza] = useState('')
  const [dataNota, setDataNota] = useState(oggiIso())

  const [caricamento, setCaricamento] = useState(true)
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const fondo = useRef<HTMLDivElement>(null)

  const conNote = useMemo(() => new Set(mesiConNote), [mesiConNote])

  const [anno, numeroMese] = daChiave(mese)
  const da = primoDelMese(anno, numeroMese)
  const a = ultimoDelMese(anno, numeroMese)

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
        const n = await caricaNote(canale, da, a)
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
  }, [canale, da, a])

  // Aprendo un canale si finisce in fondo, sull'ultimo messaggio.
  useEffect(() => {
    fondo.current?.scrollIntoView({ block: 'end' })
  }, [note])

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
    if (testo === '' || invio) return

    setInvio(true)
    setErrore(null)
    try {
      const creata = await creaNota(canale, dataNota, testo)
      setBozza('')

      const meseNota = creata.data.slice(0, 7)
      setMesiConNote((p) => (p.includes(meseNota) ? p : [...p, meseNota]))

      // Se la data scelta cade in un altro mese, si va a vedere lì.
      if (meseNota !== mese) cambiaMese(meseNota)
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

  const vocecanale = CANALI.find((c) => c.canale === canale)

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

          {/* Su telefono i canali diventano una fila scorrevole. */}
          <nav className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
            {CANALI.map((c) => (
              <button
                key={c.canale}
                onClick={() => setCanale(c.canale)}
                aria-pressed={canale === c.canale}
                className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-left text-sm transition-colors md:w-full ${
                  canale === c.canale
                    ? 'bg-accento/15 text-accento'
                    : 'text-testo-soft hover:bg-superficie hover:text-testo'
                }`}
              >
                <span className="text-testo-soft/60">#</span> {c.etichetta}
              </button>
            ))}
          </nav>
        </aside>

        {/* --- Messaggi ---------------------------------------------------- */}
        <div className="min-w-0 flex-1 rounded-card border border-bordo bg-superficie">
          <header className="border-b border-bordo px-4 py-2">
            <h2 className="text-sm font-medium text-testo">
              <span className="text-testo-soft/60">#</span> {vocecanale?.etichetta}
            </h2>
            <p className="text-xs text-testo-soft">{vocecanale?.descrizione}</p>
          </header>

          {errore && (
            <p
              role="alert"
              className="m-3 rounded-md border border-negativo/40 bg-negativo/10 px-3 py-2 text-sm text-negativo"
            >
              {errore}
            </p>
          )}

          <div className="max-h-[55vh] min-h-64 overflow-y-auto p-2">
            {caricamento ? (
              <p className="p-4 text-sm text-testo-soft">Caricamento…</p>
            ) : note.length === 0 ? (
              <p className="p-8 text-center text-sm text-testo-soft">
                Niente in questo canale per {etichettaChiave(mese).toLowerCase()}.
              </p>
            ) : (
              perGiorno.map(([giorno, delGiorno]) => (
                <section key={giorno}>
                  <div className="my-3 flex items-center gap-3">
                    <span className="h-px flex-1 bg-bordo" />
                    <span className="rounded-full border border-bordo px-3 py-0.5 text-[11px] capitalize text-testo">
                      {formattaDataEstesa(giorno)}
                    </span>
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
              placeholder={`Scrivi in #${vocecanale?.etichetta ?? ''}. Incolla i link di TradingView e diventano immagini.`}
              className="w-full rounded-md border border-bordo bg-sfondo px-3 py-2 text-sm text-testo placeholder:text-testo-soft/60"
            />

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-testo-soft">
                Data
                <input
                  type="date"
                  value={dataNota}
                  onChange={(e) => setDataNota(e.target.value)}
                  className="num rounded border border-bordo bg-sfondo px-2 py-1 text-sm text-testo"
                />
              </label>

              <span className="hidden text-[11px] text-testo-soft sm:inline">
                Ctrl+Invio per inviare
              </span>

              <button
                onClick={() => void invia()}
                disabled={invio || bozza.trim() === ''}
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
