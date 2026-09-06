import { describe, expect, it } from 'vitest'
import { A, ENTRAMBI, exe, perdente, PROCESSO_COMPLETO, trade, vincente } from './fixture'
import {
  analisiProcesso,
  confronta,
  costoChiusuraManuale,
  curvaEquity,
  disciplinaPerMese,
  distribuzioneR,
  drawdownMassimo,
  effettoTradePrecedente,
  perGiornoSettimana,
  perMese,
  perTradeGiornalieri,
  SOGLIA_CAMPIONE,
} from './statistiche'

describe('curvaEquity', () => {
  it('accumula il P&L nel tempo, una serie per account', () => {
    const punti = curvaEquity(
      [
        trade('2026-09-01', 'long', [vincente('a'), vincente('b')]),
        trade('2026-09-02', 'long', [perdente('a'), perdente('b')]),
      ],
      ENTRAMBI,
    )

    expect(punti).toHaveLength(2)
    expect(punti[0]).toMatchObject({ data: '2026-09-01', a: 500, b: 500 })
    expect(punti[1]).toMatchObject({ data: '2026-09-02', a: 250, b: 250 })
  })

  it('unisce in un punto solo i trade dello stesso giorno', () => {
    const punti = curvaEquity(
      [
        trade('2026-09-01', 'long', [vincente('a')]),
        trade('2026-09-01', 'long', [vincente('a')]),
      ],
      [A],
    )

    expect(punti).toHaveLength(1)
    expect(punti[0].a).toBe(1000)
  })

  it('non crea punti per i giorni senza trade chiusi', () => {
    const punti = curvaEquity(
      [
        trade('2026-09-01', 'long', [vincente('a')]),
        trade('2026-09-02', 'long', [exe('a', { entry: 2000, stop_loss: 1995, lotti: 0.5 })]),
      ],
      [A],
    )

    expect(punti).toHaveLength(1)
    expect(punti[0].data).toBe('2026-09-01')
  })

  it('ordina i punti anche se i trade arrivano disordinati', () => {
    const punti = curvaEquity(
      [
        trade('2026-09-03', 'long', [vincente('a')]),
        trade('2026-09-01', 'long', [perdente('a')]),
      ],
      [A],
    )

    expect(punti.map((p) => p.data)).toEqual(['2026-09-01', '2026-09-03'])
    expect(punti[0].a).toBe(-250)
    expect(punti[1].a).toBe(250)
  })

  it('non produce punti senza trade', () => {
    expect(curvaEquity([], ENTRAMBI)).toEqual([])
  })
})

describe('drawdownMassimo', () => {
  it('misura la discesa dal picco, non la perdita singola peggiore', () => {
    // +500, poi tre stop da −250: il picco è 500, il minimo −250, discesa 750.
    const trades = [
      trade('2026-09-01', 'long', [vincente('a')]),
      trade('2026-09-02', 'long', [perdente('a')]),
      trade('2026-09-03', 'long', [perdente('a')]),
      trade('2026-09-04', 'long', [perdente('a')]),
    ]

    const d = drawdownMassimo(trades, [A])
    expect(d.usd).toBe(750)
    expect(d.percent).toBe(0.75)
  })

  it('vale 0 su una serie che sale sempre', () => {
    const trades = [
      trade('2026-09-01', 'long', [vincente('a')]),
      trade('2026-09-02', 'long', [vincente('a')]),
    ]
    expect(drawdownMassimo(trades, [A]).usd).toBe(0)
  })

  it('considera drawdown anche una partenza in perdita', () => {
    // Senza picco iniziale a 0 questa serie risulterebbe senza drawdown.
    const trades = [trade('2026-09-01', 'long', [perdente('a')])]
    expect(drawdownMassimo(trades, [A]).usd).toBe(250)
  })

  it('si recupera dopo un nuovo massimo', () => {
    const trades = [
      trade('2026-09-01', 'long', [vincente('a')]), // +500
      trade('2026-09-02', 'long', [perdente('a')]), // +250, dd 250
      trade('2026-09-03', 'long', [vincente('a')]), // +750, nuovo picco
      trade('2026-09-04', 'long', [perdente('a')]), // +500, dd 250
    ]
    expect(drawdownMassimo(trades, [A]).usd).toBe(250)
  })

  it('vale 0 senza trade', () => {
    expect(drawdownMassimo([], [A]).usd).toBe(0)
  })
})

