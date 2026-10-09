/**
 * Tipi del dominio, allineati a mano con supabase/schema.sql.
 * Se cambi lo schema SQL, aggiorna anche questo file.
 */

// --- Enum, gli stessi definiti come tipi Postgres ---------------------------

export type Direzione = 'long' | 'short'

// Dal 16/09/2026 la finestra operativa è una sola. I valori '09:00-10:30' e
// '12:00-13:00' esistono ancora nell'enum del database (Postgres non permette
// di rimuoverli) ma i trade sono stati riclassificati e l'app non li usa più.
export type Finestra = '09:00-12:00' | 'fuori finestra'

export type Bias = 'rialzista' | 'ribassista' | 'laterale'

export type NumeroFR = 'primo' | 'secondo'

export type Esito = 'win' | 'loss' | 'breakeven' | 'annullato'

export const DIREZIONI: Direzione[] = ['long', 'short']
export const FINESTRE: Finestra[] = ['09:00-12:00', 'fuori finestra']
export const BIAS: Bias[] = ['rialzista', 'ribassista', 'laterale']
export const ESITI: Esito[] = ['win', 'loss', 'breakeven', 'annullato']
export const NUMERI_FR: NumeroFR[] = ['primo', 'secondo']

/** I canali del journal emotivo. La configurazione sta in lib/journal.ts. */
export type Canale = 'visione' | 'tp' | 'stop' | 'be' | 'miss' | 'stato-mentale'

/** Il mercato di un messaggio del journal. Lo Stato mentale non ne ha. */
export type Mercato = 'xauusd' | 'forex'

/** I 5 step della checklist, in ordine, con l'etichetta mostrata nel form. */
export const STEP_CHECKLIST = [
  { campo: 'step1_analisi_multitf', etichetta: 'Analisi multi-timeframe' },
  { campo: 'step2_zona_operativa', etichetta: 'Zona operativa' },
  { campo: 'step3_prezzo_in_zona', etichetta: 'Prezzo in zona' },
  { campo: 'step4_schematica', etichetta: 'Schematica' },
  { campo: 'step5_fallimento_rottura', etichetta: 'Fallimento + Rottura' },
] as const

export type CampoStep = (typeof STEP_CHECKLIST)[number]['campo']

/** I 5 flag comportamentali, con etichetta e icona testuale per la lista. */
export const FLAG_COMPORTAMENTALI = [
  { campo: 'sl_spostato', etichetta: 'SL spostato', sigla: 'SL' },
  { campo: 'chiuso_manualmente', etichetta: 'Chiuso manualmente', sigla: 'CM' },
  { campo: 'oltre_4h', etichetta: 'Tenuto oltre 4h', sigla: '4H' },
  { campo: 'news_durante', etichetta: 'News durante', sigla: 'NW' },
  { campo: 'idea_esterna', etichetta: 'Idea esterna', sigla: 'EX' },
] as const

export type CampoFlag = (typeof FLAG_COMPORTAMENTALI)[number]['campo']

/** I 5 link snapshot, con etichetta del timeframe. */
export const CAMPI_LINK = [
  { campo: 'link_daily', etichetta: 'Daily' },
  { campo: 'link_h4', etichetta: 'H4' },
  { campo: 'link_h1', etichetta: 'H1' },
  { campo: 'link_m15', etichetta: 'M15' },
  { campo: 'link_m5', etichetta: 'M5' },
] as const

export type CampoLink = (typeof CAMPI_LINK)[number]['campo']

// --- Righe delle tabelle ----------------------------------------------------

// NB: queste devono essere `type` e non `interface`. Le interfacce non ricevono
// l'index signature implicita, quindi non sarebbero assegnabili a
// `Record<string, unknown>` e il vincolo `GenericSchema` di postgrest-js
// fallirebbe, facendo collassare a `never` ogni query.
export type Account = {
  id: string
  user_id: string
  nome: string
  saldo_iniziale: number
  valuta: string
  attivo: boolean
  /** Target di profitto della prop, in % del saldo iniziale. null = nessun obiettivo. */
  target_profitto_percent: number | null
  /** Perdita massima in una singola giornata, in % del saldo iniziale. */
  drawdown_giornaliero_percent: number | null
  /** Perdita massima complessiva, in % del saldo iniziale. null = nessun limite. */
  drawdown_massimo_percent: number | null
  created_at: string
  updated_at: string
}

export type Trade = {
  id: string
  user_id: string

  data: string // 'YYYY-MM-DD'
  ora_entrata: string | null // 'HH:MM:SS'
  direzione: Direzione
  finestra: Finestra | null

  bias_daily: Bias | null
  bias_h4: Bias | null
  bias_h1: Bias | null

  step1_analisi_multitf: boolean
  step2_zona_operativa: boolean
  step3_prezzo_in_zona: boolean
  step4_schematica: boolean
  step5_fallimento_rottura: boolean

  numero_fr: NumeroFR | null

  sl_spostato: boolean
  chiuso_manualmente: boolean
  oltre_4h: boolean
  news_durante: boolean
  idea_esterna: boolean

  link_daily: string | null
  link_h4: string | null
  link_h1: string | null
  link_m15: string | null
  link_m5: string | null

  nota_uscita: string | null
  emozione: string | null

  created_at: string
  updated_at: string
}

export type Execution = {
  id: string
  user_id: string
  trade_id: string
  account_id: string

  entry: number | null
  stop_loss: number | null
  take_profit: number | null
  exit: number | null
  lotti: number | null
  esito: Esito | null

  created_at: string
  updated_at: string
}

