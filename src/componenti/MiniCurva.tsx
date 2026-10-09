import { useId } from 'react'
import { TOKEN } from '../lib/colori'
import { geometriaCurva } from '../lib/curva'
import { formattaData } from '../lib/formato'

/**
 * Curva del P&L cumulato, senza assi: serve a vedere l'andamento a colpo
 * d'occhio, il dettaglio sta in Statistiche.
 *
 * È SVG scritto a mano e non Recharts: la Home è la prima pagina che si apre,
 * e Recharts da solo pesa più di tutto il resto dell'app.
 */

const LARGHEZZA = 600
const ALTEZZA = 130

export default function MiniCurva({
  punti,
}: {
  /** Valori cumulati in ordine di data, già nell'unità scelta ($ o %) */
  punti: { data: string; valore: number }[]
}) {
  const idSfumatura = useId()

  if (punti.length < 2) {
    return (
      <div className="flex h-full min-h-28 items-center justify-center text-xs text-testo-soft">
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

  return (
    <figure className="flex h-full min-h-28 flex-col">
      <svg
        viewBox={`0 0 ${LARGHEZZA} ${ALTEZZA}`}
        preserveAspectRatio="none"
        className="w-full flex-1"
        role="img"
        aria-label="Andamento del P&L cumulato nel periodo"
      >
        <defs>
          <linearGradient id={idSfumatura} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: tinta, stopOpacity: 0.22 }} />
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

      <figcaption className="num mt-1 flex justify-between text-[10px] text-testo-soft">
        <span>{formattaData(punti[0].data)}</span>
        <span>{formattaData(punti[punti.length - 1].data)}</span>
      </figcaption>
    </figure>
  )
}
