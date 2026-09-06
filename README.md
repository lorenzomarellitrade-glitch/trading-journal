# Trading Journal

**Online:** https://lorenzomarellitrade-glitch.github.io/trading-journal/

Journal personale per trading XAUUSD con strategia SMC/ICT su due account prop.

A differenza di Tradezella o TraderBuddy, questo journal non traccia solo l'esito
(P&L, win rate, equity) ma soprattutto la **compliance al processo**: se le 5
conferme erano presenti, se lo stop loss è stato spostato, se la finestra oraria
è stata rispettata. È quella la parte che nessuna piattaforma commerciale può dare.

Utente singolo, nessuna registrazione pubblica, nessuna connessione a MetaTrader.

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS v4 (palette definita come token in `src/index.css`)
- Supabase (Postgres + Auth), con Row Level Security su tutte le tabelle
- Recharts per i grafici
- Vitest per i test del modulo di calcolo
- Deploy come sito statico su GitHub Pages

## Requisiti

- Node.js 22 o superiore (LTS consigliata)
- Un progetto Supabase (piano gratuito sufficiente)

## Setup

### 1. Dipendenze

```bash
npm install
```

### 2. Database Supabase

1. Crea un progetto su [supabase.com](https://supabase.com).
2. Apri **SQL Editor**, incolla per intero il contenuto di
   [`supabase/schema.sql`](supabase/schema.sql) ed esegui. Lo script è
   idempotente: crea tabelle, enum, trigger e policy RLS, e può essere
   rieseguito senza errori.
3. Vai in **Authentication → Users → Add user**, crea il tuo utente con email e
   password e spunta *Auto Confirm User*. Non esiste registrazione dall'app.
4. In **Authentication → Providers**, disabilita *Enable sign-ups* così nessun
   altro può registrarsi anche conoscendo l'URL.

### 3. Variabili d'ambiente

Copia `.env.example` in `.env` e compila con i valori da
**Project Settings → API**:

| Variabile                | Dove trovarla                    |
| ------------------------ | -------------------------------- |
| `VITE_SUPABASE_URL`      | Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Project Settings → API → `anon` `public` key |

La chiave `anon` è pensata per stare nel browser: i dati sono protetti dalle
policy RLS, non dalla segretezza della chiave. **Non mettere mai qui la chiave
`service_role`.**

`.env` è in `.gitignore` e non va versionato. Solo `.env.example` sta nel repo.

### 4. Account e limiti

Al primo avvio, dalla schermata **Impostazioni** crea i tuoi due account
(nome, saldo iniziale 100000, valuta USD) e imposta i limiti di perdita
giornaliero e settimanale.

## Comandi

| Comando           | Cosa fa                                        |
| ----------------- | ---------------------------------------------- |
| `npm run dev`     | Server di sviluppo su http://localhost:5173     |
| `npm run build`   | Type-check e build di produzione in `dist/`     |
| `npm run preview` | Anteprima locale della build                    |
| `npm test`        | Test unitari (Vitest), una volta sola           |
| `npm run test:watch` | Test in watch mode                           |
| `npm run deploy`  | Build + pubblicazione su GitHub Pages           |

## Deploy su GitHub Pages

Il progetto usa `base: './'` in `vite.config.ts` e `HashRouter` nel router: gli
URL hanno la forma `/#/statistiche`, così un refresh non produce un 404 e non
serve conoscere il nome del repository in fase di build.

`gh-pages` pubblica il contenuto di `dist/` sul branch omonimo, da cui GitHub
Pages serve il sito. La configurazione è già fatta: **Settings → Pages → Source:
Deploy from a branch → `gh-pages` / `(root)`**.

### Ciclo di aggiornamento

Dopo aver modificato il codice:

```bash
npm test          # i test devono passare
npm run deploy    # compila e ripubblica il sito
git add -A
git commit -m "descrizione della modifica"
git push
```

`npm run deploy` aggiorna **solo il sito**; il `git push` aggiorna il codice
sorgente sul repository. Sono due cose distinte: si può fare l'una senza
l'altra, ma conviene tenerle allineate.

> Le variabili `VITE_*` vengono inlinate nel bundle al momento della build.
> Il sito pubblicato conterrà quindi l'URL del progetto e la chiave `anon`:
> è il funzionamento previsto, ed è sicuro **solo** se le policy RLS sono attive
> e le registrazioni pubbliche sono disabilitate.

## Struttura

```
supabase/schema.sql      Schema completo: tabelle, enum, trigger, policy RLS
src/lib/supabase.ts      Client Supabase tipizzato
src/lib/tipi.ts          Tipi del dominio, allineati a mano con lo schema SQL
src/lib/calcoli.ts       Funzioni pure di calcolo (rischio, RR, P&L, R)
src/auth/                Contesto di autenticazione
src/componenti/          Componenti riusabili
src/pagine/              Calendario, Lista trade, Statistiche, Impostazioni
```

## Regole di calcolo

Nessun valore derivato è salvato nel database: rischio, RR, P&L e R si
ricalcolano sempre da prezzi e lotti, in un solo posto (`src/lib/calcoli.ts`).
Su XAUUSD 1 lotto = 100 once, quindi 1 dollaro di movimento = 100 USD per lotto.

```
rischio_usd     = |entry − stop_loss| × 100 × lotti
rr_pianificato  = |take_profit − entry| / |entry − stop_loss|
pnl_usd         = (exit − entry) × 100 × lotti × (direzione === 'long' ? 1 : −1)
r_realizzato    = pnl_usd / rischio_usd
pnl_percent     = pnl_usd / saldo_iniziale_account × 100
rischio_percent = rischio_usd / saldo_iniziale_account × 100
```
