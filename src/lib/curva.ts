/**
 * Geometria della mini-curva della Home: da una serie di valori ai punti di
 * una polilinea SVG. Separata dal componente per poterla testare senza DOM.
 *
 * La curva parte sempre da zero: il primo punto è il saldo prima del periodo,
 * e la linea dello zero resta il riferimento per capire se si è sopra o sotto.
 */

export interface GeometriaCurva {
  /** Attributo `points` della polilinea */
  punti: string
  /** Ordinata della linea dello zero */
  zeroY: number
  /** Coordinate dell'ultimo punto, per il pallino finale */
  ultimo: { x: number; y: number }
  /** Valore finale: decide il colore della curva */
  valoreFinale: number
}

/**
 * Null con meno di un valore: senza dati non c'è niente da disegnare.
 * `margine` lascia spazio sopra e sotto perché la linea non tocchi i bordi.
 */
export function geometriaCurva(
  valori: number[],
  larghezza: number,
  altezza: number,
  margine = 6,
): GeometriaCurva | null {
  if (valori.length === 0) return null

  const serie = [0, ...valori]
  const minimo = Math.min(...serie)
  const massimo = Math.max(...serie)
  // Serie piatta: si evita la divisione per zero e la linea sta a metà.
  const escursione = massimo - minimo || 1

  const x = (i: number) => (i / (serie.length - 1)) * larghezza
  const y = (v: number) => margine + (altezza - 2 * margine) * (1 - (v - minimo) / escursione)
  const tondo = (n: number) => Math.round(n * 10) / 10

  return {
    punti: serie.map((v, i) => `${tondo(x(i))},${tondo(y(v))}`).join(' '),
    zeroY: tondo(y(0)),
    ultimo: { x: tondo(x(serie.length - 1)), y: tondo(y(serie[serie.length - 1])) },
    valoreFinale: serie[serie.length - 1],
  }
}
