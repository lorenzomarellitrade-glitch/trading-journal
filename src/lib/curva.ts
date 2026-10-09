/**
 * Geometria delle curve della Home, dalla curva del P&L alle micro-curve dei
 * riquadri: da una serie di valori ai punti di una polilinea SVG. Separata
 * dai componenti per poterla testare senza DOM.
 */

export interface GeometriaCurva {
  /** Attributo `points` della polilinea */
  punti: string
  /** Coordinate di ogni punto, nello stesso ordine della serie disegnata */
  coordinate: { x: number; y: number }[]
  /** Ordinata della linea dello zero */
  zeroY: number
  /** Coordinate dell'ultimo punto */
  ultimo: { x: number; y: number }
  /** Valore finale: decide il colore della curva */
  valoreFinale: number
}

export interface OpzioniCurva {
  /** Spazio sopra e sotto perché la linea non tocchi i bordi */
  margine?: number
  /**
   * La curva del P&L parte da zero: il primo punto è il saldo prima del
   * periodo, e lo zero resta il riferimento. Le micro-curve no: mostrano solo
   * la forma della serie.
   */
  daZero?: boolean
}

/** Null senza valori: non c'è niente da disegnare. */
export function geometriaCurva(
  valori: number[],
  larghezza: number,
  altezza: number,
  { margine = 6, daZero = true }: OpzioniCurva = {},
): GeometriaCurva | null {
  if (valori.length === 0) return null

  const serie = daZero ? [0, ...valori] : valori
  const minimo = Math.min(...serie, ...(daZero ? [0] : []))
  const massimo = Math.max(...serie, ...(daZero ? [0] : []))
  // Serie piatta: si evita la divisione per zero e la linea sta a metà.
  const escursione = massimo - minimo || 1
  const passi = Math.max(1, serie.length - 1)

  const tondo = (n: number) => Math.round(n * 10) / 10
  const x = (i: number) => tondo(serie.length === 1 ? larghezza / 2 : (i / passi) * larghezza)
  const y = (v: number) =>
    tondo(
      massimo === minimo
        ? altezza / 2
        : margine + (altezza - 2 * margine) * (1 - (v - minimo) / escursione),
    )

  const coordinate = serie.map((v, i) => ({ x: x(i), y: y(v) }))

  return {
    punti: coordinate.map((c) => `${c.x},${c.y}`).join(' '),
    coordinate,
    zeroY: y(0),
    ultimo: coordinate[coordinate.length - 1],
    valoreFinale: serie[serie.length - 1],
  }
}

/**
 * L'indice del punto più vicino a una posizione orizzontale, espressa come
 * frazione della larghezza (0 = bordo sinistro, 1 = bordo destro). Serve al
 * tooltip della curva: il puntatore "aggancia" il giorno più vicino.
 */
export function indicePiuVicino(numeroPunti: number, frazione: number): number {
  if (numeroPunti <= 1) return 0
  const f = Math.min(1, Math.max(0, frazione))
  return Math.round(f * (numeroPunti - 1))
}
