import { immagineSnapshot } from './tradingview'

/**
 * Trasforma il testo di una nota nei pezzi che l'interfaccia deve disegnare.
 *
 * I link a TradingView e quelli che puntano direttamente a un'immagine
 * diventano immagini; gli altri restano link cliccabili; il resto è testo.
 */

export type Segmento =
  | { tipo: 'testo'; valore: string }
  | { tipo: 'link'; valore: string }
  | { tipo: 'immagine'; valore: string; sorgente: string }

/** Riconosce un URL http/https dentro il testo. */
const URL_NEL_TESTO = /https?:\/\/[^\s<>"]+/g

/** Estensioni che indicano un'immagine servita direttamente. */
const ESTENSIONI_IMMAGINE = /\.(png|jpe?g|gif|webp|avif)$/i

/** L'indirizzo dell'immagine da mostrare, oppure null se il link non lo è. */
export function sorgenteImmagine(link: string): string | null {
  const daTradingView = immagineSnapshot(link)
  if (daTradingView) return daTradingView

  try {
    // Si guarda solo il percorso: i parametri dopo il ? non contano.
    const url = new URL(link)
    if (ESTENSIONI_IMMAGINE.test(url.pathname)) return link
  } catch {
    return null
  }

  return null
}

export function segmentiMessaggio(testo: string): Segmento[] {
  const segmenti: Segmento[] = []
  let posizione = 0

  for (const trovato of testo.matchAll(URL_NEL_TESTO)) {
    const link = trovato[0]
    const inizio = trovato.index

    if (inizio > posizione) {
      segmenti.push({ tipo: 'testo', valore: testo.slice(posizione, inizio) })
    }

    const sorgente = sorgenteImmagine(link)
    segmenti.push(
      sorgente ? { tipo: 'immagine', valore: link, sorgente } : { tipo: 'link', valore: link },
    )

    posizione = inizio + link.length
  }

  if (posizione < testo.length) {
    segmenti.push({ tipo: 'testo', valore: testo.slice(posizione) })
  }

  return segmenti
}
