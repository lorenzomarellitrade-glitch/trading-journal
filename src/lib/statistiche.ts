import { metricheTrade, riepiloga, type Riepilogo } from './aggregazioni'
import { CONFERME_TOTALI, contaConferme } from './calcoli'
import { indiceGiornoSettimana, NOMI_GIORNI_ESTESI, NOMI_MESI } from './date'
import type { Account, Esito, TradeCompleto } from './tipi'

/**
 * Statistiche di sintesi e analisi di processo.
 *
 * L'analisi di processo è il motivo per cui questo journal esiste: non dice
 * quanto hai guadagnato, ma se hai guadagnato *quando hai seguito il piano*.
 */

/**
 * Sotto questa soglia un gruppo non è statisticamente leggibile.
 * Serve a impedire di cambiare strategia sulla base di tre operazioni.
 */
export const SOGLIA_CAMPIONE = 5

// ---------------------------------------------------------------------------
// Equity curve
// ---------------------------------------------------------------------------

/** Un punto della curva: la data e il cumulato di ciascun account. */
export type PuntoEquity = { data: string } & Record<string, number | string>

/**
 * P&L cumulativo nel tempo, una serie per account.
 *
 * Ogni giorno con almeno un trade chiuso produce un punto; i giorni senza
 * operazioni non compaiono, così l'asse non si allunga per settimane di
 * inattività. Le serie usano l'id dell'account come chiave.
 */
export function curvaEquity(trades: TradeCompleto[], account: Account[]): PuntoEquity[] {
  const cumulato = new Map<string, number>(account.map((a) => [a.id, 0]))
  const punti: PuntoEquity[] = []

  const ordinati = [...trades].sort((x, y) => x.data.localeCompare(y.data))

  let dataCorrente: string | null = null
  let qualcosaNelGiorno = false

  const chiudiGiorno = () => {
    if (dataCorrente == null || !qualcosaNelGiorno) return
    const punto: PuntoEquity = { data: dataCorrente }
    for (const a of account) punto[a.id] = cumulato.get(a.id) ?? 0
    punti.push(punto)
  }

  for (const t of ordinati) {
    if (t.data !== dataCorrente) {
      chiudiGiorno()
      dataCorrente = t.data
      qualcosaNelGiorno = false
    }

    for (const a of account) {
      const m = metricheTrade(t, [a])
      if (m.pnlUsd == null) continue
      cumulato.set(a.id, (cumulato.get(a.id) ?? 0) + m.pnlUsd)
      qualcosaNelGiorno = true
    }
  }

  chiudiGiorno()
  return punti
}

// ---------------------------------------------------------------------------
// Drawdown
// ---------------------------------------------------------------------------

export interface Drawdown {
  /** Massima discesa dal picco precedente, in dollari (valore positivo) */
  usd: number
  /** La stessa discesa in percentuale del capitale selezionato */
  percent: number | null
}

/**
 * Drawdown massimo sull'equity complessiva degli account selezionati:
 * la peggiore discesa da un massimo precedente, non la peggiore perdita
 * singola. È la misura che conta per i limiti delle prop firm.
 */
export function drawdownMassimo(trades: TradeCompleto[], account: Account[]): Drawdown {
  const base = account.reduce((s, a) => s + a.saldo_iniziale, 0)

  let cumulato = 0
  let picco = 0
  let peggiore = 0

  const ordinati = [...trades].sort((x, y) => x.data.localeCompare(y.data))

  for (const t of ordinati) {
    const m = metricheTrade(t, account)
    if (m.pnlUsd == null) continue

    cumulato += m.pnlUsd
    // Il picco parte da 0: una serie iniziale di perdite è già drawdown.
    picco = Math.max(picco, cumulato)
    peggiore = Math.max(peggiore, picco - cumulato)
  }

  return { usd: peggiore, percent: base > 0 ? (peggiore / base) * 100 : null }
}

// ---------------------------------------------------------------------------
// Distribuzione degli R
// ---------------------------------------------------------------------------

export interface BarraR {
  /** Estremo inferiore dell'intervallo, incluso */
  da: number
  /** Estremo superiore, escluso */
  a: number
  etichetta: string
  conteggio: number
}

/**
 * Istogramma degli R realizzati, a intervalli di ampiezza fissa.
 * Gli intervalli coprono esattamente i dati presenti: senza trade non
 * restituisce barre vuote da disegnare.
 */
