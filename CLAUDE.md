# CLAUDE.md

Journal di trading personale di Lore, rifatto il 2026-11-05 al posto dell'app React (il codice vecchio resta nella storia di git fino al commit `4bf6d17`). Utente singolo, si usa soprattutto da computer, telefono secondario.

## Cosa fa
- Due strategie con checklist fissa a 5 voci: **XAUUSD** (direzione MTF, PRZ 4H, rifinitura 1H, evidence 15', fallimento e rottura 5') e **FOREX** (direzione MTF, AOI W-D-4H, livello psicologico, evidence 4H, entry 1H). Le voci stanno in `logica.js` (`STRAT`) e si cambiano solo con l'OK di Lore.
- Risultati **solo in % sul conto e in R**, mai in soldi.
- **Rischio e RR (Lore, 2026-11-09):** in apertura rischio % (precompilato 2 %) e RR scritto `1:2`; SL % e TP % calcolati. In chiusura TP / SL / pareggio / altro; esito e R si compilano da soli. **Due posizioni:** rischio diviso (di base a metà), pos. 1 a TP1 (1:1), pos. 2 al TP finale; sul FOREX è la scelta di partenza.
- Stato di Lore prima e dopo: lucido · dubito di me · poco concentrato · ci penso troppo. Confluenze libere, analizzate con/senza.
- **Sessione = diario (Lore, 2026-11-11), al posto della Home.** Il journal è sulla strategia e sulla confidence, non sul risultato. Un flusso per giorno e per mercato: nota libera con time frame, bias (rialzo, ribasso, neutro), testo e screenshot (⌘V). Oro da W a M5, Forex da W a H1. "＋ Entro" registra il trade nel flusso con il "perché entro" (colonna `motivo`); si chiude dalla sua scheda. "Chiudi sessione": sicurezza 1-5, piano sì/no, cosa mi porto via. Si scrive anche nei giorni passati (frecce o data, orario a mano). Finestre 8:00-10:30 e 16:30-19:00 solo sull'oro; il Forex non ha orari. A destra "La mia lettura": l'ultima nota per time frame (W valida 7 giorni, D 3, le altre il giorno stesso).
- **Coppia del Forex (Lore, 2026-11-11):** sul Forex ogni nota e ogni trade ha la sua coppia (colonna `coppia`, es. EURUSD). Pillole sopra il diario per sceglierla o scriverne una nuova; il diario, "La mia lettura" e le statistiche si filtrano per coppia; blocco "Le tue coppie". Una nota senza coppia vale per tutte. Dal compositore il trade Forex vuole la coppia.
- **Aspetto (Lore, 2026-11-11):** liquid glass al massimo della trasparenza, palette "candela" (nero caldo, luce ambra dal basso, testo avorio, tasti crema). La scheda del trade non ha più checklist, confluenze e "come ero prima"; le colonne restano in archivio.
- Statistiche in più: trade a favore o contro il bias di ogni time frame, sicurezza a fine sessione, "Scarica per Sara" (markdown di 30 giorni con link firmati alle immagini validi 10 anni, Lore 2026-11-13: non devono sparire) per il resoconto AI fatto da Sara con il `trading-coach`.
- Calendario: tocco sul giorno = diario di quel giorno; "+ trade" apre la scheda completa. Lista trade a quadrotti o lista con immagine.
- Screenshot incollati (⌘V), trascinati o scelti → bucket Supabase privato. Link TradingView "condividi" → immagine `s3.tradingview.com/snapshots/<lettera>/<id>.png`.

## Struttura
```
index.html      pagina, CSS, login, impostazioni
logica.js       funzioni pure (statistiche, sessioni, conversioni riga<->trade): JL in browser, module in node
app.js          interfaccia, scheda del trade, archivio Supabase, immagini
config.js       URL e chiave anon (generato da deploy.sh, non versionato) · config.example.js
supabase/       schema-2026-11-journal.sql: tabella journal_trade, trigger, RLS, bucket screenshot · 2026-11-09-rr.sql: colonna rr · 2026-11-09-posizioni.sql: colonna posizioni · 2026-11-11-diario.sql: tabella journal_nota e colonna motivo · 2026-11-11-coppia.sql: colonna coppia su note e trade
test/           esegui.sh, test-logica.js, mock-supabase.js, dati-finti.js, test-app.js
deploy.sh       test → dist/ con config.js da .env → push forzato su gh-pages
```

## Regole
- **Ogni modifica passa dai test** (`./test/esegui.sh`) prima di dire che è finita. Una funzione di calcolo nuova va in `logica.js` con il suo test.
- **Mai chiavi nei file versionati**: URL e chiave anon vivono in `.env` (fuori da git) e finiscono solo in `dist/config.js`. Niente service_role, mai.
- **Deploy e push solo con l'OK di Lore**, ogni volta.
- Niente dati di esempio nell'app vera: l'archivio vuoto mostra messaggi, non numeri finti.
- Date come stringhe `AAAA-MM-GG`; mai `new Date("AAAA-MM-GG")` (UTC sposta il giorno).
- Se cambi lo schema: nuovo file datato in `supabase/`, eseguito a mano nel SQL Editor, e aggiorna `rowToT`/`tToRow` in `logica.js` con i test.
- Italiano ovunque: codice, commenti, interfaccia.
- Anteprime e decisioni di stile: `~/lavoro/1-mercati/trading/journal-app/` (anteprima-4 è quella scelta).
