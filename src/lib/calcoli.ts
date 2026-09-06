import type { Direzione, Trade } from './tipi'

/**
 * Formule di calcolo del journal. Funzioni pure, nessun accesso al database,
 * nessuno stato: sono l'unico posto in cui esistono queste formule.
 * I componenti le importano, non le riscrivono.
 *
 * Convenzione sui valori mancanti: ogni funzione restituisce `null` quando i
 * dati non bastano, invece di 0 o NaN. Un trade compilato a metà deve mostrare
 * un campo vuoto, non uno zero che sembra un risultato reale.
 */

/** XAUUSD: 1 lotto = 100 once, quindi 1 dollaro di movimento = 100 USD per lotto. */
export const ONCE_PER_LOTTO = 100

/** True solo per numeri utilizzabili in un calcolo (esclude null, undefined, NaN, Infinity). */
function valido(n: number | null | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n)
}

/**
 * Capitale a rischio se lo stop loss viene colpito.
 * rischio_usd = |entry − stop_loss| × 100 × lotti
 */
export function rischioUsd(
  entry: number | null,
  stopLoss: number | null,
  lotti: number | null,
): number | null {
  if (!valido(entry) || !valido(stopLoss) || !valido(lotti)) return null
  return Math.abs(entry - stopLoss) * ONCE_PER_LOTTO * lotti
}

/**
 * Rapporto rischio/rendimento pianificato al momento dell'entrata.
 * rr_pianificato = |take_profit − entry| / |entry − stop_loss|
 *
 * Con stop loss coincidente con l'entry il rapporto non è definito: `null`.
 */
export function rrPianificato(
  entry: number | null,
  stopLoss: number | null,
  takeProfit: number | null,
): number | null {
  if (!valido(entry) || !valido(stopLoss) || !valido(takeProfit)) return null
  const distanzaStop = Math.abs(entry - stopLoss)
  if (distanzaStop === 0) return null
  return Math.abs(takeProfit - entry) / distanzaStop
}

/**
 * Profitto o perdita realizzato.
 * pnl_usd = (exit − entry) × 100 × lotti × (direzione === 'long' ? 1 : −1)
 *
 * Sullo short il segno si inverte: il prezzo che scende è un guadagno.
 */
export function pnlUsd(
  entry: number | null,
  exit: number | null,
  lotti: number | null,
  direzione: Direzione | null,
): number | null {
  if (!valido(entry) || !valido(exit) || !valido(lotti) || !direzione) return null
  const segno = direzione === 'long' ? 1 : -1
  return (exit - entry) * ONCE_PER_LOTTO * lotti * segno
}

/**
 * Risultato espresso in multipli del rischio iniziale.
 * r_realizzato = pnl_usd / rischio_usd
 *
 * Con rischio nullo (stop sull'entry, oppure zero lotti) l'R non è definito.
 */
export function rRealizzato(pnl: number | null, rischio: number | null): number | null {
  if (!valido(pnl) || !valido(rischio) || rischio === 0) return null
  return pnl / rischio
}

/**
 * Converte un importo in percentuale del capitale di partenza dell'account.
 * Usata sia per pnl_percent sia per rischio_percent: è la stessa operazione.
 */
export function inPercentuale(
  valore: number | null,
  saldoIniziale: number | null,
): number | null {
  if (!valido(valore) || !valido(saldoIniziale) || saldoIniziale === 0) return null
  return (valore / saldoIniziale) * 100
}

// ---------------------------------------------------------------------------
// Calcolo aggregato
// ---------------------------------------------------------------------------

/** I prezzi e i lotti di una execution, nella forma minima che serve ai calcoli. */
export interface DatiExecution {
  entry: number | null
  stop_loss: number | null
  take_profit: number | null
  exit: number | null
  lotti: number | null
}

/** Tutti i valori derivati di una singola execution. */
export interface MetricheExecution {
  rischioUsd: number | null
  rischioPercent: number | null
  rrPianificato: number | null
  pnlUsd: number | null
  pnlPercent: number | null
  rRealizzato: number | null
}

/**
 * Calcola in un colpo solo tutte le metriche di una execution.
 * È la funzione che usano il form (riquadro riepilogativo in tempo reale),
 * la lista trade e le statistiche: un solo punto di verità.
 */
export function calcolaMetriche(
  dati: DatiExecution,
  direzione: Direzione | null,
  saldoIniziale: number | null,
): MetricheExecution {
  const rischio = rischioUsd(dati.entry, dati.stop_loss, dati.lotti)
  const pnl = pnlUsd(dati.entry, dati.exit, dati.lotti, direzione)

  return {
    rischioUsd: rischio,
    rischioPercent: inPercentuale(rischio, saldoIniziale),
    rrPianificato: rrPianificato(dati.entry, dati.stop_loss, dati.take_profit),
    pnlUsd: pnl,
    pnlPercent: inPercentuale(pnl, saldoIniziale),
    rRealizzato: rRealizzato(pnl, rischio),
  }
}

// ---------------------------------------------------------------------------
// Checklist di processo
// ---------------------------------------------------------------------------

/** Numero totale di conferme previste dalla strategia. */
export const CONFERME_TOTALI = 5

/**
 * Quante delle 5 conferme erano presenti. Accetta un oggetto parziale così da
 * funzionare anche sulla bozza del form, prima che il trade sia salvato.
 */
export function contaConferme(trade: Partial<Trade>): number {
  return [
    trade.step1_analisi_multitf,
    trade.step2_zona_operativa,
    trade.step3_prezzo_in_zona,
    trade.step4_schematica,
    trade.step5_fallimento_rottura,
  ].filter(Boolean).length
}

/** True se il processo è stato rispettato integralmente (5 conferme su 5). */
export function processoCompleto(trade: Partial<Trade>): boolean {
  return contaConferme(trade) === CONFERME_TOTALI
}
