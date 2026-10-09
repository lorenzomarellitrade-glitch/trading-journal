# Ricerca per la Home

Data: 2026-10-09. Legenda: **[F]** fatto verificato sulla fonte, **[S]** fonte secondaria (blog, analisi di terzi, guide non ufficiali), **[O]** opinione mia.

## Sintesi della ricerca

### Journal di trading
- **[F]** Tradezella divide la dashboard in una parte alta con i numeri chiave (Net P&L, win % dei trade e delle giornate, profit factor, media vincita/perdita, expectancy, serie di giorni e di trade, drawdown massimo) e una parte bassa con grafici: P&L cumulato giornaliero, P&L netto giornaliero a colonne, calendario colorato per giornate vinte/perse/in pari, un "Calendar Mini" compatto e un "Progress Tracker" sulla costanza nelle regole. Ha anche uno "Zella Score" che combina win %, profit factor e media vincita/perdita. → [Tradezella, dashboard widgets](https://help.tradezella.com/en/articles/7118437-understanding-dashboard-widgets-and-stats), [release notes](https://www.tradezella.com/blog/february-release-notes)
- **[F]** Tradervue mette il P&L cumulato e il drawdown cumulato nei report, e nella panoramica un gruppo "Recent" con gli ultimi 30 giorni di trading (P&L giornaliero, cumulato, win %). Ha anche medie mobili di P&L e win % sugli ultimi n trade. → [Tradervue, Win/Loss/Expectation](https://www.tradervue.com/help/reports_wl), [Cumulative P&L](https://help.tradervue.com/article/2838-cumulative-p-l)
- **[S]** Edgewonk ha un "Tiltmeter" che mostra quanto si segue il piano (rosso molte violazioni, verde aderenza) e più di una decina di grafici (equity, drawdown, win rate nel tempo, calendario dei profitti). → [Edgewonk blog](https://edgewonk.com/blog/edgewonk-review-guide), [daytrading.com](https://www.daytrading.com/edgewonk)
- **Non trovato:** documentazione pubblica di TraderSync sulla dashboard. Non riporto nulla su di essa.
- **[O]** Il tracciamento della disciplina c'è anche altrove (Tiltmeter, Progress Tracker), ma come una voce fra tante. Qui resta al centro: punteggio Processo in alto a sinistra.

### Prodotti molto curati
- **[F]** Stripe, nelle linee guida per i grafici: mostrare il valore attuale **sopra** il grafico, «così l'utente ha la risposta prima di guardare l'andamento»; le sparkline sono «una linea compatta senza assi né etichette», accanto a un KPI, e non vanno usate «quando servono valori precisi: mostrano la forma, non i numeri». Altezze fisse per evitare salti del layout, al massimo tre grafici per riga. → [Stripe, Chart layout](https://docs.stripe.com/stripe-apps/patterns/chart-layout)
- **[F]** Linear, nel suo redesign: obiettivo «ridurre il rumore visivo»; meno colore d'accento per un aspetto «più neutro e senza tempo»; elevazione e gerarchia ottenute con **opacità di bianco e nero** sulle superfici; temi generati in LCH, uno spazio colore in cui la luminosità percepita è uniforme. → [Linear, How we redesigned the Linear UI](https://linear.app/now/how-we-redesigned-the-linear-ui)
- **[F]** Tufte definisce la sparkline come «un grafico piccolo, intenso, semplice, della dimensione di una parola, con la risoluzione della tipografia». → [Tufte, Sparkline theory and practice](https://www.edwardtufte.com/notebook/sparkline-theory-and-practice-edward-tufte/)
- **[S]** Vercel/Geist: cifre tabulari (`tnum`) sui dati e titoli con spaziatura stretta. Fonti non ufficiali. → [Geist, guida di terzi](https://skills.sh/vercel/vercel-plugin/geist)
- **[S]** Arc: superfici traslucide su gradienti saturi, pochi bordi, ombre morbide. Fonti non ufficiali, valori non verificati. → [open-design.ai, Arc](https://open-design.ai/systems/arc/)
- **[S]** Gerarchia: il numero più importante in alto a sinistra, più grande, con un riferimento (obiettivo, periodo precedente) per capire se è buono. Sono blog di settore, non ho trovato la fonte Nielsen Norman. → [Geckoboard, guida](https://www.geckoboard.com/uploads/geckoboard-dashboard-design-and-build-a-great-dashboard.pdf), [Aufait UX](https://www.aufaitux.com/blog/good-dashboard-design/)

### Animazioni
- **[F]** `prefers-reduced-motion: reduce` indica che l'utente ha chiesto di ridurre il movimento non essenziale; scalare o spostare oggetti grandi può dare fastidio a chi ha disturbi vestibolari. → [MDN, prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- **[S]** Durate tipiche suggerite: 200-300 ms per cambi di stato, 300-500 ms per cambi di layout, sopra 500 ms per un feedback è troppo. Euristiche, non uno standard. → [Motion design, guida di terzi](https://cdn.jsdelivr.net/npm/@nqlib/nqui@0.6.3/docs/nqui-skills/impeccable/reference/motion-design.md)

## Principi ricavati (opinioni mie)

1. Una sola protagonista per schermata: il P&L del periodo, con la sua curva. Il processo però sta in alto a sinistra, dove l'occhio parte.
2. Prima il numero, poi la forma: ogni micro-grafico sta sotto il valore che spiega, mai al suo posto.
3. Profondità con sfumature dei token (bordo più chiaro in alto, ombra dello sfondo), non con colori nuovi.
4. Animazioni solo per orientare all'apertura o al cambio filtro, brevi, e assenti con movimento ridotto.
5. Niente festeggiamenti: coerente con la bassa carica emotiva del journal.

## Proposte, in ordine di impatto

| # | Proposta | Stato | Perché |
|---|---|---|---|
| 1 | **Card P&L protagonista**: due terzi della riga in alto, numero grande, curva interattiva con tooltip (data e valore) al passaggio del mouse e con le frecce da tastiera | Applicata | È la risposta principale della pagina; il tooltip toglie il bisogno di andare in Statistiche per leggere un giorno |
| 2 | **Processo e Risultati in alto a sinistra**, impilati accanto al P&L | Applicata | Restano in evidenza e Processo prende il posto da cui parte la lettura |
| 3 | **Micro-curve nei riquadri** di win rate, profit factor ed expectancy: andamento cumulato trade dopo trade. Per media vincita/perdita una barra di proporzione | Applicata | Dicono se il numero sta migliorando o peggiorando, senza un grafico in più |
| 4 | **Mappa a calore delle ultime 8 settimane** (lun-ven) nella scheda Costanza, al posto dei quadretti | Applicata | Mostra a colpo d'occhio costanza e buchi; il dettaglio è nel tooltip di ogni giorno |
| 5 | **Anelli di progresso per target e drawdown** nello stato dei conti | Applicata | Riusa il componente del Calendario: stessi numeri, stesso disegno |
| 6 | **Rilievo coerente nei tre temi**: bordo con un filo di luce in alto, ombra morbida dello sfondo, alone leggerissimo del colore del risultato sulla card P&L | Applicata | Separa i piani senza nuovi colori; solo token |
| 7 | **Micro-animazioni**: il P&L conta fino al valore, gli anelli si riempiono, entro 450-500 ms; nessuna con movimento ridotto | Applicata | Orientano all'apertura e al cambio filtro, poi spariscono |
| 8 | **Cifre tabulari e allineamenti**: numeri allineati a destra nelle schede, etichette uniformi | Applicata | Si confrontano i valori senza che le cifre "ballino" |

### Scartate
- **Recharts nella Home**: avrebbe dato tooltip già pronti, ma raddoppia il peso del caricamento iniziale. La curva interattiva è fatta a mano in SVG.
- **Un terzo punteggio sintetico** (alla Zella Score): farebbe concorrenza a Processo e Risultati, che sono il punto del journal.
- **Grafico a colonne del P&L giornaliero**: duplica la mappa a calore e il Calendario.
- **Superfici traslucide e gradienti saturi** (stile Arc): belli, ma riducono il contrasto del testo e alzano la carica emotiva.
- **Dashboard personalizzabile a widget**: complessità alta per un utente solo che sa già cosa vuole vedere.
- **Animazioni d'ingresso delle card** (scorrimenti, dissolvenze a cascata): rallentano la lettura a ogni apertura senza dare informazioni.
