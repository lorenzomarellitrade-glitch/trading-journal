# CLAUDE.md

Journal di trading personale di Lore, rifatto il 2026-11-05 al posto dell'app React (il codice vecchio resta nella storia di git fino al commit `4bf6d17`). Utente singolo, si usa soprattutto da computer, telefono secondario.

## Cosa fa
- Due strategie con checklist fissa a 5 voci: **XAUUSD** (direzione MTF, PRZ 4H, rifinitura 1H, evidence 10', fallimento e rottura 5') e **FOREX** (direzione MTF, AOI W-D-4H, livello psicologico, evidence 4H, entry 1H). Le voci stanno in `logica.js` (`STRAT`) e si cambiano solo con l'OK di Lore.
- Risultati **solo in % sul conto e in R**, mai in soldi.
- Stato di Lore prima e dopo: lucido · dubito di me · poco concentrato · ci penso troppo. Confluenze libere, analizzate con/senza.
- Home da tenere aperta in sessione: orologio, sessioni, le due finestre di Lore (8:00-10:30, 16:30-19:00), come arrivo alla sessione, checklist con win rate, trade aperto, ultima lezione.
- Calendario: tocco sul giorno = nuovo trade con quella data. Lista trade a quadrotti o lista con immagine.
- Screenshot incollati (⌘V), trascinati o scelti → bucket Supabase privato. Link TradingView "condividi" → immagine `s3.tradingview.com/snapshots/<lettera>/<id>.png`.
- Tema scuro, palette **mono** di partenza, verde come alternativa (⚙).

## Struttura
```
index.html      pagina, CSS, login, impostazioni
logica.js       funzioni pure (statistiche, sessioni, conversioni riga<->trade): JL in browser, module in node
app.js          interfaccia, scheda del trade, archivio Supabase, immagini
config.js       URL e chiave anon (generato da deploy.sh, non versionato) · config.example.js
supabase/       schema-2026-11-journal.sql: tabella journal_trade, trigger, RLS, bucket screenshot
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
