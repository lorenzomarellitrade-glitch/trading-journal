import { supabase } from './supabase'
import type {
  Account,
  Canale,
  Execution,
  Impostazioni,
  NotaJournal,
  Trade,
  TradeCompleto,
} from './tipi'

/**
 * Accesso ai dati. Tutte le query passano da qui: i componenti non chiamano
 * mai `supabase` direttamente, così se un giorno cambia la forma di una query
 * c'è un solo posto da toccare.
 *
 * Il filtro per utente non è scritto qui: lo applicano le policy RLS lato
 * database. Aggiungerlo anche nel client sarebbe una falsa sicurezza.
 */

export const IMPOSTAZIONI_DEFAULT = {
  limite_giornaliero_percent: 2,
  limite_settimanale_percent: 4,
  soglia_rischio_trade_percent: 1.2,
}

export async function caricaAccount(soloAttivi = false): Promise<Account[]> {
  let q = supabase.from('accounts').select('*').order('nome')
  if (soloAttivi) q = q.eq('attivo', true)

  const { data, error } = await q
  if (error) throw new Error(`Caricamento account fallito: ${error.message}`)
  return data ?? []
}

export async function caricaImpostazioni(): Promise<typeof IMPOSTAZIONI_DEFAULT> {
  const { data, error } = await supabase.from('impostazioni').select('*').maybeSingle()
  if (error) throw new Error(`Caricamento impostazioni fallito: ${error.message}`)
  if (!data) return IMPOSTAZIONI_DEFAULT

  const d = data as Impostazioni
  return {
    limite_giornaliero_percent: Number(d.limite_giornaliero_percent),
    limite_settimanale_percent: Number(d.limite_settimanale_percent),
    soglia_rischio_trade_percent: Number(d.soglia_rischio_trade_percent),
  }
}

/** Un singolo trade con le sue executions. `null` se non esiste. */
export async function caricaTrade(id: string): Promise<TradeCompleto | null> {
  const { data, error } = await supabase
    .from('trades')
    .select('*, executions(*)')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`Caricamento trade fallito: ${error.message}`)
  return (data as TradeCompleto | null) ?? null
}

/**
 * Tutti i trade con le loro executions, opzionalmente limitati a un intervallo
 * di date. Usata dal calendario, dalla lista e dalle statistiche.
 */
export async function caricaTrades(da?: string, a?: string): Promise<TradeCompleto[]> {
  let q = supabase.from('trades').select('*, executions(*)')
  if (da) q = q.gte('data', da)
  if (a) q = q.lte('data', a)

  const { data, error } = await q.order('data', { ascending: false }).order('ora_entrata', {
    ascending: true,
    nullsFirst: false,
  })

  if (error) throw new Error(`Caricamento trade fallito: ${error.message}`)
  return (data as TradeCompleto[]) ?? []
}

/** I campi di una execution che l'utente compila nel form. */
export type BozzaExecution = Pick<
  Execution,
  'entry' | 'stop_loss' | 'take_profit' | 'exit' | 'lotti' | 'esito'
> & { account_id: string }

/**
 * Salva un trade e le sue executions, creandolo o aggiornandolo.
 *
 * Le executions vengono riconciliate: quelle con almeno un campo compilato
 * sono inserite o aggiornate, quelle svuotate del tutto vengono eliminate.
 * Così non restano righe vuote a falsare le statistiche.
 *
 * Restituisce l'id del trade.
 */
export async function salvaTrade(
  campiTrade: Partial<Trade>,
  executions: BozzaExecution[],
  idEsistente?: string,
): Promise<string> {
  let tradeId = idEsistente

  if (tradeId) {
    const { error } = await supabase.from('trades').update(campiTrade).eq('id', tradeId)
    if (error) throw new Error(`Salvataggio trade fallito: ${error.message}`)
  } else {
    const { data, error } = await supabase
      .from('trades')
      // `data` e `direzione` sono garantiti dalla validazione del form
      .insert(campiTrade as Partial<Trade> & { data: string; direzione: Trade['direzione'] })
      .select('id')
      .single()

    if (error) throw new Error(`Creazione trade fallita: ${error.message}`)
    tradeId = data.id
  }

  await sincronizzaExecutions(tradeId, executions)
  return tradeId
}

