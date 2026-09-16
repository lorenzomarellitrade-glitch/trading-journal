import { describe, expect, it } from 'vitest'
import {
  consumoRischio,
  intensita,
  metricheTrade,
  perditaPercent,
  raggruppaPerGiorno,
  riepiloga,
} from './aggregazioni'
import { A, acc, ENTRAMBI, exe, perdente, trade, vincente } from './fixture'

// --- metricheTrade ----------------------------------------------------------

describe('metricheTrade', () => {
  it('somma il P&L dei due account e media gli R', () => {
    const t = trade('2026-09-01', 'long', [vincente('a'), vincente('b')])
    const m = metricheTrade(t, ENTRAMBI)

    expect(m.pnlUsd).toBe(1000)
    expect(m.pnlPercent).toBe(0.5) // 1000 su 200.000
    expect(m.rMedio).toBe(2)
    expect(m.esito).toBe('win')
  })

  it('conta solo l\'account selezionato', () => {
    const t = trade('2026-09-01', 'long', [vincente('a'), vincente('b')])
    const m = metricheTrade(t, [A])

    expect(m.pnlUsd).toBe(500)
    expect(m.pnlPercent).toBe(0.5) // 500 su 100.000
  })

  it('funziona con un trade preso su un solo account', () => {
    const t = trade('2026-09-01', 'long', [vincente('a')])
    const m = metricheTrade(t, ENTRAMBI)

    expect(m.pnlUsd).toBe(500)
    // La base è solo il conto che ha operato: con "Tutti" selezionato i conti
    // fermi (ad esempio di una fase chiusa) non devono dimezzare la percentuale.
    expect(m.pnlPercent).toBe(0.5)
    expect(m.rMedio).toBe(2)
  })

  it('non fa diluire le percentuali ai conti che non operano', () => {
    // Quattro conti selezionati, ma il trade è solo sui due di fase 2.
    const fase2 = [acc('c'), acc('d')]
    const tutti = [...ENTRAMBI, ...fase2]
    const t = trade('2026-09-15', 'long', [vincente('c'), vincente('d')])

    expect(metricheTrade(t, tutti).pnlPercent).toBe(0.5) // 1000 su 200.000, non su 400.000
    expect(riepiloga([t], tutti).pnlPercent).toBe(0.5)
  })

  it('usa la stessa base percentuale di riepiloga()', () => {
    // Regressione: le due funzioni avevano denominatori diversi, e lo stesso
    // trade mostrava 0,50% nel pannello del giorno e 0,25% nel calendario.
    const t = trade('2026-09-01', 'long', [vincente('a')])
    expect(metricheTrade(t, ENTRAMBI).pnlPercent).toBe(riepiloga([t], ENTRAMBI).pnlPercent)
    expect(metricheTrade(t, [A]).pnlPercent).toBe(riepiloga([t], [A]).pnlPercent)
  })

  it('media gli R anche quando i due account hanno esiti diversi', () => {
    // Capita se su un account lo stop è stato spostato e sull'altro no.
    const t = trade('2026-09-01', 'long', [vincente('a'), perdente('b')])
    const m = metricheTrade(t, ENTRAMBI)

    expect(m.pnlUsd).toBe(250) // +500 −250
    expect(m.rMedio).toBe(0.5) // media fra +2 e −1
  })

  it('ignora le executions annullate', () => {
    const t = trade('2026-09-01', 'long', [vincente('a'), vincente('b', 'annullato')])
    const m = metricheTrade(t, ENTRAMBI)

    expect(m.pnlUsd).toBe(500)
    expect(m.esito).toBe('win')
  })

  it('non considera chiuso un trade senza uscita', () => {
    const t = trade('2026-09-01', 'long', [
      exe('a', { entry: 2000, stop_loss: 1995, lotti: 0.5 }),
    ])
    const m = metricheTrade(t, ENTRAMBI)

    expect(m.pnlUsd).toBeNull()
    expect(m.esito).toBeNull()
    // il rischio però è già noto: serve alla lista e al form
    expect(m.rischioUsd).toBe(250)
  })

  it('deduce l\'esito dal segno del P&L se non l\'ho compilato', () => {
    expect(metricheTrade(trade('2026-09-01', 'long', [vincente('a', null)]), [A]).esito).toBe('win')
    expect(metricheTrade(trade('2026-09-01', 'long', [perdente('a', null)]), [A]).esito).toBe('loss')

    const pari = exe('a', { entry: 2000, stop_loss: 1995, exit: 2000, lotti: 0.5 })
    expect(metricheTrade(trade('2026-09-01', 'long', [pari]), [A]).esito).toBe('breakeven')
  })

  it('restituisce tutto vuoto se il trade non tocca gli account selezionati', () => {
    const t = trade('2026-09-01', 'long', [vincente('b')])
    expect(metricheTrade(t, [A]).pnlUsd).toBeNull()
  })
})

