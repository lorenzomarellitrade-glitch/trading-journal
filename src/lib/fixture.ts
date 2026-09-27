import type { Account, Direzione, Esito, Execution, TradeCompleto } from './tipi'

/**
 * Costruttori di dati finti, usati solo dai test.
 * Stanno in un file a parte perché servono a più suite; non sono importati
 * da nessun componente, quindi non finiscono nel bundle.
 */

export function acc(id: string, saldo = 100000): Account {
  return {
    id,
    user_id: 'u',
    nome: id.toUpperCase(),
    saldo_iniziale: saldo,
    valuta: 'USD',
    attivo: true,
    target_profitto_percent: null,
    drawdown_giornaliero_percent: null,
    drawdown_massimo_percent: null,
    created_at: '',
    updated_at: '',
  }
}

export const A = acc('a')
export const B = acc('b')
export const ENTRAMBI = [A, B]

let contatore = 0

export function exe(accountId: string, p: Partial<Execution> = {}): Execution {
  return {
    id: `e${contatore++}`,
    user_id: 'u',
    trade_id: 't',
    account_id: accountId,
    entry: null,
    stop_loss: null,
    take_profit: null,
    exit: null,
    lotti: null,
    esito: null,
    created_at: '',
    updated_at: '',
    ...p,
  }
}

export function trade(
  data: string,
  direzione: Direzione,
  executions: Execution[],
  extra: Partial<TradeCompleto> = {},
): TradeCompleto {
  return {
    id: `t${contatore++}`,
    user_id: 'u',
    data,
    ora_entrata: null,
    direzione,
    finestra: null,
    bias_daily: null,
    bias_h4: null,
    bias_h1: null,
    step1_analisi_multitf: false,
    step2_zona_operativa: false,
    step3_prezzo_in_zona: false,
    step4_schematica: false,
    step5_fallimento_rottura: false,
    numero_fr: null,
    sl_spostato: false,
    chiuso_manualmente: false,
    oltre_4h: false,
    news_durante: false,
    idea_esterna: false,
    link_daily: null,
    link_h4: null,
    link_h1: null,
    link_m15: null,
    link_m5: null,
    nota_uscita: null,
    emozione: null,
    created_at: '',
    updated_at: '',
    executions,
    ...extra,
  }
}

/** Long che va a target: +500 USD per account, R = +2. */
export function vincente(accountId: string, esito: Esito | null = 'win'): Execution {
  return exe(accountId, {
    entry: 2000,
    stop_loss: 1995,
    take_profit: 2010,
    exit: 2010,
    lotti: 0.5,
    esito,
  })
}

/** Long che prende lo stop: −250 USD per account, R = −1. */
export function perdente(accountId: string, esito: Esito | null = 'loss'): Execution {
  return exe(accountId, {
    entry: 2000,
    stop_loss: 1995,
    take_profit: 2010,
    exit: 1995,
    lotti: 0.5,
    esito,
  })
}

/** Tutte e cinque le conferme attive. */
export const PROCESSO_COMPLETO = {
  step1_analisi_multitf: true,
  step2_zona_operativa: true,
  step3_prezzo_in_zona: true,
  step4_schematica: true,
  step5_fallimento_rottura: true,
} as const
