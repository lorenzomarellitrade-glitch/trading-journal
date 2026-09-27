import { useEffect, useRef, useState } from 'react'
import { NOMI_MESI } from '../lib/date'

/**
 * Scelta del mese come su un calendario: si sceglie l'anno con le frecce e il
 * mese da una griglia di dodici.
 *
 * Meglio di una tendina lunga: gli anni non si accumulano in un elenco da
 * scorrere, e si vede subito quali mesi contengono qualcosa.
 */

/** Chiave di un mese, nella forma 'YYYY-MM'. */
export function chiaveMese(anno: number, mese: number): string {
  return `${anno}-${String(mese + 1).padStart(2, '0')}`
}

export function daChiave(chiave: string): [anno: number, mese: number] {
  const [anno, mese] = chiave.split('-').map(Number)
  return [anno, mese - 1]
}

export function etichettaChiave(chiave: string): string {
  const [anno, mese] = daChiave(chiave)
  return `${NOMI_MESI[mese]} ${anno}`
}

export default function SelettoreMese({
  mese,
  mesiConNote,
  onChange,
}: {
  mese: string
  /** Mesi che contengono già qualcosa, segnati con un pallino */
  mesiConNote: Set<string>
  onChange: (chiave: string) => void
}) {
  const [aperto, setAperto] = useState(false)
  const [annoVisibile, setAnnoVisibile] = useState(() => daChiave(mese)[0])
  const contenitore = useRef<HTMLDivElement>(null)

  const [annoScelto, meseScelto] = daChiave(mese)

  // Un clic fuori o Esc chiudono il pannello.
  useEffect(() => {
    if (!aperto) return

    const fuori = (e: MouseEvent) => {
      if (!contenitore.current?.contains(e.target as Node)) setAperto(false)
    }
    const tasto = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAperto(false)
    }

    document.addEventListener('mousedown', fuori)
    document.addEventListener('keydown', tasto)
    return () => {
      document.removeEventListener('mousedown', fuori)
      document.removeEventListener('keydown', tasto)
    }
  }, [aperto])

  function apri() {
    // Riaprendo si riparte sempre dall'anno del mese selezionato.
    setAnnoVisibile(annoScelto)
    setAperto((p) => !p)
  }

  return (
    <div ref={contenitore} className="relative flex-1">
      <button
        onClick={apri}
        aria-expanded={aperto}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-bordo bg-superficie px-2.5 py-2 text-sm text-testo transition-colors hover:border-accento"
      >
        {etichettaChiave(mese)}
        <span aria-hidden="true" className="text-testo-soft">
          ▾
        </span>
      </button>

      {aperto && (
        <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-card border border-bordo bg-superficie p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <button
              onClick={() => setAnnoVisibile((a) => a - 1)}
              aria-label="Anno precedente"
              className="rounded-md border border-bordo px-2 py-1 text-testo-soft transition-colors hover:text-testo"
            >
              ‹
            </button>
            <span className="num text-sm font-medium">{annoVisibile}</span>
            <button
              onClick={() => setAnnoVisibile((a) => a + 1)}
              aria-label="Anno successivo"
              className="rounded-md border border-bordo px-2 py-1 text-testo-soft transition-colors hover:text-testo"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1">
            {NOMI_MESI.map((nome, i) => {
              const chiave = chiaveMese(annoVisibile, i)
              const selezionato = annoVisibile === annoScelto && i === meseScelto
              const pieno = mesiConNote.has(chiave)

              return (
                <button
                  key={nome}
                  onClick={() => {
                    onChange(chiave)
                    setAperto(false)
                  }}
                  className={`relative rounded-md px-2 py-2 text-xs transition-colors ${
                    selezionato
                      ? 'bg-accento/20 text-accento'
                      : 'text-testo-soft hover:bg-sfondo hover:text-testo'
                  }`}
                >
                  {nome.slice(0, 3)}
                  {/* Il pallino segnala i mesi in cui c'è già qualcosa scritto. */}
                  {pieno && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accento"
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
