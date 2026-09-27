-- ============================================================================
-- Migrazione 2026-09-27 — journal emotivo
--
-- Una tabella di messaggi liberi, organizzati per canale. Il mese non è un
-- campo: si ricava dalla data del messaggio, così non c'è nessun canale
-- mensile da creare a mano.
--
-- Si esegue in un passaggio solo. Il vincolo che impone due passaggi separati
-- riguarda l'aggiunta di un valore a un enum già esistente, non la creazione
-- di un enum nuovo: quello si può usare subito.
--
-- Lo script è ripetibile senza danni.
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'canale_journal') then
    create type canale_journal as enum ('tp', 'stop', 'be', 'miss', 'stato-mentale');
  end if;
end
$$;

create table if not exists public.note_journal (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data       date not null default current_date,
  canale     canale_journal not null,
  testo      text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- L'ordine di lettura è sempre canale + data: l'indice segue quello.
create index if not exists note_journal_user_canale_data_idx
  on public.note_journal (user_id, canale, data, created_at);

drop trigger if exists note_journal_updated_at on public.note_journal;
create trigger note_journal_updated_at
  before update on public.note_journal
  for each row execute function public.tocca_updated_at();

alter table public.note_journal enable row level security;

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

notify pgrst, 'reload schema';

-- Verifica: deve restituire 0, la tabella è appena nata.
select count(*) as note from public.note_journal;