/** Un messaggio del journal emotivo. Il mese si ricava dalla data. */
export type NotaJournal = {
  id: string
  user_id: string
  data: string
  /** null solo per lo Stato mentale, che è in comune fra i mercati */
  mercato: Mercato | null
  canale: Canale
  /** Coppia forex, es. 'EURUSD'. null sull'oro e sullo Stato mentale */
  coppia: string | null
  testo: string
  created_at: string
  updated_at: string
}

/** Risposta a "Ho rispettato il piano?" */
export type PianoRispettato = 'si' | 'no' | 'in-parte'

/** Una pagina del diario: una seduta, con il piano prima e la verifica dopo. */
export type PaginaDiario = {
  id: string
  user_id: string
  data: string
  strumento: string | null
  time_frame: string | null

  // PRIMA · dichiaro
  cosa_vedo: string | null
  /** Link ai grafici visti prima di entrare, uno per riga */
  grafici_prima: string | null
  ingresso: string | null
  stop: string | null
  uscita: string | null
  rischio: string | null
  cambierebbe_idea: string | null
  notizie_attese: string | null

  /** Quando è stato bloccato il piano; null finché la pagina è una bozza */
  piano_bloccato_at: string | null

  // DOPO · verifico
  cosa_successo: string | null
  risultato: string | null
  piano_rispettato: PianoRispettato | null
  cambiamenti: string | null
  riflesso_incassato_presto: boolean
  riflesso_tenuto_perdita: boolean
  riflesso_rincorso_prezzo: boolean
  riflesso_seguito_regola: boolean
  prossima_volta: string | null

  created_at: string
  updated_at: string
}

export type GiornoFeriale = 'lun' | 'mar' | 'mer' | 'gio' | 'ven'

/** Una riga della tabella del riepilogo settimanale. */
export type RigaSettimana = {
  operazioni: string
  piano: PianoRispettato | ''
  risultato: string
  nota: string
}

export type SettimanaDiario = {
  id: string
  user_id: string
  /** Il lunedì della settimana, 'YYYY-MM-DD' */
  settimana_dal: string
  strumenti: string | null
  giorni: Partial<Record<GiornoFeriale, RigaSettimana>>
  fatto_meglio: string | null
  errore_ripetuto: string | null
  riflesso: string | null
  regola: string | null
  created_at: string
  updated_at: string
}

export type Impostazioni = {
  user_id: string
  limite_giornaliero_percent: number
  limite_settimanale_percent: number
  soglia_rischio_trade_percent: number
  updated_at: string
}

/** Un trade con le sue executions, come lo restituisce la query con join. */
export type TradeCompleto = Trade & {
  executions: Execution[]
}

// --- Tipizzazione del client Supabase --------------------------------------
// Forma minima richiesta da createClient<Database>: per ogni tabella, la riga
// letta (Row), quella inserita (Insert) e quella aggiornata (Update).

// Tutto ciò che ha un default in SQL (id, user_id, timestamp, booleani, valuta)
// è opzionale in inserimento: obbligatori restano solo i NOT NULL senza default.
type Insertabile<T, Obbligatori extends keyof T> = Partial<T> & Pick<T, Obbligatori>

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: Account
        Insert: Insertabile<Account, 'nome' | 'saldo_iniziale'>
        Update: Partial<Account>
        Relationships: []
      }
      trades: {
        Row: Trade
        Insert: Insertabile<Trade, 'data' | 'direzione'>
        Update: Partial<Trade>
        Relationships: []
      }
      executions: {
        Row: Execution
        Insert: Insertabile<Execution, 'trade_id' | 'account_id'>
        Update: Partial<Execution>
        // Le due foreign key: servono a postgrest-js per tipizzare le query
        // con join, es. .select('*, accounts(nome)').
        Relationships: [
          {
            foreignKeyName: 'executions_trade_id_fkey'
            columns: ['trade_id']
            isOneToOne: false
            referencedRelation: 'trades'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'executions_account_id_fkey'
            columns: ['account_id']
            isOneToOne: false
            referencedRelation: 'accounts'
            referencedColumns: ['id']
          },
        ]
      }
      impostazioni: {
        Row: Impostazioni
        Insert: Partial<Impostazioni>
        Update: Partial<Impostazioni>
        Relationships: []
      }
      note_journal: {
        Row: NotaJournal
        Insert: Insertabile<NotaJournal, 'canale' | 'testo'>
        Update: Partial<NotaJournal>
        Relationships: []
      }
      diario_pagine: {
        Row: PaginaDiario
        Insert: Partial<PaginaDiario>
        Update: Partial<PaginaDiario>
        Relationships: []
      }
      diario_settimane: {
        Row: SettimanaDiario
        Insert: Insertabile<SettimanaDiario, 'settimana_dal'>
        Update: Partial<SettimanaDiario>
        Relationships: []
      }
    }
    // Insiemi vuoti nella forma canonica: `{ [_ in never]: never }` non ha
    // index signature, quindi `keyof` è `never`. Con `Record<string, never>`
    // invece `keyof` sarebbe `string` e l'overload di from() per le viste
    // catturerebbe anche i nomi delle tabelle, facendo collassare Insert/Update.
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: {
      direzione_trade: Direzione
      finestra_oraria: Finestra
      bias_tf: Bias
      numero_fr: NumeroFR
      esito_execution: Esito
      canale_journal: Canale
      mercato_journal: Mercato
      piano_rispettato: PianoRispettato
    }
    CompositeTypes: { [_ in never]: never }
  }
}
