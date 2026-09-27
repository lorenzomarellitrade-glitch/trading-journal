-- ============================================================================
-- Trading Journal — schema completo
-- Incollare per intero nel SQL Editor di Supabase ed eseguire.
-- Lo script è idempotente: può essere rieseguito senza errori.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tipi enumerati
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'direzione_trade') then
    create type direzione_trade as enum ('long', 'short');
  end if;

  -- Dal 2026-09-16 la finestra operativa è una sola. Un database creato prima
  -- di quella data va aggiornato con supabase/migrazioni/2026-09-16_finestra_unica.sql
  if not exists (select 1 from pg_type where typname = 'finestra_oraria') then
    create type finestra_oraria as enum ('09:00-12:00', 'fuori finestra');
  end if;

  if not exists (select 1 from pg_type where typname = 'bias_tf') then
    create type bias_tf as enum ('rialzista', 'ribassista', 'laterale');
  end if;

  if not exists (select 1 from pg_type where typname = 'numero_fr') then
    create type numero_fr as enum ('primo', 'secondo');
  end if;

  if not exists (select 1 from pg_type where typname = 'esito_execution') then
    create type esito_execution as enum ('win', 'loss', 'breakeven', 'annullato');
  end if;

  if not exists (select 1 from pg_type where typname = 'canale_journal') then
    create type canale_journal as enum ('tp', 'stop', 'be', 'miss', 'stato-mentale');
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 2. Funzione di supporto: aggiorna updated_at ad ogni UPDATE
-- ---------------------------------------------------------------------------
create or replace function public.tocca_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Tabella accounts — i due account prop
-- ---------------------------------------------------------------------------
create table if not exists public.accounts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome           text not null,
  saldo_iniziale numeric(14, 2) not null check (saldo_iniziale > 0),
  valuta         text not null default 'USD',
  attivo         boolean not null default true,

  -- Regole della prop, in percentuale del saldo iniziale. Restano NULL sui
  -- conti senza obiettivi da rispettare, ad esempio un conto reale personale.
  -- Il drawdown è statico: soglia fissa sotto il saldo iniziale.
  target_profitto_percent      numeric(5, 2) check (target_profitto_percent is null or target_profitto_percent > 0),
  drawdown_giornaliero_percent numeric(5, 2) check (drawdown_giornaliero_percent is null or drawdown_giornaliero_percent > 0),
  drawdown_massimo_percent     numeric(5, 2) check (drawdown_massimo_percent is null or drawdown_massimo_percent > 0),

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists accounts_user_id_idx on public.accounts (user_id);

drop trigger if exists accounts_updated_at on public.accounts;
create trigger accounts_updated_at
  before update on public.accounts
  for each row execute function public.tocca_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Tabella trades — una riga per IDEA di trade, condivisa fra gli account
-- ---------------------------------------------------------------------------
create table if not exists public.trades (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,

  -- Contesto
  data        date not null,
  ora_entrata time,
  direzione   direzione_trade not null,
  finestra    finestra_oraria,

  -- Bias multi-timeframe
  bias_daily bias_tf,
  bias_h4    bias_tf,
  bias_h1    bias_tf,

  -- Checklist: le 5 conferme di processo
  step1_analisi_multitf     boolean not null default false,
  step2_zona_operativa      boolean not null default false,
  step3_prezzo_in_zona      boolean not null default false,
  step4_schematica          boolean not null default false,
  step5_fallimento_rottura  boolean not null default false,

  -- Il Fallimento+Rottura preso era il primo o il secondo della sequenza
  numero_fr numero_fr,

  -- Flag comportamentali
  sl_spostato        boolean not null default false,
  chiuso_manualmente boolean not null default false,
  oltre_4h           boolean not null default false,
  news_durante       boolean not null default false,
  idea_esterna       boolean not null default false,

  -- Snapshot TradingView, uno per timeframe
  link_daily text,
  link_h4    text,
  link_h1    text,
  link_m15   text,
  link_m5    text,

  -- Riflessione sull'uscita (non sull'entrata) e stato emotivo in una parola
  nota_uscita text,
  emozione    text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trades_user_data_idx on public.trades (user_id, data desc);

drop trigger if exists trades_updated_at on public.trades;
create trigger trades_updated_at
  before update on public.trades
  for each row execute function public.tocca_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Tabella executions — l'esecuzione dello stesso trade su un singolo account
--    Nessun valore derivato è salvato: rischio, RR, P&L e R si ricalcolano
--    sempre dai prezzi e dai lotti in src/lib/calcoli.ts.
-- ---------------------------------------------------------------------------
create table if not exists public.executions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  trade_id   uuid not null references public.trades (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete cascade,

  entry       numeric(12, 3),
  stop_loss   numeric(12, 3),
  take_profit numeric(12, 3),
  exit        numeric(12, 3),
  lotti       numeric(10, 2),
  esito       esito_execution,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Un solo record per coppia trade/account
  constraint executions_trade_account_unique unique (trade_id, account_id)
);

create index if not exists executions_trade_idx on public.executions (trade_id);
create index if not exists executions_user_account_idx on public.executions (user_id, account_id);

drop trigger if exists executions_updated_at on public.executions;
create trigger executions_updated_at
  before update on public.executions
  for each row execute function public.tocca_updated_at();

