import { TOKEN } from '../lib/colori'
import { geometriaCurva } from '../lib/curva'

/**
 * Micro-curva da riquadro: «un grafico piccolo, intenso, semplice, della
 * dimensione di una parola» (Tufte). Mostra solo la forma dell'andamento,
 * sotto il numero che spiega: il valore preciso resta quello del riquadro.
 */

const LARGHEZZA = 120
const ALTEZZA = 28

export default function MicroCurva({
  valori,
  descrizione,
}: {
  valori: number[]
  /** Testo per chi usa un lettore di schermo, es. "win rate trade dopo trade" */
  descrizione: string
}) {
  // Con meno di tre punti non c'è una forma da leggere: si lascia lo spazio
  // vuoto per tenere allineati i riquadri.
  if (valori.length < 3) return <div className="h-7" aria-hidden="true" />

  const g = geometriaCurva(valori, LARGHEZZA, ALTEZZA, { margine: 3, daZero: false })!

  return (
    <svg
      viewBox={`0 0 ${LARGHEZZA} ${ALTEZZA}`}
      preserveAspectRatio="none"
      className="h-7 w-full"
      role="img"
      aria-label={`Andamento: ${descrizione}`}
    >
      <polyline
        points={g.punti}
        fill="none"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        style={{ stroke: TOKEN.accento, strokeOpacity: 0.85 }}
      />
    </svg>
  )
}
