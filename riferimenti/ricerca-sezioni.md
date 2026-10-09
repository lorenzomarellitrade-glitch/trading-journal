# Ricerca e proposte per le sezioni

Data: 2026-10-10. Legenda: **[F]** fatto verificato sulla fonte, **[S]** fonte secondaria o riassunto non verificato sulla pagina originale, **[O]** opinione mia. Il metodo e le regole sono quelli del CLAUDE.md; la ricerca sulla Home è in `ricerca-home.md`.

## Sintesi della ricerca

### Journal di trading
- **[F]** Tradezella, inserimento manuale: si scelgono strumento e simbolo, poi ogni esecuzione con data, ora, quantità, lato e prezzo. → [Tradezella, add a trade manually](https://help.tradezella.com/en/articles/5829532-how-to-add-a-trade-manually-in-tradezella)
- **[F]** Tradezella, strategie (prima "playbook"): regole personali per ogni strategia, e su ogni trade si vede «quante regole sono state seguite». → [Tradezella, playbook](https://help.tradezella.com/en/articles/7020769-getting-started-with-the-playbook)
- **[S]** Tradezella ha note giornaliere che valgono per tutta la giornata e compaiono sui trade dello stesso giorno, nel Daily Journal e nel Notebook. Non sono riuscito a confermarlo sulla pagina originale. → [Tradezella, help center](https://help.tradezella.com/en/articles/13863136-getting-started-with-tradezella)
- **[S]** Tradervue: nel dettaglio del trade, grafici su più timeframe con le esecuzioni disegnate sopra; note in markdown; tag per filtrare. Fonti datate. → [Warrior Trading, recensione](https://www.warriortrading.com/tradervue-trading-journal-review/), [Tradervue, immagini](https://smbu.tradervue.com/help/images)
- **[F]** Tradervue: andamento di P&L e win % come medie mobili sugli ultimi n trade, e report per periodo. → [Tradervue, Win/Loss/Expectation](https://www.tradervue.com/help/reports_wl)
- **Non trovato:** documentazione pubblica di Edgewonk e TraderSync su statistiche per ora del giorno o per setup. Non riporto nulla.
- **[O]** Il "quante regole hai seguito" di Tradezella è un contatore accanto al trade. Qui è il cuore: le cinque verifiche del processo devono essere visibili mentre si compila, non solo dopo.

### Prodotti curati
- **[F]** Linear: la creazione si apre con un tasto; Ctrl/Cmd+Shift+Invio salva e apre subito una nuova bozza; nel modulo di creazione funzionano le scorciatoie, tranne quando si sta scrivendo nel titolo o nella descrizione. → [Linear, Creating issues](https://linear.app/docs/creating-issues)
- **[F]** Baymard, moduli: una colonna principale, etichette sopra i campi, «rilevare e precompilare i valori quando possibile», nascondere i campi facoltativi poco usati, pulsanti al posto dei menu a tendina per poche scelte. → [Baymard, Form design](https://baymard.com/learn/form-design)
- **[F]** Stripe: il valore prima del grafico, al massimo tre grafici per riga, altezze fisse per non far saltare il layout. → [Stripe, Chart layout](https://docs.stripe.com/stripe-apps/patterns/chart-layout)
- **[F]** Stripe Apps: elenco che porta al dettaglio, con filtri a "chip" sulla tabella e una pagina di dettaglio a due colonne (principale e secondaria). → [Stripe, Full-page apps](https://docs.stripe.com/stripe-apps/patterns/full-page-apps.md)
- **[S]** Notion: una vista calendario su un database collega ogni giorno alle sue pagine; i modelli di journal mettono insieme registro giornaliero e calendario. Fonti di terzi. → [Notion for journaling](https://blog.mylifenote.ai/notion-for-journaling/)
- **[F]** Login: `type="email"` con `autocomplete="username"` e `autocomplete="current-password"` per far funzionare i gestori di password; il mostra/nascondi password deve essere un `<button>` con `aria-label`. → [Evil Martians, login forms](https://evilmartians.com/chronicles/html-best-practices-for-login-and-signup-forms)
- **[S]** Grafici: per confrontare categorie le barre battono le torte. Fonti divulgative, non ho trovato il testo originale di Stephen Few. → [1ka, bar vs pie](https://www.1ka.si/d/en/help/faq/when-is-it-better-to-use-bar-chart-instead-of-pie-chart-or-vice-versa)
- **[S]** Navigazione: le voci più usate all'inizio o alla fine (effetto della posizione seriale), al massimo sette. Fonti divulgative. → [LogRocket](https://blog.logrocket.com/ux-design/serial-position-effect-ux-design/)

## Principi (opinioni mie)
1. Nel form l'ordine è quello della giornata: contesto e checklist prima, prezzi poi, comportamento e note alla fine.
2. Le cinque verifiche del processo stanno sempre in vista mentre si compila, con un verdetto chiaro.
3. Ogni pagina che parla di un giorno mostra i trade di quel giorno.
4. Prima il dato che risponde alla domanda, poi il dettaglio.
5. Le scorciatoie solo dove si scrive molto (form, journal), e mai mentre si sta scrivendo.

---

## 1. FormTrade e Calendario

**Problemi trovati**
- Il campo **F+R (prima o seconda)** esiste nel database e nell'export CSV, ma il form non lo chiede. **Correzione:** non è una dimenticanza. Il selettore è stato tolto di proposito il 16/09/2026 (commit `9fbe6dc`), insieme al confronto in Statistiche. L'ho rimesso perché ora viene chiesto il confronto per prima/seconda F+R; va confermato da Lore.
- Il verdetto sul processo è sparso: conferme in alto, finestra nel contesto, stop/uscita/idea nella scheda "Comportamento" in fondo.
- Con due conti, prezzi identici vanno scritti due volte.
- La finestra si sceglie a mano anche quando l'ora d'entrata la dice già.
- I pulsanti di salvataggio sono solo in fondo, dopo una pagina lunga.
- Calendario: la casella del giorno dice il P&L ma non se il processo è stato seguito; il riepilogo del mese non ha il punteggio Processo.

| # | Proposta | Criterio | Stato |
|---|---|---|---|
| 1 | Barra fissa in basso con le **cinque verifiche del processo** in tempo reale (✓/✗/—), punteggio Processo del trade, e Salva / Salva e nuovo / Annulla | Vedere subito le cose importanti; salvataggio sempre a portata | Applicata |
| 2 | **F+R prima/seconda** accanto alla conferma "Fallimento + Rottura" | Serve al confronto per F+R chiesto per Statistiche. Riprende una scelta tolta il 16/09: da confermare | Applicata, da confermare |
| 3 | **Finestra proposta dall'ora** d'entrata (09:00-11:59 → in finestra), solo se non scelta a mano | Un clic in meno, nessuna scelta sovrascritta | Applicata |
| 4 | **"Copia prezzi dal conto X"** sul secondo conto; i lotti restano propri | Meno battute | Applicata |
| 5 | **Ctrl+Invio** salva, **Ctrl+Maiusc+Invio** salva e apre un nuovo trade | Più veloce in serie | Applicata |
| 6 | Calendario: in ogni casella il numero di trade **5/5 sul totale**; nel riepilogo del mese il **punteggio Processo**; nel pannello del giorno i flag e il link alla pagina di diario del giorno | Processo al centro anche nel calendario | Applicata |
| — | Esito dedotto in automatico da exit ed entry | Scartata: l'aggregazione lo deduce già se manca; compilarlo da solo nasconderebbe una scelta | Scartata |

## 2. ListaTrade e ResocontoTrade

| # | Proposta | Criterio | Stato |
|---|---|---|---|
| 1 | Nelle schede della griglia le **cinque verifiche** come piccoli indicatori, non solo conferme ed R | Il processo si vede scorrendo | Applicata |
| 2 | Tasto **/** per andare alla ricerca | Più veloce | Applicata |
| 3 | Resoconto: in cima un blocco **Processo** con le cinque verifiche e il punteggio del trade, prima di mercato e prezzi; la F+R nella checklist | Prima le cose importanti | Applicata |
| 4 | Resoconto: **trade precedente / successivo** con i pulsanti e con le frecce ← → | Ripassare una giornata senza tornare alla lista | Applicata |
| — | Raggruppare la griglia per giorno | Scartata per ora: con i filtri per data e la vista Calendario è un doppione | Scartata |

## 3. Statistiche

| # | Proposta | Criterio | Stato |
|---|---|---|---|
| 1 | Nuovi confronti: **a favore o contro il bias Daily**, idem **H4**, **prima o seconda F+R** | Le domande del metodo SMC/ICT | Applicata |
| 2 | Nuova tabella **per ora di entrata** accanto a quella per giorno della settimana | Capire quando si opera meglio dentro la finestra | Applicata |
| 3 | **Indice in cima** (Processo · Contesto · Tempo · Andamento) e sezioni con titolo, nello stesso ordine | Trovare subito la parte che serve | Applicata |
| 4 | Le tre sezioni in ordine di importanza: processo, poi contesto di mercato, poi tempo, poi grafici | Prima le cose importanti | Applicata |
| — | Grafici a torta per le distribuzioni | Scartata: le barre e le tabelle confrontano meglio | Scartata |

## 4. Journal

| # | Proposta | Criterio | Stato |
|---|---|---|---|
| 1 | Accanto a ogni data, nei canali XAUUSD e nello Stato mentale, il **riassunto dei trade del giorno** (numero, P&L, quanti 5/5) con link al calendario | Collegamento con i trade del giorno | Applicata |
| 2 | Area messaggi con il rilievo delle card e un'altezza più generosa su desktop | Lettura più ordinata | Applicata |
| — | Collegare ogni messaggio a un trade preciso | Scartata: richiederebbe un campo nuovo nello schema, che non va toccato | Scartata |

## 5. Diario, PaginaDiario, SettimanaDiario

| # | Proposta | Criterio | Stato |
|---|---|---|---|
| 1 | Pagina del giorno: riquadro **Trade del giorno** (orario, direzione, conferme, P&L, link) sopra la verifica | Collegamento con i trade, verifica sui fatti | Applicata |
| 2 | Elenco del diario: per ogni pagina il **riassunto dei trade** di quella data | Vedere subito se piano e trade combaciano | Applicata |
| 3 | Settimana: per ogni giorno i **dati del journal** (trade, P&L, 5/5) e un pulsante che li copia nei campi "Operazioni" e "Risultato" | Meno battute, niente numeri ricopiati a mano | Applicata |
| — | Compilare da solo "Piano rispettato" dai trade | Scartata: è un giudizio che spetta a chi scrive | Scartata |

## 6. Impostazioni, Login e navigazione

| # | Proposta | Criterio | Stato |
|---|---|---|---|
| 1 | Navigazione: **Home · Calendario · Trade · Diario · Journal · Statistiche · Impostazioni**. Gli strumenti di scrittura stanno vicini, l'analisi verso la fine, le impostazioni per ultime | Ordine della giornata | Applicata |
| 2 | Pulsante **"+ Trade"** sempre visibile nella barra in alto (desktop). Per fargli spazio l'email diventa il suggerimento del pulsante Esci, e il selettore del tema in alto compare da 1280 px in su (sotto resta in Impostazioni) | Inserire un trade da qualsiasi pagina | Applicata |
| 3 | Login: `autocomplete` corretti, mostra/nascondi password, rilievo | Accesso più rapido con il gestore di password | Applicata |
| 4 | Impostazioni: card con rilievo, conferma di salvataggio visibile accanto al pulsante | Salvataggio più chiaro | Applicata |
