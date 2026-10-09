import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { TOKEN } from '../lib/colori'
import { geometriaCurva, indicePiuVicino } from '../lib/curva'
import { formattaData } from '../lib/formato'

/**
 * Curva del P&L cumulato della Home, senza assi. Passando col mouse, o con le
 * frecce da tastiera dopo averla selezionata, mostra data e valore del giorno
 * più vicino: si legge un giorno senza andare in Statistiche.
 *
 * È SVG scritto a mano e non Recharts: la Home è la prima pagina che si apre,
 * e Recharts da solo pesa più di tutto il resto dell'app.
 */

const LARGHEZZA = 600
const ALTEZZA = 180

export default function MiniCurva({
  punti,
  formatta,
}: {
  /** Valori cumulati in ordine di data, già nell'unità scelta ($ o %) */
  punti: { data: string; valore: number }[]
  /** Come mostrare un valore nel tooltip, col segno */
  formatta: (valore: number) => string
}) {
  const idSfumatura = useId()
  const area = useRef<HTMLDivElement>(null)
  /** Indice in `punti` del giorno evidenziato; null = nessuno */
  const [attivo, setAttivo] = useState<number | null>(null)

  if (punti.length < 2) {
    return (
      <div className="flex h-44 items-center justify-center text-xs text-testo-soft">
        Servono almeno due giornate per una curva.
      </div>
    )
  }

  const g = geometriaCurva(
    punti.map((p) => p.valore),
    LARGHEZZA,
    ALTEZZA,
  )!
  // Il colore segue il risultato finale del periodo, come il P&L accanto.
  const tinta = g.valoreFinale >= 0 ? TOKEN.positivo : TOKEN.negativo
  // coordinate[0] è il punto di partenza a zero: i giorni partono da 1.
  const coordinataDi = (i: number) => g.coordinate[i + 1]

  function suPuntatore(e: PointerEvent<HTMLDivElement>) {
    const r = area.current?.getBoundingClientRect()
    if (!r || r.width === 0) return
    const indice = indicePiuVicino(g.coordinate.length, (e.clientX - r.left) / r.width)
    setAttivo(Math.max(0, indice - 1))
  }

  function suTasto(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const passo = e.key === 'ArrowRight' ? 1 : -1
    setAttivo((a) => Math.min(punti.length - 1, Math.max(0, (a ?? punti.length - 1) + passo)))
  }

  const evidenziato = attivo == null ? null : { punto: punti[attivo], xy: coordinataDi(attivo) }
  const xPercento = evidenziato ? (evidenziato.xy.x / LARGHEZZA) * 100 : 0
  const yPercento = evidenziato ? (evidenziato.xy.y / ALTEZZA) * 100 : 0

  return (
    <figure className="flex flex-col">
      <div
        ref={area}
        tabIndex={0}
        role="img"
        aria-label="Andamento del P&L cumulato nel periodo. Usa le frecce per leggere i singoli giorni."
        onPointerMove={suPuntatore}
        onPointerLeave={() => setAttivo(null)}
        onKeyDown={suTasto}
        onBlur={() => setAttivo(null)}
        className="relative h-44 cursor-crosshair rounded-md outline-none focus-visible:ring-2 focus-visible:ring-accento/60"
      >
        <svg
          viewBox={`0 0 ${LARGHEZZA} ${ALTEZZA}`}
          preserveAspectRatio="none"
          className="h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={idSfumatura} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: tinta, stopOpacity: 0.24 }} />
              <stop offset="1" style={{ stopColor: tinta, stopOpacity: 0 }} />
            </linearGradient>
          </defs>

          {/* Lo zero: sopra si è in utile, sotto in perdita. */}
          <line
            x1="0"
            x2={LARGHEZZA}
            y1={g.zeroY}
            y2={g.zeroY}
            strokeDasharray="3 4"
            vectorEffect="non-scaling-stroke"
            style={{ stroke: TOKEN.testoSoft, strokeOpacity: 0.5 }}
          />
          <polygon
            points={`0,${g.zeroY} ${g.punti} ${LARGHEZZA},${g.zeroY}`}
            style={{ fill: `url(#${CSS.escape(idSfumatura)})` }}
          />
          <polyline
            points={g.punti}
            fill="none"
            strokeWidth={2}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            style={{ stroke: tinta }}
          />
        </svg>

        {/* Guida, pallino e tooltip stanno fuori dall'SVG: con
            preserveAspectRatio="none" un cerchio verrebbe schiacciato. */}
        {evidenziato && (
          <>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 w-px bg-testo-soft/40"
              style={{ left: `${xPercento}%` }}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-superficie"
              style={{ left: `${xPercento}%`, top: `${yPercento}%`, backgroundColor: tinta }}
            />
            <span
              role="status"
              className={`riquadro pointer-events-none absolute top-1 px-2.5 py-1.5 text-xs whitespace-nowrap ${
                xPercento > 60 ? '-translate-x-full -ml-2' : 'ml-2'
              }`}
              style={{ left: `${xPercento}%` }}
            >
              <span className="block text-testo-soft">{formattaData(evidenziato.punto.data)}</span>
              <span
                className={`num block font-medium ${
                  evidenziato.punto.valore > 0
                    ? 'text-positivo'
                    : evidenziato.punto.valore < 0
                      ? 'text-negativo'
                      : 'text-testo'
                }`}
              >
                {formatta(evidenziato.punto.valore)}
              </span>
            </span>
          </>
        )}
      </div>

      <figcaption className="num mt-1.5 flex justify-between text-[10px] text-testo-soft">
        <span>{formattaData(punti[0].data)}</span>
        <span>{formattaData(punti[punti.length - 1].data)}</span>
      </figcaption>
    </figure>
  )
}
