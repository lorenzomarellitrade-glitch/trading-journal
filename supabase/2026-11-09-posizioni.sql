-- Trading journal 2026-11-09: due posizioni per trade (Lore). Esempio: {"rischio1":1,"rr1":1,"esito1":"tp","esito2":"be","esito2_pct":null}
-- Il rischio totale resta in "rischio", l'RR del TP finale in "rr", l'esito totale in "esito_pct" e "r".
-- Incollare nel SQL Editor di Supabase ed eseguire PRIMA del deploy. Idempotente. Posizione unica = null.
alter table public.journal_trade add column if not exists posizioni jsonb;