-- ---------------------------------------------------------------------------
-- 6. Tabella impostazioni — una sola riga per utente
--    Limiti di perdita massima, usati dalla barra rischio del calendario.
-- ---------------------------------------------------------------------------
create table if not exists public.impostazioni (
  user_id                     uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  limite_giornaliero_percent  numeric(5, 2) not null default 2.0 check (limite_giornaliero_percent > 0),
  limite_settimanale_percent  numeric(5, 2) not null default 4.0 check (limite_settimanale_percent > 0),
  -- Soglia oltre la quale il rischio di un singolo trade viene evidenziato nel form
  soglia_rischio_trade_percent numeric(5, 2) not null default 1.2 check (soglia_rischio_trade_percent > 0),
  updated_at                  timestamptz not null default now()
);

drop trigger if exists impostazioni_updated_at on public.impostazioni;
create trigger impostazioni_updated_at
  before update on public.impostazioni
  for each row execute function public.tocca_updated_at();

-- ---------------------------------------------------------------------------
-- 6-bis. Tabella note_journal — il journal emotivo
--    Messaggi liberi divisi per canale. Il mese non è un campo: si ricava
--    dalla data, così non ci sono contenitori mensili da creare a mano.
-- ---------------------------------------------------------------------------
create table if not exists public.note_journal (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data       date not null default current_date,
  canale     canale_journal not null,
  testo      text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists note_journal_user_canale_data_idx
  on public.note_journal (user_id, canale, data, created_at);

drop trigger if exists note_journal_updated_at on public.note_journal;
create trigger note_journal_updated_at
  before update on public.note_journal
  for each row execute function public.tocca_updated_at();

-- ---------------------------------------------------------------------------
-- 7. Row Level Security
--    Ogni riga è visibile e modificabile solo dal proprietario (auth.uid()).
--    Nessuna policy per il ruolo anon: senza login non si legge nulla.
-- ---------------------------------------------------------------------------
alter table public.accounts     enable row level security;
alter table public.trades       enable row level security;
alter table public.executions   enable row level security;
alter table public.impostazioni enable row level security;
alter table public.note_journal enable row level security;

-- accounts
drop policy if exists "accounts select proprio"  on public.accounts;
drop policy if exists "accounts insert proprio"  on public.accounts;
drop policy if exists "accounts update proprio"  on public.accounts;
drop policy if exists "accounts delete proprio"  on public.accounts;

create policy "accounts select proprio" on public.accounts
  for select to authenticated using (auth.uid() = user_id);
create policy "accounts insert proprio" on public.accounts
  for insert to authenticated with check (auth.uid() = user_id);
create policy "accounts update proprio" on public.accounts
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "accounts delete proprio" on public.accounts
  for delete to authenticated using (auth.uid() = user_id);

-- trades
drop policy if exists "trades select proprio" on public.trades;
drop policy if exists "trades insert proprio" on public.trades;
drop policy if exists "trades update proprio" on public.trades;
drop policy if exists "trades delete proprio" on public.trades;

create policy "trades select proprio" on public.trades
  for select to authenticated using (auth.uid() = user_id);
create policy "trades insert proprio" on public.trades
  for insert to authenticated with check (auth.uid() = user_id);
create policy "trades update proprio" on public.trades
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "trades delete proprio" on public.trades
  for delete to authenticated using (auth.uid() = user_id);

-- executions
drop policy if exists "executions select proprio" on public.executions;
drop policy if exists "executions insert proprio" on public.executions;
drop policy if exists "executions update proprio" on public.executions;
drop policy if exists "executions delete proprio" on public.executions;

create policy "executions select proprio" on public.executions
  for select to authenticated using (auth.uid() = user_id);
create policy "executions insert proprio" on public.executions
  for insert to authenticated with check (auth.uid() = user_id);
create policy "executions update proprio" on public.executions
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "executions delete proprio" on public.executions
  for delete to authenticated using (auth.uid() = user_id);

-- impostazioni
drop policy if exists "impostazioni select proprio" on public.impostazioni;
drop policy if exists "impostazioni insert proprio" on public.impostazioni;
drop policy if exists "impostazioni update proprio" on public.impostazioni;

create policy "impostazioni select proprio" on public.impostazioni
  for select to authenticated using (auth.uid() = user_id);
create policy "impostazioni insert proprio" on public.impostazioni
  for insert to authenticated with check (auth.uid() = user_id);
create policy "impostazioni update proprio" on public.impostazioni
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- note_journal
drop policy if exists "note select proprio" on public.note_journal;
drop policy if exists "note insert proprio" on public.note_journal;
drop policy if exists "note update proprio" on public.note_journal;
drop policy if exists "note delete proprio" on public.note_journal;

create policy "note select proprio" on public.note_journal
  for select to authenticated using (auth.uid() = user_id);
create policy "note insert proprio" on public.note_journal
  for insert to authenticated with check (auth.uid() = user_id);
create policy "note update proprio" on public.note_journal
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "note delete proprio" on public.note_journal
  for delete to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 8. Dati iniziali (opzionale)
--    Esegui questo blocco DOPO aver creato il tuo utente e aver fatto almeno
--    un login, oppure sostituisci auth.uid() con il tuo UUID utente.
--    Se lo esegui dal SQL Editor auth.uid() è NULL: usa la variante commentata.
-- ---------------------------------------------------------------------------
-- insert into public.accounts (user_id, nome, saldo_iniziale, valuta, attivo)
-- values
--   ('INCOLLA-QUI-IL-TUO-USER-UUID', 'FTMO A', 100000, 'USD', true),
--   ('INCOLLA-QUI-IL-TUO-USER-UUID', 'FTMO B', 100000, 'USD', true);
--
-- insert into public.impostazioni (user_id) values ('INCOLLA-QUI-IL-TUO-USER-UUID');
