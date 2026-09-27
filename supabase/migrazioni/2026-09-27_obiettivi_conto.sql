-- ============================================================================
-- Migrazione 2026-09-27 — regole della prop per singolo conto
--
-- Tre valori facoltativi per account, in percentuale del saldo iniziale:
--   target_profitto_percent      obiettivo da raggiungere      (es. 5)
--   drawdown_giornaliero_percent perdita massima in una giornata (es. 4)
--   drawdown_massimo_percent     perdita massima complessiva    (es. 10)
--
-- Restano NULL sui conti che non hanno regole da rispettare, tipicamente un
-- conto reale personale: in quel caso l'app non mostra nessuna barra invece di
-- inventarsi un limite.
--
-- Il drawdown è inteso come statico: una soglia fissa sotto il saldo iniziale,
-- che non si alza seguendo i massimi raggiunti.
--
-- Si esegue in un passaggio solo ed è ripetibile senza danni.
-- ============================================================================

alter table public.accounts
  add column if not exists target_profitto_percent numeric(5, 2)
    check (target_profitto_percent is null or target_profitto_percent > 0),
  add column if not exists drawdown_giornaliero_percent numeric(5, 2)
    check (drawdown_giornaliero_percent is null or drawdown_giornaliero_percent > 0),
  add column if not exists drawdown_massimo_percent numeric(5, 2)
    check (drawdown_massimo_percent is null or drawdown_massimo_percent > 0);

-- Verifica: devono comparire le tre colonne, vuote per tutti i conti.
select nome, attivo,
       target_profitto_percent,
       drawdown_giornaliero_percent,
       drawdown_massimo_percent
from public.accounts
order by nome;