/** True se il blocco di un account è stato toccato dall'utente. */
export function executionCompilata(e: BozzaExecution): boolean {
  return (
    e.entry != null ||
    e.stop_loss != null ||
    e.take_profit != null ||
    e.exit != null ||
    e.lotti != null ||
    e.esito != null
  )
}

async function sincronizzaExecutions(tradeId: string, bozze: BozzaExecution[]): Promise<void> {
  const daTenere = bozze.filter(executionCompilata)
  const accountDaTenere = new Set(daTenere.map((e) => e.account_id))

  // Prima le eliminazioni: i blocchi svuotati non devono lasciare righe orfane.
  const daEliminare = bozze
    .filter((e) => !accountDaTenere.has(e.account_id))
    .map((e) => e.account_id)

  if (daEliminare.length > 0) {
    const { error } = await supabase
      .from('executions')
      .delete()
      .eq('trade_id', tradeId)
      .in('account_id', daEliminare)

    if (error) throw new Error(`Pulizia executions fallita: ${error.message}`)
  }

  if (daTenere.length === 0) return

  // upsert sul vincolo (trade_id, account_id): un solo record per account.
  const { error } = await supabase.from('executions').upsert(
    daTenere.map((e) => ({ ...e, trade_id: tradeId })),
    { onConflict: 'trade_id,account_id' },
  )

  if (error) throw new Error(`Salvataggio executions fallito: ${error.message}`)
}

// ---------------------------------------------------------------------------
// Journal emotivo
// ---------------------------------------------------------------------------

/**
 * I messaggi di un canale in un intervallo di date, dal più vecchio al più
 * recente: è l'ordine in cui si legge una chat.
 */
export async function caricaNote(
  canale: Canale,
  da: string,
  a: string,
): Promise<NotaJournal[]> {
  const { data, error } = await supabase
    .from('note_journal')
    .select('*')
    .eq('canale', canale)
    .gte('data', da)
    .lte('data', a)
    .order('data', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Caricamento note fallito: ${error.message}`)
  return data ?? []
}

/**
 * I mesi in cui esiste almeno una nota, dal più recente, come 'YYYY-MM'.
 * Serve a riempire il menu dei mesi senza proporne di vuoti.
 */
export async function caricaMesiConNote(): Promise<string[]> {
  const { data, error } = await supabase
    .from('note_journal')
    .select('data')
    .order('data', { ascending: false })

  if (error) throw new Error(`Caricamento mesi fallito: ${error.message}`)

  const mesi = new Set((data ?? []).map((r) => r.data.slice(0, 7)))
  return [...mesi].sort((a, b) => b.localeCompare(a))
}

export async function creaNota(canale: Canale, data: string, testo: string): Promise<NotaJournal> {
  const { data: creata, error } = await supabase
    .from('note_journal')
    .insert({ canale, data, testo })
    .select('*')
    .single()

  if (error) throw new Error(`Salvataggio nota fallito: ${error.message}`)
  return creata
}

export async function aggiornaNota(id: string, testo: string): Promise<void> {
  const { error } = await supabase.from('note_journal').update({ testo }).eq('id', id)
  if (error) throw new Error(`Modifica nota fallita: ${error.message}`)
}

export async function eliminaNota(id: string): Promise<void> {
  const { error } = await supabase.from('note_journal').delete().eq('id', id)
  if (error) throw new Error(`Eliminazione nota fallita: ${error.message}`)
}

/** Elimina un trade. Le executions spariscono da sole per via del cascade. */
export async function eliminaTrade(id: string): Promise<void> {
  const { error } = await supabase.from('trades').delete().eq('id', id)
  if (error) throw new Error(`Eliminazione fallita: ${error.message}`)
}
