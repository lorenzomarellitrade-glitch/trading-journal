import { perditaPercent, riepiloga } from './aggregazioni'
import type { Account, TradeCompleto } from './tipi'

/**
 * Stato di un conto rispetto alle regole della sua prop.
 *
 * Il calcolo è **per singolo conto**: la prop verifica un conto alla volta, e
 * un conto in utile non compensa l'altro in perdita.
 *
 * Target e drawdown sono percentuali del **saldo iniziale**: è il modello del
 * drawdown statico, quello in cui il limite è una soglia fissa sotto il saldo
 * di partenza. Se una prop usasse il drawdown dinamico, che si alza seguendo i
 * massimi, questo calcolo andrebbe cambiato.
 */

export interface StatoConto {
  account: Account
  pnlUsd: number
  /** Rendimento del conto dall'inizio, in % del saldo iniziale */
  pnlPercent: number

  /** null quando il conto non ha un obiettivo, es. un conto reale personale */
  targetPercent: number | null
  /** Quota del target raggiunta, da 0 a 1 e oltre. null senza target */
  quotaTarget: number | null

  /** null quando il conto non ha un limite di perdita complessivo */
  drawdownPercent: number | null
  /** Quanto si può ancora perdere prima del limite, in punti percentuali */
  marginePercent: number | null
  /** Quota del margine già consumata, da 0 a 1 e oltre */
  quotaDrawdown: number | null

  /** Perdita netta di oggi su questo conto, come percentuale positiva */
  perditaOggiPercent: number
  /** Limite di perdita giornaliero della prop; null se il conto non ne ha */
  limiteGiornalieroPercent: number | null
  /** Quota del limite giornaliero consumata, da 0 a 1 e oltre */
  quotaGiornaliera: number | null
}

/**
 * Stato di ciascun conto indicato, nell'ordine ricevuto.
 * Considera tutti i trade passati: l'obiettivo di una fase si misura da quando
 * il conto è nato, non dal mese che si sta guardando.
 */
export function statoConti(
  trades: TradeCompleto[],
  account: Account[],
  oggi: string,
): StatoConto[] {
  return account.map((a) => {
    const r = riepiloga(trades, [a])
    // pnlPercent è null se il conto non ha ancora operato: vale 0, non "ignoto".
    const pnlPercent = r.pnlPercent ?? 0

    const targetPercent = a.target_profitto_percent
    const drawdownPercent = a.drawdown_massimo_percent
    const limiteGiornalieroPercent = a.drawdown_giornaliero_percent
    const perditaOggiPercent = perditaPercent(trades, a, oggi, oggi)

    // In utile il margine cresce: il pavimento resta fisso sotto il saldo iniziale.
    const marginePercent = drawdownPercent == null ? null : drawdownPercent + pnlPercent

    return {
      account: a,
      pnlUsd: r.pnlUsd,
      pnlPercent,
      targetPercent,
      quotaTarget:
        targetPercent == null || targetPercent <= 0
          ? null
          : Math.max(0, pnlPercent) / targetPercent,
      drawdownPercent,
      marginePercent,
      quotaDrawdown:
        drawdownPercent == null || drawdownPercent <= 0
          ? null
          : Math.max(0, -pnlPercent) / drawdownPercent,
      perditaOggiPercent,
      limiteGiornalieroPercent,
      quotaGiornaliera:
        limiteGiornalieroPercent == null || limiteGiornalieroPercent <= 0
          ? null
          : perditaOggiPercent / limiteGiornalieroPercent,
    }
  })
}

/** True se almeno un conto ha qualcosa da mostrare in termini di obiettivi. */
export function qualcheObiettivo(stati: StatoConto[]): boolean {
  return stati.some(
    (s) =>
      s.targetPercent != null || s.drawdownPercent != null || s.limiteGiornalieroPercent != null,
  )
}
