# Stato · trading-journal

_Aggiornato: 2026-11-11_

**Fatto:** journal nuovo al posto dell'app React, nello stesso repo e allo stesso indirizzo. Supabase riattivato (era in pausa), tabella `journal_trade` e bucket `screenshot` creati. Test: 30 di logica + 129 di interfaccia, tutti verdi. Palette mono, verde alternativa.
**Manca:** prova vera di Lore con login, un trade con screenshot incollato e un link TradingView.
**Prossimo passo:** Lore entra e registra il primo trade; Sara legge i trade solo se Lore lo chiede (per ora nessun accesso automatico all'archivio).

**2026-11-04 (Lore):** il journal personale si rifà da zero; questa cartella lo ospita (prima era l'app React, ora in storia git).

**2026-11-09 (Lore):** apertura con rischio % (precompilato 2 %) e RR scritto `1:2`; SL e TP in % li calcola il journal. Chiusura a pulsanti: TP preso / SL preso / pareggio / altro (esito a mano, R = esito / rischio). Colonna nuova `rr`: `supabase/2026-11-09-rr.sql` da eseguire nel SQL Editor PRIMA del deploy. Test: 43 logica + 161 interfaccia, verdi. SQL eseguito da Lore e journal pubblicato il 2026-11-09, controllato online. Prossimo passo: Lore apre e chiude il primo trade vero con RR.

**2026-11-09 (Lore), due posizioni:** trade diviso in due (di base 1 % + 1 %, modificabile): pos. 1 a TP1 (1:1), pos. 2 al TP finale; chiusura a pulsanti per posizione, esito e R totali calcolati. Sul FOREX parte con due posizioni. Colonna `posizioni` (jsonb): `supabase/2026-11-09-posizioni.sql` eseguito da Lore; pubblicato il 2026-11-09 e controllato online. Test: 54 logica + 209 interfaccia, verdi; revisore fatto.

**2026-11-11 (Lore), diario di sessione:** il journal diventa un diario della strategia. La Sessione prende il posto della Home: note per time frame con screenshot e bias, il trade come voce del flusso con il "perché entro", la chiusura della sessione (sicurezza, piano), giorni passati scrivibili, finestre orarie solo sull'oro. Statistiche sul bias per time frame e sulla sicurezza, e un file da scaricare per il resoconto di Sara. Anteprima approvata: `1-mercati/trading/journal-app/anteprima-diario.html`. Test: 73 logica + 216 interfaccia, verdi; revisore fatto (6 errori corretti: neutro che annulla il bias, salvataggio a metà senza doppioni, screenshot falliti che restano, cancellazioni dopo il salvataggio, clic bloccati durante il salvataggio, link mancanti nel file per Sara). **Da fare prima del deploy:** Lore esegue `supabase/2026-11-11-diario.sql` nel SQL Editor. Poi deploy con il suo OK.

**2026-11-11 (Lore), statistiche del diario:** tolte checklist (ricompare da sola con 5+ trade spuntati), confluenze e "come ero prima". Nuove: piano sì/no, tutti i time frame d'accordo, bias per time frame, sicurezza, parole della strategia nel "perché entro", pazienza (minuti dalla prima nota), finestre oro, costanza 30 giorni, "Quando fai il tuo" (trade da piano vinti), risultato in fondo. Promemoria nella sessione: win rate da piano e ultima lezione. Test: 83 logica + 211 interfaccia, verdi. Anteprima interattiva: `1-mercati/trading/journal-app/anteprima-diario-finale.html`. In attesa dell'OK di Lore sull'anteprima, poi SQL e deploy.
