-- ============================================================================
-- Migrazione 2026-09-16 — finestra operativa unica 09:00-12:00
--
-- Va eseguita in DUE passaggi separati nel SQL Editor di Supabase: Postgres
-- non permette di usare un nuovo valore di un enum nella stessa transazione
-- in cui lo si aggiunge.
--
-- I vecchi valori '09:00-10:30' e '12:00-13:00' restano definiti nell'enum
-- (Postgres non consente di rimuoverli) ma dopo la parte 2 nessun trade li usa
-- più e l'app non li propone.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- PARTE 1 — incollare ed eseguire da sola
-- ---------------------------------------------------------------------------
alter type finestra_oraria add value if not exists '09:00-12:00';


-- ---------------------------------------------------------------------------
-- PARTE 2 — incollare ed eseguire dopo la parte 1
--
-- Riclassificazione con la regola nuova:
--   09:00-10:30 era interamente dentro la nuova finestra  → 09:00-12:00
--   12:00-13:00 cade dopo la fine della nuova finestra    → fuori finestra
-- ---------------------------------------------------------------------------
update public.trades set finestra = '09:00-12:00'    where finestra = '09:00-10:30';
update public.trades set finestra = 'fuori finestra' where finestra = '12:00-13:00';

-- Verifica: devono comparire solo 09:00-12:00, fuori finestra ed eventualmente vuoto.
select finestra, count(*) as trade
from public.trades
group by finestra
order by finestra;
