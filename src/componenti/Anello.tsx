import { useEffect, useState, type ReactNode } from 'react'
import { DURATA_MS } from '../lib/animazione'
import { TOKEN } from '../lib/colori'
import { useMovimentoRidotto } from './useAnimazione'

/**
 * Anello di avanzamento con un valore al centro.
 *
 * I colori passano da `style` e non dagli attributi SVG: `colore` è di norma
 * un riferimento a un token (`var(--color-…)`), che negli attributi di
 * presentazione non tutti i browser risolvono.
 *
 * Usato sia per i punteggi delle statistiche sia per gli obiettivi dei conti:
 * un solo disegno, così le due schermate restano coerenti.
 *
 * All'apertura l'arco si riempie da zero in DURATA_MS; con movimento ridotto
 * compare subito pieno fino alla sua quota.
 */

const RAGGIO = 42
const CIRCONFERENZA = 2 * Math.PI * RAGGIO

const MISURE = {
  piccolo: { classe: 'h-16 w-16', spessore: 10 },
  grande: { classe: 'h-24 w-24', spessore: 8 },
} as const

export default function Anello({
  quota,
  colore,
  dimensione = 'piccolo',
  children,
}: {
  /** Da 0 a 1; oltre 1 l'anello resta pieno */
  quota: number
  colore: string
  dimensione?: keyof typeof MISURE
  /** Cosa mostrare al centro */
  children: ReactNode
}) {
  const misura = MISURE[dimensione]
  const frazione = Math.min(1, Math.max(0, quota))
  const ridotto = useMovimentoRidotto()
  // Si parte da zero e al fotogramma dopo si va alla quota vera: la
  // transizione CSS sullo stroke-dasharray fa il resto.
  const [mostrata, setMostrata] = useState(ridotto ? frazione : 0)

  useEffect(() => {
    if (ridotto) {
      setMostrata(frazione)
      return
    }
    const f = requestAnimationFrame(() => setMostrata(frazione))
    return () => cancelAnimationFrame(f)
  }, [frazione, ridotto])

  return (
    <div className={`relative ${misura.classe}`}>
      {/* -rotate-90 fa partire l'anello dall'alto invece che da destra */}
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle
          cx="50"
          cy="50"
          r={RAGGIO}
          fill="none"
          style={{ stroke: TOKEN.bordo }}
          strokeWidth={misura.spessore}
        />
        {frazione > 0 && (
          <circle
            cx="50"
            cy="50"
            r={RAGGIO}
            fill="none"
            style={{
              stroke: colore,
              strokeDasharray: `${mostrata * CIRCONFERENZA} ${CIRCONFERENZA}`,
              transition: ridotto ? undefined : `stroke-dasharray ${DURATA_MS}ms ease-out`,
            }}
            strokeWidth={misura.spessore}
            strokeLinecap="round"
          />
        )}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-none">
        {children}
      </div>
    </div>
  )
}
