/**
 * Link agli snapshot di TradingView.
 *
 * Il pulsante "Copia link dell'immagine" di TradingView produce una pagina del
 * tipo https://www.tradingview.com/x/AbCd1234/, che contiene l'immagine ma non
 * è un'immagine. Il file vero sta su un indirizzo prevedibile:
 *
 *   https://s3.tradingview.com/snapshots/a/AbCd1234.png
 *
 * dove la cartella è la prima lettera dell'identificativo, in minuscolo.
 * Così si mostra lo screenshot nel journal senza caricare file da nessuna parte.
 */

import type { Trade } from './tipi'

const ID_VALIDO = /^[A-Za-z0-9]+$/

function analizza(link: string): URL | null {
  try {
    return new URL(link.trim())
  } catch {
    return null
  }
}

function eDiTradingView(url: URL): boolean {
  const host = url.hostname.toLowerCase()
  return host === 'tradingview.com' || host.endsWith('.tradingview.com')
}

/**
 * Indirizzo diretto dell'immagine di uno snapshot, oppure `null` se il link
 * non è uno snapshot (ad esempio il link a un grafico interattivo, che non ha
 * un'immagine statica da mostrare).
 */
export function immagineSnapshot(link: string | null | undefined): string | null {
  if (!link) return null
  const url = analizza(link)
  if (!url || !eDiTradingView(url)) return null

  const segmenti = url.pathname.split('/').filter(Boolean)

  // Già un link diretto all'immagine: s3.tradingview.com/snapshots/a/AbCd1234.png
  if (segmenti[0] === 'snapshots' && segmenti.at(-1)?.toLowerCase().endsWith('.png')) {
    return `https://${url.hostname}${url.pathname}`
  }

  // Pagina dello snapshot: tradingview.com/x/AbCd1234/ (anche con sottodominio di lingua)
  if (segmenti[0] === 'x' && segmenti[1] && ID_VALIDO.test(segmenti[1])) {
    const id = segmenti[1]
    return `https://s3.tradingview.com/snapshots/${id[0].toLowerCase()}/${id}.png`
  }

  return null
}

/**
 * Ordine di preferenza per l'anteprima di un trade nella griglia.
 * Prima i timeframe dell'esecuzione, dove si vede l'entrata; i timeframe alti
 * raccontano il contesto ma in miniatura diventano illeggibili.
 */
const ORDINE_ANTEPRIMA = ['link_m15', 'link_m5', 'link_h1', 'link_h4', 'link_daily'] as const

/** Il link da usare come copertina del trade, o `null` se non ce ne sono. */
export function linkAnteprima(trade: Trade): string | null {
  for (const campo of ORDINE_ANTEPRIMA) {
    const link = trade[campo]
    if (link && immagineSnapshot(link)) return link
  }
  return null
}
