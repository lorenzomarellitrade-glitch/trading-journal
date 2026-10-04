-- ============================================================================
-- Migrazione 2026-10-04 — diario di trading: pagina del giorno e settimana
--
-- Il metodo è "scrivi prima, verifica dopo":
--   - la parte PRIMA di una pagina, una volta bloccata, non si modifica più;
--     se il piano cambia, lo si annota nella parte DOPO;
--   - la parte DOPO si può compilare solo dopo aver bloccato il piano.
-- Entrambe le regole sono imposte qui nel database, non solo nell'interfaccia.
--
-- Si esegue in un passaggio solo ed è ripetibile senza danni. L'enum
-- piano_rispettato è nuovo, quindi si può usare subito nello stesso script.
-- ============================================================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'piano_rispettato') then
    create type piano_rispettato as enum ('si', 'no', 'in-parte');
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Pagina del giorno: una per ogni seduta in cui si opera
-- ---------------------------------------------------------------------------
create table if not exists public.diario_pagine (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,

  data       date not null default current_date,
  strumento  text,
  time_frame text,

  -- PRIMA · dichiaro
  cosa_vedo        text,
  grafici_prima    text,
  ingresso         text,
  stop             text,
  uscita           text,
  rischio          text,
  cambierebbe_idea text,
  notizie_attese   text,

  -- Quando è stato bloccato il piano. null = la pagina è ancora una bozza.
  piano_bloccato_at timestamptz,

  -- DOPO · verifico
  cosa_successo            text,
  risultato                text,
  piano_rispettato         piano_rispettato,
  cambiamenti              text,
  riflesso_incassato_presto boolean not null default false,
  riflesso_tenuto_perdita   boolean not null default false,
  riflesso_rincorso_prezzo  boolean not null default false,
  riflesso_seguito_regola   boolean not null default false,
  prossima_volta           text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- La verifica si scrive solo dopo aver dichiarato il piano.
  constraint diario_dopo_solo_se_bloccato check (
    piano_bloccato_at is not null or (
      cosa_successo is null and risultato is null and piano_rispettato is null
      and cambiamenti is null and prossima_volta is null
      and not riflesso_incassato_presto and not riflesso_tenuto_perdita
      and not riflesso_rincorso_prezzo and not riflesso_seguito_regola
    )
  )
);

-- Link ai grafici visti prima di entrare, uno per riga. Aggiunto dopo la
-- prima versione dello script: chi l'aveva già eseguito riceve la colonna qui.
alter table public.diario_pagine add column if not exists grafici_prima text;

create index if not exists diario_pagine_user_data_idx
  on public.diario_pagine (user_id, data desc, created_at desc);

drop trigger if exists diario_pagine_updated_at on public.diario_pagine;
create trigger diario_pagine_updated_at
  before update on public.diario_pagine
  for each row execute function public.tocca_updated_at();

-- Una volta bloccato, il piano non si tocca più: né dall'app né da altrove.
create or replace function public.diario_blocca_prima()
returns trigger
language plpgsql
as $$
begin
  if old.piano_bloccato_at is not null and (
       new.data              is distinct from old.data
    or new.strumento         is distinct from old.strumento
    or new.time_frame        is distinct from old.time_frame
    or new.cosa_vedo         is distinct from old.cosa_vedo
    or new.grafici_prima     is distinct from old.grafici_prima
    or new.ingresso          is distinct from old.ingresso
    or new.stop              is distinct from old.stop
    or new.uscita            is distinct from old.uscita
    or new.rischio           is distinct from old.rischio
    or new.cambierebbe_idea  is distinct from old.cambierebbe_idea
    or new.notizie_attese    is distinct from old.notizie_attese
    or new.piano_bloccato_at is distinct from old.piano_bloccato_at
  ) then
    raise exception 'Il piano è bloccato: annota le modifiche in "Se l''ho cambiato".';
  end if;
  return new;
end;
$$;

drop trigger if exists diario_pagine_blocca_prima on public.diario_pagine;
create trigger diario_pagine_blocca_prima
  before update on public.diario_pagine
  for each row execute function public.diario_blocca_prima();

-- ---------------------------------------------------------------------------
-- Riepilogo della settimana: uno per settimana, compilato a mano
-- ---------------------------------------------------------------------------
create table if not exists public.diario_settimane (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,

  -- Il lunedì della settimana: identifica la settimana.
  settimana_dal date not null,
  strumenti     text,

  -- Le righe da lunedì a venerdì: { "lun": { operazioni, piano, risultato, nota }, ... }
  giorni jsonb not null default '{}'::jsonb,

  fatto_meglio    text,
  errore_ripetuto text,
  riflesso        text,
  regola          text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint diario_settimane_unica  unique (user_id, settimana_dal),
  constraint diario_settimane_lunedi check (extract(isodow from settimana_dal) = 1)
);

drop trigger if exists diario_settimane_updated_at on public.diario_settimane;
create trigger diario_settimane_updated_at
  before update on public.diario_settimane
  for each row execute function public.tocca_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.diario_pagine    enable row level security;
alter table public.diario_settimane enable row level security;

drop policy if exists "diario pagine select proprio" on public.diario_pagine;
drop policy if exists "diario pagine insert proprio" on public.diario_pagine;
drop policy if exists "diario pagine update proprio" on public.diario_pagine;
drop policy if exists "diario pagine delete proprio" on public.diario_pagine;

create policy "diario pagine select proprio" on public.diario_pagine
  for select to authenticated using (auth.uid() = user_id);
create policy "diario pagine insert proprio" on public.diario_pagine
  for insert to authenticated with check (auth.uid() = user_id);
create policy "diario pagine update proprio" on public.diario_pagine
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "diario pagine delete proprio" on public.diario_pagine
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "diario settimane select proprio" on public.diario_settimane;
drop policy if exists "diario settimane insert proprio" on public.diario_settimane;
drop policy if exists "diario settimane update proprio" on public.diario_settimane;
drop policy if exists "diario settimane delete proprio" on public.diario_settimane;

create policy "diario settimane select proprio" on public.diario_settimane
  for select to authenticated using (auth.uid() = user_id);
create policy "diario settimane insert proprio" on public.diario_settimane
  for insert to authenticated with check (auth.uid() = user_id);
create policy "diario settimane update proprio" on public.diario_settimane
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "diario settimane delete proprio" on public.diario_settimane
  for delete to authenticated using (auth.uid() = user_id);

notify pgrst, 'reload schema';

-- Verifica: due tabelle nuove, vuote.
select
  (select count(*) from public.diario_pagine)    as pagine,
  (select count(*) from public.diario_settimane) as settimane;