export function distribuzioneR(
  trades: TradeCompleto[],
  account: Account[],
  ampiezza = 0.5,
): BarraR[] {
  const valori = trades
    .map((t) => metricheTrade(t, account).rMedio)
    .filter((r): r is number => r != null)

  if (valori.length === 0) return []

  const minimo = Math.floor(Math.min(...valori) / ampiezza) * ampiezza
  const massimo = Math.ceil(Math.max(...valori) / ampiezza) * ampiezza
  // Almeno un intervallo anche quando tutti gli R sono identici.
  const numeroBarre = Math.max(1, Math.round((massimo - minimo) / ampiezza))

  const barre: BarraR[] = []
  for (let i = 0; i < numeroBarre; i++) {
    const da = minimo + i * ampiezza
    const a = da + ampiezza
    barre.push({
      da,
      a,
      etichetta: formattaIntervallo(da, a),
      conteggio: 0,
    })
  }

  for (const r of valori) {
    let indice = Math.floor((r - minimo) / ampiezza)
    // L'estremo superiore ricade nell'ultimo intervallo invece di sfondare.
    if (indice >= numeroBarre) indice = numeroBarre - 1
    if (indice < 0) indice = 0
    barre[indice].conteggio++
  }

  return barre
}

function formattaIntervallo(da: number, a: number): string {
  const n = (v: number) => v.toFixed(1).replace('.', ',').replace(/,0$/, '')
  return `${n(da)}…${n(a)}`
}

// ---------------------------------------------------------------------------
// Analisi di processo
// ---------------------------------------------------------------------------

export interface Gruppo {
  etichetta: string
  /** Trade conclusi nel gruppo: è il numero su cui si può ragionare */
  numeroTrade: number
  winRate: number | null
  rMedio: number | null
  /** Rischio medio per trade: rivela se in questo gruppo si alza il size */
  rischioMedioPercent: number | null
  pnlUsd: number
  /** True quando il campione è troppo piccolo per concluderne qualcosa */
  campioneScarso: boolean
}

export interface Confronto {
  titolo: string
  /** Cosa dovrebbe suggerire il confronto, se i numeri lo confermano */
  domanda: string
  gruppi: Gruppo[]
}

function gruppo(
  etichetta: string,
  trades: TradeCompleto[],
  account: Account[],
): Gruppo {
  const r: Riepilogo = riepiloga(trades, account)
  return {
    etichetta,
    numeroTrade: r.numeroChiusi,
    winRate: r.winRate,
    rMedio: r.rMedio,
    rischioMedioPercent: r.rischioMedioPercent,
    pnlUsd: r.pnlUsd,
    campioneScarso: r.numeroChiusi < SOGLIA_CAMPIONE,
  }
}

/** Costruisce un confronto partendo da predicati sui trade. */
export function confronta(
  trades: TradeCompleto[],
  account: Account[],
  titolo: string,
  domanda: string,
  definizioni: { etichetta: string; filtro: (t: TradeCompleto) => boolean }[],
): Confronto {
  return {
    titolo,
    domanda,
    gruppi: definizioni.map((d) => gruppo(d.etichetta, trades.filter(d.filtro), account)),
  }
}

// ---------------------------------------------------------------------------
// Ripartizioni temporali
// ---------------------------------------------------------------------------

/** Stessa forma di un gruppo di confronto: cambia solo il criterio di raccolta. */
export type RigaPeriodo = Gruppo

/**
 * Rendimento per giorno della settimana.
 *
 * Da lunedì a venerdì le righe ci sono sempre, anche vuote: un giorno in cui
 * non operi mai è un'informazione, non un'assenza di informazione. Sabato e
 * domenica compaiono solo se hanno davvero dei trade.
 */
export function perGiornoSettimana(trades: TradeCompleto[], account: Account[]): RigaPeriodo[] {
  const perIndice = new Map<number, TradeCompleto[]>()
  for (const t of trades) {
    const i = indiceGiornoSettimana(t.data)
    const esistenti = perIndice.get(i)
    if (esistenti) esistenti.push(t)
    else perIndice.set(i, [t])
  }

  const righe: RigaPeriodo[] = []
  for (let i = 0; i < 7; i++) {
    const delGiorno = perIndice.get(i) ?? []
    const feriale = i < 5
    if (!feriale && delGiorno.length === 0) continue
    righe.push(gruppo(NOMI_GIORNI_ESTESI[i], delGiorno, account))
  }
  return righe
}

/** Rendimento mese per mese, dal più recente al più vecchio. */
export function perMese(trades: TradeCompleto[], account: Account[]): RigaPeriodo[] {
  const perChiave = new Map<string, TradeCompleto[]>()
  for (const t of trades) {
    const chiave = t.data.slice(0, 7) // 'YYYY-MM'
    const esistenti = perChiave.get(chiave)
    if (esistenti) esistenti.push(t)
    else perChiave.set(chiave, [t])
  }

  return [...perChiave.keys()]
    .sort((a, b) => b.localeCompare(a))
    .map((chiave) => {
      const [anno, mese] = chiave.split('-').map(Number)
      return gruppo(`${NOMI_MESI[mese - 1]} ${anno}`, perChiave.get(chiave)!, account)
    })
}

