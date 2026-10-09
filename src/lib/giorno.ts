import { riepiloga } from './aggregazioni'
import { CONFERME_TOTALI, contaConferme } from './calcoli'
import type { Account, TradeCompleto } from './tipi'

/**
 * Il riassunto dei trade di una giornata, come lo mostrano le pagine che
 * parlano di un giorno: calendario, journal, diario, settimana.
 */
export interface RiassuntoGiorno {
  /** Trade della giornata, anche non conclusi */
  numeroTrade: number
  conclusi: number
  /** null senza trade conclusi */
  pnlUsd: number | null
  pnlPercent: number | null
  /** Quanti trade avevano tutte e cinque le conferme */
  processoCompleto: number
}

export function riassuntoGiorno(trades: TradeCompleto[], account: Account[]): RiassuntoGiorno {
  const r = riepiloga(trades, account)
  return {
    numeroTrade: trades.length,
    conclusi: r.numeroChiusi,
    pnlUsd: r.numeroChiusi > 0 ? r.pnlUsd : null,
    pnlPercent: r.numeroChiusi > 0 ? r.pnlPercent : null,
    processoCompleto: trades.filter((t) => contaConferme(t) === CONFERME_TOTALI).length,
  }
}

/**
 * Il riassunto in una riga di testo, per i campi scritti a mano del riepilogo
 * settimanale: "2 trade, 1 a 5/5". Il P&L va nel campo Risultato, a parte.
 */
export function testoOperazioni(r: RiassuntoGiorno): string {
  if (r.numeroTrade === 0) return 'Nessun trade'
  const trade = r.numeroTrade === 1 ? '1 trade' : `${r.numeroTrade} trade`
  return `${trade}, ${r.processoCompleto} a ${CONFERME_TOTALI}/${CONFERME_TOTALI}`
}

/**
 * I campi del riepilogo settimanale ricavati dai trade del giorno. Riempie
 * solo quelli ancora vuoti: quello che è già stato scritto a mano resta.
 * `risultato` arriva già formattato, così il testo è quello che si vede.
 */
export function compilaRigaSettimana(
  riga: { operazioni: string; risultato: string },
  r: RiassuntoGiorno,
  risultato: string | null,
): { operazioni?: string; risultato?: string } {
  const patch: { operazioni?: string; risultato?: string } = {}
  if (riga.operazioni.trim() === '') patch.operazioni = testoOperazioni(r)
  if (riga.risultato.trim() === '' && risultato != null) patch.risultato = risultato
  return patch
}
