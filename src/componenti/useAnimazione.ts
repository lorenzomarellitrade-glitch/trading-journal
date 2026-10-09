import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { DURATA_MS, valoreAnimato } from '../lib/animazione'

/**
 * Le micro-animazioni della Home: brevi, solo per orientare, e spente del
 * tutto quando il sistema chiede di ridurre il movimento.
 */

const QUERY = '(prefers-reduced-motion: reduce)'

function iscrivi(avvisa: () => void): () => void {
  const m = window.matchMedia(QUERY)
  m.addEventListener('change', avvisa)
  return () => m.removeEventListener('change', avvisa)
}

/** True se l'utente ha chiesto al sistema di ridurre le animazioni. */
export function useMovimentoRidotto(): boolean {
  return useSyncExternalStore(iscrivi, () => window.matchMedia(QUERY).matches)
}

/**
 * Un numero che "conta" fino al valore indicato: da zero all'apertura, dal
 * valore precedente quando cambia un filtro. Con movimento ridotto, o con
 * valore null, restituisce subito il valore finale.
 */
export function useConteggio(valore: number | null): number | null {
  const ridotto = useMovimentoRidotto()
  const [mostrato, setMostrato] = useState<number | null>(ridotto ? valore : 0)
  const ultimo = useRef<number>(0)

  useEffect(() => {
    if (valore == null || ridotto) {
      setMostrato(valore)
      if (valore != null) ultimo.current = valore
      return
    }

    const partenza = ultimo.current
    const inizio = performance.now()
    let fotogramma = 0

    const passo = (ora: number) => {
      const v = valoreAnimato(partenza, valore, ora - inizio)
      ultimo.current = v
      setMostrato(v)
      if (ora - inizio < DURATA_MS) fotogramma = requestAnimationFrame(passo)
    }
    fotogramma = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(fotogramma)
  }, [valore, ridotto])

  return mostrato
}
