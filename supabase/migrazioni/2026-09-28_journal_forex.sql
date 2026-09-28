-- ============================================================================
-- Migrazione 2026-09-28 — journal diviso per mercato, con la parte Forex
--
-- Ogni messaggio appartiene a un mercato (XAUUSD o Forex), tranne quelli dello
-- Stato mentale, che è in comune: lo stato mentale è tuo, non del mercato.
-- I messaggi Forex hanno anche la coppia, obbligatoria nei canali dei trade e
-- facoltativa in Visione.
--
-- Si esegue in un passaggio solo ed è ripetibile senza danni.
--
-- Nota tecnica: il valore 'visione' aggiunto all'enum dei canali non viene
-- usato in questo script, perché Postgres non permette di usare un valore
-- appena aggiunto prima della fine della transazione. Per questo i vincoli
-- qui sotto nominano solo i canali che esistevano già.
-- ============================================================================

-- Nuovo canale per l'analisi prima di entrare.
alter type canale_journal add value if not exists 'visione' before 'tp';

-- Il mercato di appartenenza. Nuovo tipo: si può usare subito.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'mercato_journal') then
    create type mercato_journal as enum ('xauusd', 'forex');
  end if;
end
$$;

alter table public.note_journal
  add column if not exists mercato mercato_journal,
  add column if not exists coppia  text;

-- I messaggi scritti finora sono tutti sull'oro, tranne lo stato mentale.
update public.note_journal
set mercato = 'xauusd'
where canale <> 'stato-mentale' and mercato is null;

-- Vincoli, rimossi e ricreati per poter rieseguire lo script.
alter table public.note_journal drop constraint if exists note_mercato_coerente;
alter table public.note_journal drop constraint if exists note_coppia_solo_forex;
alter table public.note_journal drop constraint if exists note_coppia_formato;
alter table public.note_journal drop constraint if exists note_coppia_sui_trade;

-- Lo stato mentale non ha mercato; tutti gli altri canali sì.
alter table public.note_journal add constraint note_mercato_coerente
  check ((canale = 'stato-mentale') = (mercato is null));

-- La coppia esiste solo sul forex, e ha la forma EURUSD.
alter table public.note_journal add constraint note_coppia_solo_forex
  check (coppia is null or mercato = 'forex');
alter table public.note_journal add constraint note_coppia_formato
  check (coppia is null or coppia ~ '^[A-Z]{6}$');

-- Nei canali dei trade forex la coppia è obbligatoria.
alter table public.note_journal add constraint note_coppia_sui_trade
  check (
    mercato is distinct from 'forex'
    or canale not in ('tp', 'stop', 'be', 'miss')
    or coppia is not null
  );

create index if not exists note_journal_mercato_idx
  on public.note_journal (user_id, mercato, canale, data, created_at);

notify pgrst, 'reload schema';

-- Verifica: i messaggi esistenti devono risultare su xauusd, tranne lo stato mentale.
select canale, mercato, count(*) as messaggi
from public.note_journal
group by canale, mercato
order by canale, mercato;
