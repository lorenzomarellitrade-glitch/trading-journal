-- Trading journal 2026-11-11: la coppia del Forex (Lore), su note e trade. Es. EURUSD.
-- Incollare nel SQL Editor di Supabase ed eseguire PRIMA di scrivere sul Forex. Idempotente. Le righe esistenti restano senza coppia.

alter table public.journal_trade add column if not exists coppia text;
alter table public.journal_nota  add column if not exists coppia text;
