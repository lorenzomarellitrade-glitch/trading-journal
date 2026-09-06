import { calcolaMetriche } from './calcoli'
import { inizioSettimana } from './date'
import type { Account, Esito, TradeCompleto } from './tipi'

/**
 * Aggregazioni su insiemi di trade: giorno, mese, periodo, consumo dei limiti.
 *
 * Regola di conteggio concordata: **si aggrega per trade, non per execution**.
 * Lo stesso setup aperto su due account resta una sola idea di trade. L'R è la
 * media degli R degli account selezionati, il P&L è la somma in dollari.
 * Contare per execution raddoppierebbe i campioni e renderebbe bugiarda la
 * soglia "meno di 5 trade" dell'analisi di processo.
 */

/** Un'execution entra nelle statistiche solo se è stata chiusa davvero. */
function contribuisce(esito: Esito | null, exit: number | null): boolean {
  return esito !== 'annullato' && exit != null
}

export interface MetricheTrade {
  /** null se nessuna execution selezionata è chiusa */
  pnlUsd: number | null
  pnlPercent: number | null
  rMedio: number | null
  /** RR pianificato all'entrata: serve a misurare quanto si è lasciato sul piatto */
  rrMedio: number | null
  rischioUsd: number | null
  rischioPercent: number | null
  /** Esito del trade nel suo insieme; null se non ancora concluso */
  esito: Exclude<Esito, 'annullato'> | null
}

const VUOTE: MetricheTrade = {
  pnlUsd: null,
  pnlPercent: null,
  rMedio: null,
  rrMedio: null,
  rischioUsd: null,
  rischioPercent: null,
  esito: null,
}

/**
 * Metriche di un singolo trade, limitate agli account indicati.
 *
 * L'esito del trade è quello della prima execution chiusa, in ordine di
 * account. Quando manca, viene dedotto dal segno del P&L: un trade a cui hai
 * dimenticato di mettere l'esito è meglio contarlo che perderlo.
 */
export function metricheTrade(trade: TradeCompleto, account: Account[]): MetricheTrade {
  const perId = new Map(account.map((a) => [a.id, a]))
  const executions = (trade.executions ?? []).filter((e) => perId.has(e.account_id))
  if (executions.length === 0) return VUOTE

  // Denominatore di tutte le percentuali: il capitale complessivo selezionato,
  // non solo quello degli account che hanno operato. Deve coincidere con la
  // base usata da riepiloga(), altrimenti lo stesso trade mostrerebbe due
  // percentuali diverse fra la casella del calendario e la riga della lista.
  const base = account.reduce((s, a) => s + a.saldo_iniziale, 0)

  let sommaPnl = 0
  let chiuse = 0
  let sommaRischio = 0
  let conRischio = 0
  const erre: number[] = []
  const rr: number[] = []
  let esito: MetricheTrade['esito'] = null

  // Ordine stabile: gli account arrivano già ordinati da caricaAccount().
  for (const a of account) {
    const e = executions.find((x) => x.account_id === a.id)
    if (!e) continue

    const m = calcolaMetriche(e, trade.direzione, a.saldo_iniziale)

    if (m.rischioUsd != null) {
      sommaRischio += m.rischioUsd
      conRischio++
    }
    // L'RR pianificato esiste anche a posizione aperta: è il piano, non l'esito.
    if (m.rrPianificato != null) rr.push(m.rrPianificato)

    if (!contribuisce(e.esito, e.exit)) continue

    if (m.pnlUsd != null) {
      sommaPnl += m.pnlUsd
      chiuse++
    }
    if (m.rRealizzato != null) erre.push(m.rRealizzato)

    if (esito === null) {
      if (e.esito === 'win' || e.esito === 'loss' || e.esito === 'breakeven') {
        esito = e.esito
      } else if (m.pnlUsd != null) {
        esito = m.pnlUsd > 0 ? 'win' : m.pnlUsd < 0 ? 'loss' : 'breakeven'
      }
    }
  }

  const chiuso = chiuse > 0

  return {
    pnlUsd: chiuso ? sommaPnl : null,
    pnlPercent: chiuso && base > 0 ? (sommaPnl / base) * 100 : null,
    rMedio: erre.length > 0 ? erre.reduce((s, r) => s + r, 0) / erre.length : null,
    rrMedio: rr.length > 0 ? rr.reduce((s, v) => s + v, 0) / rr.length : null,
    rischioUsd: conRischio > 0 ? sommaRischio : null,
    rischioPercent: conRischio > 0 && base > 0 ? (sommaRischio / base) * 100 : null,
    esito,
  }
}

export interface Riepilogo {
  /** Trade presenti nel periodo, anche non conclusi */
  numeroTrade: number
  /** Trade conclusi, cioè quelli che entrano nelle statistiche */
  numeroChiusi: number
  pnlUsd: number
  pnlPercent: number | null
  vittorie: number
  /** win / (win + loss + breakeven); null senza trade conclusi */
  winRate: number | null
  rMedio: number | null
  /** R medio per trade: quanto ci si aspetta di guadagnare per unità di rischio */
  expectancyR: number | null
  /** Rischio medio per trade, in percentuale del capitale selezionato */
  rischioMedioPercent: number | null
}