// --- riepiloga --------------------------------------------------------------

describe('riepiloga', () => {
  const trades = [
    trade('2026-09-01', 'long', [vincente('a'), vincente('b')]),
    trade('2026-09-02', 'long', [perdente('a'), perdente('b')]),
    trade('2026-09-03', 'long', [vincente('a'), vincente('b')]),
  ]

  it('conta i trade una volta sola, non una per account', () => {
    const r = riepiloga(trades, ENTRAMBI)
    expect(r.numeroTrade).toBe(3)
    expect(r.numeroChiusi).toBe(3)
  })

  it('somma il P&L e lo rapporta al capitale complessivo', () => {
    const r = riepiloga(trades, ENTRAMBI)
    expect(r.pnlUsd).toBe(1500) // +1000 −500 +1000
    expect(r.pnlPercent).toBe(0.75) // su 200.000
  })

  it('calcola win rate ed expectancy', () => {
    const r = riepiloga(trades, ENTRAMBI)
    expect(r.vittorie).toBe(2)
    expect(r.winRate).toBeCloseTo(66.667, 2)
    expect(r.expectancyR).toBe(1) // (+2 −1 +2) / 3
  })

  it('conta il breakeven nel denominatore del win rate', () => {
    const pari = exe('a', { entry: 2000, stop_loss: 1995, exit: 2000, lotti: 0.5, esito: 'breakeven' })
    const conPari = [...trades, trade('2026-09-04', 'long', [pari])]

    const r = riepiloga(conPari, ENTRAMBI)
    expect(r.numeroChiusi).toBe(4)
    expect(r.winRate).toBe(50) // 2 vittorie su 4, non su 3
  })

  it('esclude dai conti i trade non ancora chiusi', () => {
    const aperto = trade('2026-09-05', 'long', [
      exe('a', { entry: 2000, stop_loss: 1995, lotti: 0.5 }),
    ])

    const r = riepiloga([...trades, aperto], ENTRAMBI)
    expect(r.numeroTrade).toBe(4) // compare nel conteggio totale
    expect(r.numeroChiusi).toBe(3) // ma non nelle statistiche
    expect(r.pnlUsd).toBe(1500)
  })

  it('non esplode su un insieme vuoto', () => {
    const r = riepiloga([], ENTRAMBI)
    expect(r.numeroTrade).toBe(0)
    expect(r.pnlUsd).toBe(0)
    expect(r.winRate).toBeNull()
  })
})

// --- raggruppaPerGiorno -----------------------------------------------------

describe('raggruppaPerGiorno', () => {
  it('mette insieme i trade della stessa data', () => {
    const g = raggruppaPerGiorno([
      trade('2026-09-01', 'long', [vincente('a')]),
      trade('2026-09-01', 'short', [perdente('a')]),
      trade('2026-09-02', 'long', [vincente('a')]),
    ])

    expect(g.get('2026-09-01')).toHaveLength(2)
    expect(g.get('2026-09-02')).toHaveLength(1)
    expect(g.get('2026-09-03')).toBeUndefined()
  })
})