// ---------------------------------------------------------------------------
// Miglioramento nel tempo
// ---------------------------------------------------------------------------

export interface RigaDisciplina {
  etichetta: string
  /** Tutti i trade del mese, non solo quelli conclusi: la disciplina si
   *  misura sulla decisione presa, non sul risultato ottenuto. */
  numeroTrade: number
  processoCompleto: number | null
  slSpostato: number | null
  chiusoManualmente: number | null
  fuoriFinestra: number | null
  ideaEsterna: number | null
}

function percentuale(quanti: number, totale: number): number | null {
  return totale > 0 ? (quanti / totale) * 100 : null
}

/**
 * Aderenza al processo mese per mese, dal più vecchio al più recente.
 *
 * È la misura del miglioramento vero: un mese in perdita con il 90% di
 * aderenza vale più di un mese in utile al 40%. L'ordine è cronologico
 * crescente proprio per leggerlo come una tendenza.
 */
export function disciplinaPerMese(trades: TradeCompleto[]): RigaDisciplina[] {
  const perChiave = new Map<string, TradeCompleto[]>()
  for (const t of trades) {
    const chiave = t.data.slice(0, 7)
    const esistenti = perChiave.get(chiave)
    if (esistenti) esistenti.push(t)
    else perChiave.set(chiave, [t])
  }

  return [...perChiave.keys()]
    .sort()
    .map((chiave) => {
      const delMese = perChiave.get(chiave)!
      const n = delMese.length
      const [anno, mese] = chiave.split('-').map(Number)

      return {
        etichetta: `${NOMI_MESI[mese - 1].slice(0, 3)} ${String(anno).slice(2)}`,
        numeroTrade: n,
        processoCompleto: percentuale(
          delMese.filter((t) => contaConferme(t) === CONFERME_TOTALI).length,
          n,
        ),
        slSpostato: percentuale(delMese.filter((t) => t.sl_spostato).length, n),
        chiusoManualmente: percentuale(delMese.filter((t) => t.chiuso_manualmente).length, n),
        fuoriFinestra: percentuale(delMese.filter((t) => t.finestra === 'fuori finestra').length, n),
        ideaEsterna: percentuale(delMese.filter((t) => t.idea_esterna).length, n),
      }
    })
}

export interface CostoUscita {
  /** Trade chiusi a mano che erano in utile e avevano un target definito */
  numeroTrade: number
  /** Somma di (RR pianificato − R realizzato): l'R lasciato sul piatto */
  rLasciato: number | null
  /** Media per trade */
  rLasciatoMedio: number | null
}

/**
 * Stima di quanto costa chiudere in anticipo.
 *
 * Confronta l'R pianificato con quello realizzato sui soli trade chiusi
 * manualmente e finiti in utile. È una **stima ottimistica**: non sappiamo se
 * il take profit sarebbe stato davvero raggiunto. Serve l'ordine di
 * grandezza, non la cifra esatta.
 */
export function costoChiusuraManuale(
  trades: TradeCompleto[],
  account: Account[],
): CostoUscita {
  let somma = 0
  let quanti = 0

  for (const t of trades) {
    if (!t.chiuso_manualmente) continue

    const m = metricheTrade(t, account)
    if (m.rMedio == null || m.rrMedio == null) continue
    // Solo le uscite anticipate in utile: su una chiusura in perdita
    // anticipare può aver evitato di peggio, e il confronto non regge.
    if (m.rMedio <= 0) continue

    const differenza = m.rrMedio - m.rMedio
    if (differenza <= 0) continue

    somma += differenza
    quanti++
  }

  return {
    numeroTrade: quanti,
    rLasciato: quanti > 0 ? somma : null,
    rLasciatoMedio: quanti > 0 ? somma / quanti : null,
  }
}

/**
 * Come si comporta il trade successivo a una perdita, rispetto a quello
 * successivo a una vincita. È il revenge trading, misurato: se dopo uno stop
 * il rischio medio sale e il win rate scende, il problema non è la strategia.
 *
 * L'ordine cronologico usa data e ora di entrata; i trade non conclusi non
 * spezzano la sequenza, semplicemente non contano come precedente.
 */