describe('distribuzioneR', () => {
  it('raggruppa gli R in intervalli', () => {
    const trades = [
      trade('2026-09-01', 'long', [vincente('a')]), // +2R
      trade('2026-09-02', 'long', [vincente('a')]), // +2R
      trade('2026-09-03', 'long', [perdente('a')]), // −1R
    ]

    const barre = distribuzioneR(trades, [A])
    const totale = barre.reduce((s, b) => s + b.conteggio, 0)

    expect(totale).toBe(3)
    expect(barre.find((b) => b.da <= -1 && b.a > -1)?.conteggio).toBe(1)
  })

  it('mette il valore massimo nell\'ultimo intervallo invece di perderlo', () => {
    const trades = [trade('2026-09-01', 'long', [vincente('a')])]
    const barre = distribuzioneR(trades, [A])
    expect(barre.reduce((s, b) => s + b.conteggio, 0)).toBe(1)
  })

  it('ignora i trade senza R', () => {
    const trades = [
      trade('2026-09-01', 'long', [vincente('a')]),
      trade('2026-09-02', 'long', [exe('a', { entry: 2000, stop_loss: 1995, lotti: 0.5 })]),
    ]
    expect(distribuzioneR(trades, [A]).reduce((s, b) => s + b.conteggio, 0)).toBe(1)
  })

  it('non restituisce barre senza dati', () => {
    expect(distribuzioneR([], [A])).toEqual([])
  })
})

describe('confronta', () => {
  it('separa i trade nei gruppi e calcola le metriche di ciascuno', () => {
    const trades = [
      trade('2026-09-01', 'long', [vincente('a')], PROCESSO_COMPLETO),
      trade('2026-09-02', 'long', [vincente('a')], PROCESSO_COMPLETO),
      trade('2026-09-03', 'long', [perdente('a')]),
    ]

    const c = confronta(trades, [A], 'Conferme', 'domanda', [
      { etichetta: '5 su 5', filtro: (t) => t.step5_fallimento_rottura },
      { etichetta: '4 o meno', filtro: (t) => !t.step5_fallimento_rottura },
    ])

    expect(c.gruppi[0].numeroTrade).toBe(2)
    expect(c.gruppi[0].winRate).toBe(100)
    expect(c.gruppi[0].rMedio).toBe(2)
    expect(c.gruppi[1].numeroTrade).toBe(1)
    expect(c.gruppi[1].winRate).toBe(0)
  })

  it('segnala i campioni sotto la soglia', () => {
    const pochi = [trade('2026-09-01', 'long', [vincente('a')])]
    const c = confronta(pochi, [A], 't', 'd', [
      { etichetta: 'tutti', filtro: () => true },
    ])

    expect(c.gruppi[0].numeroTrade).toBe(1)
    expect(c.gruppi[0].campioneScarso).toBe(true)
  })

  it('non segnala i campioni che raggiungono la soglia', () => {
    const abbastanza = Array.from({ length: SOGLIA_CAMPIONE }, (_, i) =>
      trade(`2026-09-0${i + 1}`, 'long', [vincente('a')]),
    )
    const c = confronta(abbastanza, [A], 't', 'd', [
      { etichetta: 'tutti', filtro: () => true },
    ])

    expect(c.gruppi[0].numeroTrade).toBe(SOGLIA_CAMPIONE)
    expect(c.gruppi[0].campioneScarso).toBe(false)
  })

  it('conta i trade conclusi, non quelli aperti', () => {
    const trades = [
      trade('2026-09-01', 'long', [vincente('a')]),
      trade('2026-09-02', 'long', [exe('a', { entry: 2000, stop_loss: 1995, lotti: 0.5 })]),
    ]
    const c = confronta(trades, [A], 't', 'd', [{ etichetta: 'tutti', filtro: () => true }])
    expect(c.gruppi[0].numeroTrade).toBe(1)
  })
})

describe('disciplinaPerMese', () => {
  it('misura la percentuale di aderenza, non il risultato', () => {
    const righe = disciplinaPerMese([
      trade('2026-09-01', 'long', [vincente('a')], PROCESSO_COMPLETO),
      trade('2026-09-02', 'long', [perdente('a')], { sl_spostato: true }),
    ])

    expect(righe).toHaveLength(1)
    expect(righe[0].numeroTrade).toBe(2)
    expect(righe[0].processoCompleto).toBe(50)
    expect(righe[0].slSpostato).toBe(50)
  })

  it('conta anche i trade non conclusi', () => {
    // La disciplina riguarda la decisione presa, non l'esito ottenuto.
    const righe = disciplinaPerMese([
      trade('2026-09-01', 'long', [exe('a', { entry: 2000 })], PROCESSO_COMPLETO),
    ])
    expect(righe[0].numeroTrade).toBe(1)
    expect(righe[0].processoCompleto).toBe(100)
  })

  it('ordina dal mese più vecchio, per leggerlo come tendenza', () => {
    const righe = disciplinaPerMese([
      trade('2026-10-01', 'long', [vincente('a')]),
      trade('2026-08-01', 'long', [vincente('a')]),
      trade('2026-09-01', 'long', [vincente('a')]),
    ])
    expect(righe.map((r) => r.etichetta)).toEqual(['Ago 26', 'Set 26', 'Ott 26'])
  })
})

