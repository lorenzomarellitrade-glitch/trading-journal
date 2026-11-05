-- Trading journal 2026-11: tabella unica dei trade + bucket degli screenshot.
-- Incollare nel SQL Editor di Supabase ed eseguire. Idempotente.
-- Le tabelle del journal vecchio (accounts, trades, executions, ...) restano com'erano.

create table if not exists public.journal_trade (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  strategia   text not null check (strategia in ('xau','fx')),
  direzione   text not null check (direzione in ('long','short')),
  data        date not null,
  ora         text,
  sessione    text,
  rischio     numeric(6,2),
  checklist   smallint[] not null default '{}',
  confluenze  text[] not null default '{}',
  stato_prima text,
  stato_dopo  text,
  piano       boolean,
  esito_pct   numeric(8,2),
  r           numeric(6,2),
  lezione     text not null default '',
  tv_link     text not null default '',
  immagini    text[] not null default '{}',
  aperto      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists journal_trade_user_data on public.journal_trade (user_id, data);

create or replace function public.journal_tocca_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists journal_trade_updated on public.journal_trade;
create trigger journal_trade_updated before update on public.journal_trade
  for each row execute function public.journal_tocca_updated_at();

alter table public.journal_trade enable row level security;
drop policy if exists "journal_trade: solo i propri" on public.journal_trade;
create policy "journal_trade: solo i propri" on public.journal_trade
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Screenshot: bucket privato, ogni utente nella sua cartella <uid>/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('screenshot', 'screenshot', false, 8388608, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

drop policy if exists "screenshot: leggi i propri" on storage.objects;
drop policy if exists "screenshot: carica i propri" on storage.objects;
drop policy if exists "screenshot: cancella i propri" on storage.objects;
create policy "screenshot: leggi i propri" on storage.objects for select to authenticated
  using (bucket_id = 'screenshot' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "screenshot: carica i propri" on storage.objects for insert to authenticated
  with check (bucket_id = 'screenshot' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "screenshot: cancella i propri" on storage.objects for delete to authenticated
  using (bucket_id = 'screenshot' and (storage.foldername(name))[1] = auth.uid()::text);
