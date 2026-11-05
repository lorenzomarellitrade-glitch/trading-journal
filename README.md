# Journal di Lore

App web del journal di trading, personale: XAUUSD (intraday) e FOREX (swing). Risultati solo in percentuale sul conto, statistiche centrate sulla strategia (checklist, confluenze, stato prima della sessione), calendario per registrare i trade, screenshot incollati e immagine di TradingView.

- Online: GitHub Pages, ramo `gh-pages` (`./deploy.sh`).
- Archivio: Supabase (tabella `journal_trade` + bucket privato `screenshot`), login con mail e password, solo i propri dati (RLS). Schema in `supabase/schema-2026-11-journal.sql`.
- Niente build: `index.html` + `logica.js` (funzioni pure) + `app.js` (interfaccia e archivio) + `config.js` (generato dal deploy, non versionato; esempio in `config.example.js`).

## Test
```
./test/esegui.sh
```
Logica in node (`test/test-logica.js`) e interfaccia in Chrome headless con un Supabase finto (`test/mock-supabase.js`, `test/test-app.js`) in tre scenari: archivio pieno, vuoto, senza sessione (login). Il deploy si rifiuta se un test fallisce.

## Uso in locale
Copia `config.example.js` in `config.js` con i valori del progetto, poi apri `index.html` da un server statico (es. `python3 -m http.server`).