const RIEPILOGO_VUOTO: Riepilogo = {
  numeroTrade: 0,
  numeroChiusi: 0,
  pnlUsd: 0,
  pnlPercent: null,
  vittorie: 0,
  winRate: null,
  rMedio: null,
  expectancyR: null,
  rischioMedioPercent: null,
}

/** Riepilogo di un insieme di trade sugli account selezionati. */
export function riepiloga(trades: TradeCompleto[], account: Account[]): Riepilogo {
  if (trades.length === 0 || account.length === 0) {
    return { ...RIEPILOGO_VUOTO, numeroTrade: trades.length }
  }

  // Il denominatore delle percentuali è la somma dei capitali selezionati:
  // due account da 100.000 fanno una base da 200.000.
  const baseTotale = account.reduce((s, a) => s + a.saldo_iniziale, 0)

  let pnl = 0
  let chiusi = 0
  let vittorie = 0
  const erre: number[] = []
  const rischi: number[] = []

  for (const t of trades) {
    const m = metricheTrade(t, account)
    if (m.pnlUsd == null) continue

    pnl += m.pnlUsd
    chiusi++
    if (m.esito === 'win') vittorie++
    if (m.rMedio != null) erre.push(m.rMedio)
    // Sui soli trade conclusi, per avere lo stesso denominatore delle altre voci.
    if (m.rischioPercent != null) rischi.push(m.rischioPercent)
  }

  const sommaR = erre.reduce((s, r) => s + r, 0)

  return {
    numeroTrade: trades.length,
    numeroChiusi: chiusi,
    pnlUsd: pnl,
    pnlPercent: baseTotale > 0 ? (pnl / baseTotale) * 100 : null,
    vittorie,
    winRate: chiusi > 0 ? (vittorie / chiusi) * 100 : null,
    rMedio: erre.length > 0 ? sommaR / erre.length : null,
    expectancyR: chiusi > 0 ? sommaR / chiusi : null,
    rischioMedioPercent:
      rischi.length > 0 ? rischi.reduce((s, r) => s + r, 0) / rischi.length : null,
  }
}

/** Trade indicizzati per data ISO, per riempire le caselle del calendario. */
export function raggruppaPerGiorno(trades: TradeCompleto[]): Map<string, TradeCompleto[]> {
  const mappa = new Map<string, TradeCompleto[]>()
  for (const t of trades) {
    const esistenti = mappa.get(t.data)
    if (esistenti) esistenti.push(t)
    else mappa.set(t.data, [t])
  }
  return mappa
}

/**
 * Perdita netta di un periodo su un singolo account, in percentuale positiva.
 * Una giornata chiusa in utile non consuma il limite: restituisce 0.
 */
export function perditaPercent(
  trades: TradeCompleto[],
  account: Account,
  da: string,
  a: string,
): number {
  const nelPeriodo = trades.filter((t) => t.data >= da && t.data <= a)
  const netto = riepiloga(nelPeriodo, [account]).pnlUsd
  if (netto >= 0) return 0
  return (Math.abs(netto) / account.saldo_iniziale) * 100
}

/**
 * Consumo dei limiti giornaliero e settimanale.
 *
 * Con più account selezionati vale il **peggiore**, non la media: è il singolo
 * account che sfora a far scattare il breach della prop firm, e una media
 * potrebbe nasconderlo dietro l'altro account in utile.
 */
export interface ConsumoRischio {
  perditaOggiPercent: number
  perditaSettimanaPercent: number
  limiteGiornaliero: number
  limiteSettimanale: number
  /** Quota del limite già consumata, da 0 a 1 e oltre in caso di sforamento */
  quotaGiornaliera: number
  quotaSettimanale: number
}

export function consumoRischio(
  trades: TradeCompleto[],
  account: Account[],
  oggi: string,
  limiteGiornaliero: number,
  limiteSettimanale: number,
): ConsumoRischio {
  const lunedi = inizioSettimana(oggi)

  const perditeGiorno = account.map((a) => perditaPercent(trades, a, oggi, oggi))
  const perditeSettimana = account.map((a) => perditaPercent(trades, a, lunedi, oggi))

  const perditaOggiPercent = perditeGiorno.length > 0 ? Math.max(...perditeGiorno) : 0
  const perditaSettimanaPercent = perditeSettimana.length > 0 ? Math.max(...perditeSettimana) : 0

  return {
    perditaOggiPercent,
    perditaSettimanaPercent,
    limiteGiornaliero,
    limiteSettimanale,
    quotaGiornaliera: limiteGiornaliero > 0 ? perditaOggiPercent / limiteGiornaliero : 0,
    quotaSettimanale: limiteSettimanale > 0 ? perditaSettimanaPercent / limiteSettimanale : 0,
  }
}

/**
 * Intensità del colore di una casella del calendario, da 0 a 1.
 * Scala relativa al giorno più mosso del mese: un mese tranquillo non deve
 * apparire tutto sbiadito, né uno movimentato tutto saturo.
 */
export function intensita(pnl: number, massimoAssoluto: number): number {
  if (massimoAssoluto <= 0) return 0
  // Radice quadrata: le differenze fra i giorni piccoli restano distinguibili
  // invece di schiacciarsi tutte sul trasparente.
  return Math.min(1, Math.sqrt(Math.abs(pnl) / massimoAssoluto))
}
