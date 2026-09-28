import type { Canale, Mercato } from './tipi'

/**
 * Struttura del journal emotivo: mercati, canali e coppie forex.
 *
 * Organizzato come le categorie di Discord: un gruppo per mercato con gli
 * stessi canali, più lo Stato mentale in comune — lo stato mentale è tuo, non
 * del mercato su cui stai operando.
 */

export interface VoceCanale {
  canale: Canale
  etichetta: string
  descrizione: string
}

/** I canali che ogni mercato ha, nell'ordine in cui compaiono. */
export const CANALI_MERCATO: VoceCanale[] = [
  { canale: 'visione', etichetta: 'Visione', descrizione: 'Bias e zone prima di operare' },
  { canale: 'tp', etichetta: 'TP', descrizione: 'Le operazioni andate a target' },
  { canale: 'stop', etichetta: 'Stop', descrizione: 'Le operazioni chiuse in stop' },
  { canale: 'be', etichetta: 'BE', descrizione: 'Le operazioni chiuse in pari' },
  { canale: 'miss', etichetta: 'Miss', descrizione: 'I setup visti ma non presi' },
]

export const STATO_MENTALE: VoceCanale = {
  canale: 'stato-mentale',
  etichetta: 'Stato mentale',
  descrizione: 'Come stavi, cosa hai provato, cosa hai imparato',
}

export const MERCATI: { mercato: Mercato; etichetta: string }[] = [
  { mercato: 'xauusd', etichetta: 'XAUUSD' },
  { mercato: 'forex', etichetta: 'Forex' },
]

/**
 * Le coppie forex osservate, raggruppate per valuta base come nella
 * watchlist. Per aggiungerne una basta inserirla nel gruppo giusto: il
 * database accetta qualunque coppia di sei lettere maiuscole.
 */
export const COPPIE_FOREX: { valuta: string; coppie: string[] }[] = [
  { valuta: 'EUR', coppie: ['EURAUD', 'EURCAD', 'EURGBP', 'EURJPY', 'EURUSD'] },
  { valuta: 'GBP', coppie: ['GBPAUD', 'GBPCAD', 'GBPCHF', 'GBPJPY', 'GBPNZD', 'GBPUSD'] },
  { valuta: 'USD', coppie: ['USDCAD', 'USDCHF', 'USDJPY'] },
  { valuta: 'AUD', coppie: ['AUDCAD', 'AUDJPY', 'AUDNZD', 'AUDUSD'] },
  { valuta: 'NZD', coppie: ['NZDJPY', 'NZDCAD', 'NZDUSD'] },
  { valuta: 'CAD', coppie: ['CADJPY'] },
]

/** Dove si trova l'utente nel journal: un mercato e un canale. */
export interface Posizione {
  /** null solo per lo Stato mentale */
  mercato: Mercato | null
  canale: Canale
}

export const POSIZIONE_INIZIALE: Posizione = { mercato: 'xauusd', canale: 'tp' }

/** I canali in cui ogni messaggio racconta un trade. */
const CANALI_TRADE: Canale[] = ['tp', 'stop', 'be', 'miss']

/** Se nella posizione indicata si può scegliere una coppia. */
export function usaCoppia(p: Posizione): boolean {
  return p.mercato === 'forex'
}

/**
 * Se la coppia è obbligatoria. Nei canali dei trade sì: un trade è sempre su
 * una coppia. In Visione no: a volte la visione riguarda una valuta intera.
 */
export function coppiaObbligatoria(p: Posizione): boolean {
  return p.mercato === 'forex' && CANALI_TRADE.includes(p.canale)
}

export function stessaPosizione(a: Posizione, b: Posizione): boolean {
  return a.mercato === b.mercato && a.canale === b.canale
}

/** Titolo leggibile di una posizione, es. "Forex · Stop". */
export function titoloPosizione(p: Posizione): string {
  const canale = [...CANALI_MERCATO, STATO_MENTALE].find((c) => c.canale === p.canale)
  const mercato = MERCATI.find((m) => m.mercato === p.mercato)
  return mercato ? `${mercato.etichetta} · ${canale?.etichetta ?? ''}` : (canale?.etichetta ?? '')
}

export function descrizionePosizione(p: Posizione): string {
  return [...CANALI_MERCATO, STATO_MENTALE].find((c) => c.canale === p.canale)?.descrizione ?? ''
}