describe('costoChiusuraManuale', () => {
  it('somma l\'R lasciato sul piatto', () => {
    // RR pianificato 2, uscita a metà strada: R realizzato 1, lasciato 1.
    const mezzo = exe('a', {
      entry: 2000,
      stop_loss: 1995,
      take_profit: 2010,
      exit: 2005,
      lotti: 0.5,
      esito: 'win',
    })
    const c = costoChiusuraManuale(
      [trade('2026-09-01', 'long', [mezzo], { chiuso_manualmente: true })],
      [A],
    )

    expect(c.numeroTrade).toBe(1)
    expect(c.rLasciato).toBeCloseTo(1, 6)
    expect(c.rLasciatoMedio).toBeCloseTo(1, 6)
  })

  it('ignora i trade lasciati correre fino al target', () => {
    const c = costoChiusuraManuale([trade('2026-09-01', 'long', [vincente('a')])], [A])
    expect(c.numeroTrade).toBe(0)
    expect(c.rLasciato).toBeNull()
  })

  it('ignora le chiusure anticipate in perdita', () => {
    // Uscire prima su un trade che stava andando male può aver evitato di peggio.
    const c = costoChiusuraManuale(
      [trade('2026-09-01', 'long', [perdente('a')], { chiuso_manualmente: true })],
      [A],
    )
    expect(c.numeroTrade).toBe(0)
  })

  it('ignora chi ha superato il proprio target', () => {
    const oltre = exe('a', {
      entry: 2000,
      stop_loss: 1995,
      take_profit: 2005,
      exit: 2020,
      lotti: 0.5,
      esito: 'win',
    })
    const c = costoChiusuraManuale(
      [trade('2026-09-01', 'long', [oltre], { chiuso_manualmente: true })],
      [A],
    )
    expect(c.numeroTrade).toBe(0)
  })
})

describe('effettoTradePrecedente', () => {
  it('separa i trade che seguono una perdita da quelli che seguono una vincita', () => {
    const c = effettoTradePrecedente(
      [
        trade('2026-09-01', 'long', [vincente('a')]), // primo: nessun precedente
        trade('2026-09-02', 'long', [perdente('a')]), // dopo una vincita
        trade('2026-09-03', 'long', [perdente('a')]), // dopo una perdita
        trade('2026-09-04', 'long', [vincente('a')]), // dopo una perdita
      ],
      [A],
    )

    expect(c.gruppi[0].etichetta).toBe('Dopo una vincita')
    expect(c.gruppi[0].numeroTrade).toBe(1)
    expect(c.gruppi[1].etichetta).toBe('Dopo una perdita')
    expect(c.gruppi[1].numeroTrade).toBe(2)
  })

  it('non conta il primo trade, che non ha un precedente', () => {
    const c = effettoTradePrecedente([trade('2026-09-01', 'long', [vincente('a')])], [A])
    expect(c.gruppi[0].numeroTrade).toBe(0)
    expect(c.gruppi[1].numeroTrade).toBe(0)
  })

  it('ordina cronologicamente anche se i trade arrivano sparsi', () => {
    const c = effettoTradePrecedente(
      [
        trade('2026-09-03', 'long', [vincente('a')]),
        trade('2026-09-01', 'long', [perdente('a')]),
      ],
      [A],
    )
    expect(c.gruppi[1].numeroTrade).toBe(1) // la vincita del 3 segue la perdita del 1
  })
})

describe('perTradeGiornalieri', () => {
  it('raggruppa per quanti trade sono stati aperti quel giorno', () => {
    const c = perTradeGiornalieri(
      [
        trade('2026-09-01', 'long', [vincente('a')]),
        trade('2026-09-02', 'long', [vincente('a')]),
        trade('2026-09-02', 'long', [perdente('a')]),
        trade('2026-09-03', 'long', [vincente('a')]),
        trade('2026-09-03', 'long', [vincente('a')]),
        trade('2026-09-03', 'long', [perdente('a')]),
      ],
      [A],
    )

    expect(c.gruppi[0].numeroTrade).toBe(1) // giornate da 1
    expect(c.gruppi[1].numeroTrade).toBe(2) // giornate da 2
    expect(c.gruppi[2].numeroTrade).toBe(3) // giornate da 3 o più
  })
})

