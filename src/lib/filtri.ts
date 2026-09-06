import { metricheTrade } from './aggregazioni'
import { CONFERME_TOTALI, contaConferme } from './calcoli'
import type { Account, Esito, Finestra, TradeCompleto } from './tipi'

/** Filtri della lista trade. `null` significa "nessun vincolo". */
export interface Filtri {
  da: string | null
  a: string | null
  esito: Esito | null
  finestra: Finestra | null
  /** Mostra solo i trade con tutte e 5 le conferme */
  soloProcessoCompleto: boolean
}

export const FILTRI_VUOTI: Filtri = {
  da: null,
  a: null,
  esito: null,
  finestra: null,
  soloProcessoCompleto: false,
}

/**
 * L'esito si cerca sulle executions e non sull'esito aggregato, così resta
 * possibile filtrare anche gli 'annullato', che l'aggregazione esclude.
 */
function haEsito(trade: TradeCompleto, account: Account[], esito: Esito): boolean {
  const ids = new Set(account.map((a) => a.id))
  return (trade.executions ?? []).some((e) => ids.has(e.account_id) && e.esito === esito)
}

export function filtraTrades(
  trades: TradeCompleto[],
  account: Account[],
  filtri: Filtri,
): TradeCompleto[] {
  const ids = new Set(account.map((a) => a.id))

  return trades.filter((t) => {
    if (filtri.da && t.data < filtri.da) return false
    if (filtri.a && t.data > filtri.a) return false
    if (filtri.finestra && t.finestra !== filtri.finestra) return false
    if (filtri.esito && !haEsito(t, account, filtri.esito)) return false
    if (filtri.soloProcessoCompleto && contaConferme(t) < CONFERME_TOTALI) return false

    // Con un account specifico selezionato, i trade che non lo toccano
    // non hanno nulla da mostrare in tabella.
    return (t.executions ?? []).some((e) => ids.has(e.account_id))
  })
}

export type Colonna =
  | 'data'
  | 'direzione'
  | 'finestra'
  | 'conferme'
  | 'esito'
  | 'r'
  | 'pnl'
  | 'pnlPercent'

export type Verso = 'asc' | 'desc'

/** Valore su cui ordinare. `null` finisce sempre in fondo, in entrambi i versi. */
function chiave(t: TradeCompleto, account: Account[], colonna: Colonna): string | number | null {
  switch (colonna) {
    case 'data':
      // La data ISO si ordina bene come stringa; l'ora spareggia i trade
      // dello stesso giorno.
      return `${t.data} ${t.ora_entrata ?? '00:00:00'}`
    case 'direzione':
      return t.direzione
    case 'finestra':
      return t.finestra
    case 'conferme':
      return contaConferme(t)
    case 'esito':
      return metricheTrade(t, account).esito
    case 'r':
      return metricheTrade(t, account).rMedio
    case 'pnl':
      return metricheTrade(t, account).pnlUsd
    case 'pnlPercent':
      return metricheTrade(t, account).pnlPercent
  }
}

export function ordinaTrades(
  trades: TradeCompleto[],
  account: Account[],
  colonna: Colonna,
  verso: Verso,
): TradeCompleto[] {
  const segno = verso === 'asc' ? 1 : -1

  return [...trades].sort((x, y) => {
    const a = chiave(x, account, colonna)
    const b = chiave(y, account, colonna)

    // I valori mancanti restano in coda comunque si ordini: un trade senza
    // esito non deve finire in cima solo perché è "il più piccolo".
    if (a == null && b == null) return 0
    if (a == null) return 1
    if (b == null) return -1

    if (typeof a === 'number' && typeof b === 'number') return (a - b) * segno
    return String(a).localeCompare(String(b), 'it') * segno
  })
}
