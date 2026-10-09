# Ricerca sui colori del tema scuro

Sintesi per scegliere il tema del journal. Data della ricerca: 2026-10-09.
Legenda: **[F]** fatto verificato su una fonte, **[C]** calcolato da me (metodo indicato), **[O]** opinione o interpretazione.

## 1. Cosa usano le piattaforme

- **[F]** TradingView, nella sua Charting Library, ha come colori predefiniti delle candele `#089981` (rialzo) e `#F23645` (ribasso); nel tema scuro lo sfondo predefinito del grafico è a gradiente. → [TradingView, ChartPropertiesOverrides](https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Charting_Library.ChartPropertiesOverrides)
- **[F]** Tradezella ha un interruttore chiaro/scuro e avverte che alcune pagine possono restare in modalità chiara. → [Tradezella, Enable dark mode](https://help.tradezella.com/en/articles/8470697-enable-dark-mode)
- **Non trovato:** i codici colore dei temi di Tradezella, TraderSync ed Edgewonk. Non esistono fonti pubbliche affidabili: l'unico modo è ispezionarli a mano. Il valore `#131722` che circola come sfondo scuro di TradingView **non sono riuscito a verificarlo**.
- **[O]** Tutte le piattaforme di trading tengono verde/rosso per rialzo/ribasso: è una convenzione, non una scelta di leggibilità. Non è universale: nella Cina continentale il rosso indica il rialzo. → [EU Data visualisation guide](https://data.europa.eu/apps/data-visualisation-guide/colour-connotations), [Behavioral Economics, *When red means go*](https://behavioraleconomics.com/when-red-means-go)

## 2. Tema scuro e sessioni lunghe

- **[F]** Material Design raccomanda per lo sfondo un grigio molto scuro, `#121212`, e non il nero puro; il testo bianco pieno su fondo scuro «può nuocere alla leggibilità», e i colori molto saturi «vibrano» sui fondi scuri, quindi si usano varianti più chiare. Testo principale all'87% di opacità, secondario al 60%. → [Google Codelab, Material dark theme](https://codelabs.developers.google.com/codelabs/design-material-darktheme/), [Material Design 2, Dark theme](https://m2.material.io/design/color/dark-theme)
- **[F]** Su fatica visiva le prove sono **deboli e contrastanti**. Uno studio del 2025 su 30 utenti di tablet non trova differenze significative di fatica fra modalità chiara e scura (entrambe la aumentano dopo un'ora). → [IJERPH 2025, PMC12027292](https://pmc.ncbi.nlm.nih.gov/articles/PMC12027292/)
- **[F]** Sulla prestazione di lettura e correzione bozze, il testo scuro su fondo chiaro risulta migliore, in giovani e anziani (dall'abstract; l'articolo completo non l'ho letto). → [Piepenbrock, Mayr, Buchner, *Ergonomics* 2013](https://documentacion.fundacionmapfre.org/documentacion/publico/pt/bib/143702.do?format=xml)
- **Non verificato:** uno studio IEEE Access del 2021 riporterebbe meno fatica (frequenza di ammiccamento, pupilla) leggendo in modalità scura **con poca luce ambientale**, con i partecipanti che però preferivano la chiara. La pagina non si apre (errore 403): lo conosco solo da un riassunto di ricerca. → [DOAJ, IEEE Access 2021](https://doaj.org/article/d2ef97066b39470bb4cb2ab991b0e401)
- **Nessun dato solido** dice che un tema scuro migliori le decisioni o riduca gli errori di trading. **[O]** Il tema scuro è una scelta di comfort, coerente se il journal si usa accanto a TradingView scuro in una stanza poco illuminata.

## 3. Contrasto (WCAG 2.2)

- **[F]** 1.4.3 (livello AA): testo normale almeno **4.5:1**, testo grande (18 pt, o 14 pt grassetto) almeno **3:1**. → [W3C, Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- **[F]** 1.4.11 (AA): le parti di un grafico necessarie per capirlo (linee, barre) almeno **3:1** contro i colori adiacenti. → [W3C, Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- **[F]** 1.4.1 (livello A): il colore non deve essere l'unico mezzo per trasmettere un'informazione. → [W3C, Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)
- **[O]** Per il journal significa: un P&L deve avere sempre il segno + / −, non solo il colore.

## 4. Profitto e perdita per chi distingue male rosso e verde

- **[F]** Circa 1 uomo su 12 ha un deficit nella visione dei colori; il tipo più comune rende difficile distinguere rosso e verde. → [National Eye Institute](https://www.nei.nih.gov/learn-about-eye-health/eye-conditions-and-diseases/color-blindness)
- **[F]** L'alternativa più citata è blu/arancio, insieme a segni o icone. Le fonti sono blog di design e software finanziari, **non uno standard**. → [vis4.net](https://notes.vis4.net/blog/goodbye-redgreen-scales), [ZipBooks](https://zipbooks.com/blog/color-accessibility-mode/), [The Data School](https://thedataschool.co.uk/vivek-patel/untitled-245)
- **[C]** Il tema attuale ha oliva `#93A181` e mattone `#C78A6B` quasi con la **stessa luminosità** (rapporto di contrasto fra i due 1,05:1). Con una simulazione di protanopia (matrici di Viénot 1999, differenza in CIELAB) la distanza fra i due scende a circa 7, cioè quasi indistinguibili. Il calcolo è mio, non una misura su persone: va preso come ordine di grandezza.

## 5. Cosa comunicano i colori nella finanza

- **[F]** Una tesi di master del 2025 (ISEG, Lisbona; 192 rispondenti, campione di convenienza, banca fittizia) associa il blu a più fiducia. È un campione piccolo e non rappresentativo. → [Repositório ULisboa](https://repositorio.ulisboa.pt/entities/publication/5c2ad3c1-be35-4ada-97c1-303b67190fb3)
- **Non verificato:** un riassunto di ricerca cita uno studio più ampio secondo cui i toni spenti ispirano più fiducia di quelli brillanti, indipendentemente dalla tinta. Non sono riuscito ad aprire la fonte, quindi non lo considero un fatto.
- **Nessun dato solido** che una tinta *causi* fiducia o serietà. Gran parte delle percentuali online viene da materiale di marketing, e molte banche hanno logo blu, cosa che non prova un effetto. Non riporto quei numeri.
- **[O]** Per un journal personale contano più la sobrietà e la leggibilità che il messaggio di marca.

## Conclusioni pratiche (opinioni mie, basate su quanto sopra)

1. Sfondo grigio quasi nero, non nero puro. Testo chiaro ma non bianco pieno.
2. Profitto e perdita separati **per luminosità** oltre che per tinta: il profitto più chiaro, la perdita più scura. Sempre il segno + / −.
3. Tinte poco sature: sul fondo scuro i colori saturi vibrano.
4. Tutti i testi colorati almeno 4.5:1 sulla superficie delle card, le linee dei grafici almeno 3:1.