// --- rischio ----------------------------------------------------------------

describe('perditaPercent', () => {
  it('misura la perdita netta come percentuale positiva', () => {
    const t = [trade('2026-09-01', 'long', [perdente('a')])]
    expect(perditaPercent(t, A, '2026-09-01', '2026-09-01')).toBe(0.25)
  })

  it('vale 0 se il periodo si chiude in utile', () => {
    const t = [trade('2026-09-01', 'long', [vincente('a')])]
    expect(perditaPercent(t, A, '2026-09-01', '2026-09-01')).toBe(0)
  })

  it('compensa vincite e perdite dentro il periodo', () => {
    const t = [
      trade('2026-09-01', 'long', [vincente('a')]), // +500
      trade('2026-09-01', 'long', [perdente('a')]), // −250
    ]
    expect(perditaPercent(t, A, '2026-09-01', '2026-09-01')).toBe(0)
  })

  it('ignora i trade fuori dall\'intervallo', () => {
    const t = [trade('2026-08-31', 'long', [perdente('a')])]
    expect(perditaPercent(t, A, '2026-09-01', '2026-09-01')).toBe(0)
  })
})

describe('consumoRischio', () => {
  it('con più account prende il peggiore, non la media', () => {
    // Martedì 1 settembre 2026. Sull'account A perdo, sul B guadagno.
    const t = [trade('2026-09-01', 'long', [perdente('a'), vincente('b')])]
    const c = consumoRischio(t, ENTRAMBI, '2026-09-01', 2, 4)

    expect(c.perditaOggiPercent).toBe(0.25) // quella di A, non la media con B
    expect(c.quotaGiornaliera).toBe(0.125) // 0,25% su un limite del 2%
  })

  it('la settimana parte dal lunedì e include i giorni precedenti', () => {
    // 2026-09-01 è un martedì: il lunedì è il 31 agosto.
    const t = [
      trade('2026-08-31', 'long', [perdente('a')]),
      trade('2026-09-01', 'long', [perdente('a')]),
    ]
    const c = consumoRischio(t, [A], '2026-09-01', 2, 4)

    expect(c.perditaOggiPercent).toBe(0.25) // solo martedì
    expect(c.perditaSettimanaPercent).toBe(0.5) // lunedì + martedì
  })

  it('segnala lo sforamento con una quota superiore a 1', () => {
    // 10 lotti con 5 dollari di stop = 5.000 USD = 5% su 100.000
    const grosso = exe('a', { entry: 2000, stop_loss: 1995, exit: 1995, lotti: 10, esito: 'loss' })
    const t = [trade('2026-09-01', 'long', [grosso])]
    const c = consumoRischio(t, [A], '2026-09-01', 2, 4)

    expect(c.perditaOggiPercent).toBe(5)
    expect(c.quotaGiornaliera).toBe(2.5) // limite del 2% superato di due volte e mezzo
  })

  it('non consuma nulla in una giornata senza trade', () => {
    const c = consumoRischio([], ENTRAMBI, '2026-09-01', 2, 4)
    expect(c.quotaGiornaliera).toBe(0)
    expect(c.quotaSettimanale).toBe(0)
  })
})

// --- intensita --------------------------------------------------------------

describe('intensita', () => {
  it('dà il massimo al giorno più mosso del mese', () => {
    expect(intensita(1000, 1000)).toBe(1)
  })

  it('è indifferente al segno', () => {
    expect(intensita(-1000, 1000)).toBe(1)
  })

  it('non schiaccia i giorni piccoli sul trasparente', () => {
    // Con una scala lineare sarebbe 0,01; con la radice diventa 0,1: visibile.
    expect(intensita(10, 1000)).toBeCloseTo(0.1, 6)
  })

  it('vale 0 in un mese senza movimenti', () => {
    expect(intensita(0, 0)).toBe(0)
  })
})
