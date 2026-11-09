# Stato · trading-journal

_Aggiornato: 2026-11-09_

**Fatto:** journal nuovo al posto dell'app React, nello stesso repo e allo stesso indirizzo. Supabase riattivato (era in pausa), tabella `journal_trade` e bucket `screenshot` creati. Test: 30 di logica + 129 di interfaccia, tutti verdi. Palette mono, verde alternativa.
**Manca:** prova vera di Lore con login, un trade con screenshot incollato e un link TradingView.
**Prossimo passo:** Lore entra e registra il primo trade; Sara legge i trade solo se Lore lo chiede (per ora nessun accesso automatico all'archivio).

**2026-11-04 (Lore):** il journal personale si rifà da zero; questa cartella lo ospita (prima era l'app React, ora in storia git).

**2026-11-09 (Lore):** apertura con rischio % (precompilato 2 %) e RR scritto `1:2`; SL e TP in % li calcola il journal. Chiusura a pulsanti: TP preso / SL preso / pareggio / altro (esito a mano, R = esito / rischio). Colonna nuova `rr`: `supabase/2026-11-09-rr.sql` da eseguire nel SQL Editor PRIMA del deploy. Test: 43 logica + 161 interfaccia, verdi. SQL eseguito da Lore e journal pubblicato il 2026-11-09, controllato online. Prossimo passo: Lore apre e chiude il primo trade vero con RR.

**2026-11-09 (Lore), due posizioni:** trade diviso in due (di base 1 % + 1 %, modificabile): pos. 1 a TP1 (1:1), pos. 2 al TP finale; chiusura a pulsanti per posizione, esito e R totali calcolati. Sul FOREX parte con due posizioni. Colonna `posizioni` (jsonb): `supabase/2026-11-09-posizioni.sql` eseguito da Lore; pubblicato il 2026-11-09 e controllato online. Test: 54 logica + 209 interfaccia, verdi; revisore fatto.