describe('perGiornoSettimana', () => {
  it('mostra sempre i cinque giorni feriali, anche vuoti', () => {
    const righe = perGiornoSettimana([], [A])
    expect(righe.map((r) => r.etichetta)).toEqual([
      'Lunedì',
      'Martedì',
      'Mercoledì',
      'Giovedì',
      'Venerdì',
    ])
  })

  it('aggiunge il weekend solo se ci sono trade', () => {
    // 2026-09-06 è una domenica.
    const righe = perGiornoSettimana([trade('2026-09-06', 'long', [vincente('a')])], [A])
    expect(righe.map((r) => r.etichetta)).toContain('Domenica')
    expect(righe.map((r) => r.etichetta)).not.toContain('Sabato')
  })

  it('attribuisce ogni trade al giusto giorno', () => {
    // 2026-09-01 martedì, 2026-09-03 giovedì
    const righe = perGiornoSettimana(
      [
        trade('2026-09-01', 'long', [vincente('a')]),
        trade('2026-09-03', 'long', [perdente('a')]),
      ],
      [A],
    )

    expect(righe.find((r) => r.etichetta === 'Martedì')?.pnlUsd).toBe(500)
    expect(righe.find((r) => r.etichetta === 'Giovedì')?.pnlUsd).toBe(-250)
    expect(righe.find((r) => r.etichetta === 'Lunedì')?.numeroTrade).toBe(0)
  })
})

describe('perMese', () => {
  it('raggruppa per mese e ordina dal più recente', () => {
    const righe = perMese(
      [
        trade('2026-08-10', 'long', [vincente('a')]),
        trade('2026-09-01', 'long', [perdente('a')]),
        trade('2026-09-20', 'long', [vincente('a')]),
      ],
      [A],
    )

    expect(righe.map((r) => r.etichetta)).toEqual(['Settembre 2026', 'Agosto 2026'])
    expect(righe[0].numeroTrade).toBe(2)
    expect(righe[0].pnlUsd).toBe(250) // −250 +500
  })

  it('separa mesi uguali di anni diversi', () => {
    const righe = perMese(
      [
        trade('2025-09-10', 'long', [vincente('a')]),
        trade('2026-09-10', 'long', [vincente('a')]),
      ],
      [A],
    )
    expect(righe).toHaveLength(2)
    expect(righe[0].etichetta).toBe('Settembre 2026')
  })

  it('non produce righe senza trade', () => {
    expect(perMese([], [A])).toEqual([])
  })
})

describe('analisiProcesso', () => {
  it('produce i sette confronti previsti', () => {
    const c = analisiProcesso([], ENTRAMBI)
    expect(c.map((x) => x.titolo)).toEqual([
      'Conferme',
      'Finestra oraria',
      'Fallimento + Rottura',
      'Stop loss',
      'Uscita',
      'Origine del setup',
      'Direzione',
    ])
  })

  it('mette per primo il confronto sulle conferme', () => {
    // È la domanda che dà senso al journal: deve stare in cima.
    expect(analisiProcesso([], ENTRAMBI)[0].titolo).toBe('Conferme')
  })

  it('divide correttamente per finestra oraria', () => {
    const trades = [
      trade('2026-09-01', 'long', [vincente('a')], { finestra: '09:00-10:30' }),
      trade('2026-09-02', 'long', [perdente('a')], { finestra: 'fuori finestra' }),
    ]

    const finestre = analisiProcesso(trades, [A]).find((c) => c.titolo === 'Finestra oraria')!
    expect(finestre.gruppi[0].numeroTrade).toBe(1) // 09:00-10:30
    expect(finestre.gruppi[1].numeroTrade).toBe(0) // 12:00-13:00
    expect(finestre.gruppi[2].numeroTrade).toBe(1) // fuori finestra
  })

  it('separa SL spostato da SL non toccato', () => {
    const trades = [
      trade('2026-09-01', 'long', [vincente('a')]),
      trade('2026-09-02', 'long', [perdente('a')], { sl_spostato: true }),
    ]

    const sl = analisiProcesso(trades, [A]).find((c) => c.titolo === 'Stop loss')!
    expect(sl.gruppi[0].etichetta).toBe('SL non toccato')
    expect(sl.gruppi[0].numeroTrade).toBe(1)
    expect(sl.gruppi[1].numeroTrade).toBe(1)
  })
})
