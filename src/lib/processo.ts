import { CONFERME_TOTALI, contaConferme } from './calcoli'
import type { Finestra, Trade } from './tipi'

/**
 * Le cinque verifiche del processo su un singolo trade, nella forma che
 * l'interfaccia mostra: conferme, finestra, stop, uscita a piano, idea propria.
 * Sono le stesse componenti del punteggio Processo (statistiche.ts), lette una
 * per una invece che riassunte in un numero.
 */

export type EsitoVerifica = 'ok' | 'ko' | 'nd'

export interface Verifica {
  chiave: 'conferme' | 'finestra' | 'stop' | 'uscita' | 'idea'
  /** Nome breve, per le etichette */
  etichetta: string
  /** Sigla di due lettere per gli spazi stretti, es. le schede della griglia */
  sigla: string
  esito: EsitoVerifica
  /** Il dettaglio mostrato accanto, es. "4/5" o "fuori finestra" */
  dettaglio: string
}

/** Accetta un trade parziale: serve anche alla bozza del form, prima del salvataggio. */
export function verificheProcesso(t: Partial<Trade>): Verifica[] {
  const conferme = contaConferme(t)
  return [
    {
      chiave: 'conferme',
      etichetta: 'Conferme',
      sigla: 'CF',
      esito: conferme === CONFERME_TOTALI ? 'ok' : 'ko',
      dettaglio: `${conferme}/${CONFERME_TOTALI}`,
    },
    {
      chiave: 'finestra',
      etichetta: 'Finestra',
      sigla: 'FI',
      esito: t.finestra == null ? 'nd' : t.finestra === 'fuori finestra' ? 'ko' : 'ok',
      dettaglio: t.finestra == null ? 'non indicata' : t.finestra === 'fuori finestra' ? 'fuori' : 'dentro',
    },
    {
      chiave: 'stop',
      etichetta: 'Stop fermo',
      sigla: 'SL',
      esito: t.sl_spostato ? 'ko' : 'ok',
      dettaglio: t.sl_spostato ? 'spostato' : 'non toccato',
    },
    {
      chiave: 'uscita',
      etichetta: 'Uscita a piano',
      sigla: 'US',
      esito: t.chiuso_manualmente ? 'ko' : 'ok',
      dettaglio: t.chiuso_manualmente ? 'chiuso a mano' : 'TP/SL',
    },
    {
      chiave: 'idea',
      etichetta: 'Idea tua',
      sigla: 'ID',
      esito: t.idea_esterna ? 'ko' : 'ok',
      dettaglio: t.idea_esterna ? 'esterna' : 'mia',
    },
  ]
}

/** Inizio e fine (esclusa) della finestra operativa, come 'HH:MM'. */
export const FINESTRA_DA = '09:00'
export const FINESTRA_A = '12:00'

/**
 * La finestra che corrisponde a un'ora di entrata: dalle 09:00 alle 11:59 è
 * dentro, il resto è fuori. Null senza ora. È solo una proposta per il form:
 * la scelta fatta a mano resta quella che conta.
 */
export function finestraDaOra(ora: string | null | undefined): Finestra | null {
  if (!ora) return null
  const hhmm = ora.slice(0, 5)
  if (!/^\d{2}:\d{2}$/.test(hhmm)) return null
  return hhmm >= FINESTRA_DA && hhmm < FINESTRA_A ? '09:00-12:00' : 'fuori finestra'
}
