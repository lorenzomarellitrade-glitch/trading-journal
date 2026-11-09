-- Trading journal 2026-11-09: colonna RR (Lore). L'RR si scrive 1:2 e qui si salva il secondo numero (2).
-- Incollare nel SQL Editor di Supabase ed eseguire PRIMA del deploy. Idempotente. I trade vecchi restano senza RR.
alter table public.journal_trade add column if not exists rr numeric(6,2);
