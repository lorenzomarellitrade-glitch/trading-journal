-- Trading journal 2026-11-11: diario di sessione (Lore). Note libere per time frame con screenshot, e la chiusura della sessione.
-- Più la colonna "motivo" nei trade: perché entro, con parole mie.
-- Incollare nel SQL Editor di Supabase ed eseguire PRIMA del deploy. Idempotente. I trade esistenti non si toccano.

create table if not exists public.journal_nota (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  strategia   text not null check (strategia in ('xau','fx')),
  data        date not null,
  ora         text,
  tipo        text not null default 'nota' check (tipo in ('nota','fine')),
  tf          text,
  bias        text check (bias in ('up','dn','nt')),
  testo       text not null default '',
  immagini    text[] not null default '{}',
  sicurezza   smallint check (sicurezza between 1 and 5),
  piano       boolean,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists journal_nota_user_data on public.journal_nota (user_id, data);

drop trigger if exists journal_nota_updated on public.journal_nota;
create trigger journal_nota_updated before update on public.journal_nota
  for each row execute function public.journal_tocca_updated_at();

alter table public.journal_nota enable row level security;
drop policy if exists "journal_nota: solo le proprie" on public.journal_nota;
create policy "journal_nota: solo le proprie" on public.journal_nota
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.journal_trade add column if not exists motivo text not null default '';