export function effettoTradePrecedente(
  trades: TradeCompleto[],
  account: Account[],
): Confronto {
  const ordinati = [...trades].sort((x, y) =>
    `${x.data} ${x.ora_entrata ?? ''}`.localeCompare(`${y.data} ${y.ora_entrata ?? ''}`),
  )

  const dopoPerdita: TradeCompleto[] = []
  const dopoVincita: TradeCompleto[] = []
  let precedente: Exclude<Esito, 'annullato'> | null = null

  for (const t of ordinati) {
    const esito = metricheTrade(t, account).esito

    if (precedente === 'loss') dopoPerdita.push(t)
    else if (precedente === 'win') dopoVincita.push(t)

    if (esito != null) precedente = esito
  }

  return {
    titolo: 'Dopo il trade precedente',
    domanda: 'Uno stop mi fa alzare il size o abbassare gli standard?',
    gruppi: [
      gruppo('Dopo una vincita', dopoVincita, account),
      gruppo('Dopo una perdita', dopoPerdita, account),
    ],
  }
}

/**
 * Rendimento in base a quanti trade sono stati aperti nella stessa giornata.
 * L'overtrading è il modo più rapido di bruciare un account prop e si
 * riconosce prima di quanto si pensi.
 */
export function perTradeGiornalieri(trades: TradeCompleto[], account: Account[]): Confronto {
  const conteggioGiorno = new Map<string, number>()
  for (const t of trades) {
    conteggioGiorno.set(t.data, (conteggioGiorno.get(t.data) ?? 0) + 1)
  }

  const nelGiorno = (t: TradeCompleto) => conteggioGiorno.get(t.data) ?? 0

  return {
    titolo: 'Trade nella giornata',
    domanda: 'Le giornate più intense sono anche le più redditizie?',
    gruppi: [
      gruppo('1 trade', trades.filter((t) => nelGiorno(t) === 1), account),
      gruppo('2 trade', trades.filter((t) => nelGiorno(t) === 2), account),
      gruppo('3 o più', trades.filter((t) => nelGiorno(t) >= 3), account),
    ],
  }
}

/**
 * I sette confronti di processo.
 * L'ordine non è casuale: parte dalla checklist, che è la domanda più
 * importante, e scende verso quelle di contorno.
 */
export function analisiProcesso(trades: TradeCompleto[], account: Account[]): Confronto[] {
  const c = (
    titolo: string,
    domanda: string,
    definizioni: { etichetta: string; filtro: (t: TradeCompleto) => boolean }[],
  ) => confronta(trades, account, titolo, domanda, definizioni)

  return [
    c('Conferme', 'Le 5 conferme fanno davvero la differenza?', [
      { etichetta: '5 su 5', filtro: (t) => contaConferme(t) === CONFERME_TOTALI },
      { etichetta: '4 o meno', filtro: (t) => contaConferme(t) < CONFERME_TOTALI },
    ]),

    c('Finestra oraria', 'Le finestre che ho scelto sono le migliori?', [
      { etichetta: '09:00-10:30', filtro: (t) => t.finestra === '09:00-10:30' },
      { etichetta: '12:00-13:00', filtro: (t) => t.finestra === '12:00-13:00' },
      { etichetta: 'Fuori finestra', filtro: (t) => t.finestra === 'fuori finestra' },
    ]),

    c('Fallimento + Rottura', 'Conviene prendere il primo segnale o aspettare il secondo?', [
      { etichetta: 'Primo', filtro: (t) => t.numero_fr === 'primo' },
      { etichetta: 'Secondo', filtro: (t) => t.numero_fr === 'secondo' },
    ]),

    c('Stop loss', 'Spostare lo stop mi salva o mi costa?', [
      { etichetta: 'SL non toccato', filtro: (t) => !t.sl_spostato },
      { etichetta: 'SL spostato', filtro: (t) => t.sl_spostato },
    ]),

    c('Uscita', 'Chiudere a mano batte lasciar correre il piano?', [
      { etichetta: 'Lasciato a TP/SL', filtro: (t) => !t.chiuso_manualmente },
      { etichetta: 'Chiuso a mano', filtro: (t) => t.chiuso_manualmente },
    ]),

    c('Origine del setup', 'Le idee degli altri valgono le mie?', [
      { etichetta: 'Idea mia', filtro: (t) => !t.idea_esterna },
      { etichetta: 'Idea esterna', filtro: (t) => t.idea_esterna },
    ]),

    c('Direzione', 'Sono più bravo al rialzo o al ribasso?', [
      { etichetta: 'Long', filtro: (t) => t.direzione === 'long' },
      { etichetta: 'Short', filtro: (t) => t.direzione === 'short' },
    ]),
  ]
}
