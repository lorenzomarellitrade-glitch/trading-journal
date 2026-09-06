import { describe, expect, it } from 'vitest'
import { A, ENTRAMBI, exe, perdente, PROCESSO_COMPLETO, trade, vincente } from './fixture'
import { FILTRI_VUOTI, filtraTrades, ordinaTrades, type Filtri } from './filtri'

function con(patch: Partial<Filtri>): Filtri {
  return { ...FILTRI_VUOTI, ...patch }
}

const TRADES = [
  trade('2026-09-01', 'long', [vincente('a'), vincente('b')], {
    finestra: '09:00-10:30',
    ...PROCESSO_COMPLETO,
  }),
  trade('2026-09-05', 'short', [perdente('a'), perdente('b')], {
    finestra: '12:00-13:00',
    step1_analisi_multitf: true,
  }),
  trade('2026-09-10', 'long', [exe('b', { entry: 2000, stop_loss: 1995, exit: 2010, lotti: 1, esito: 'win' })], {
    finestra: 'fuori finestra',
  }),
]

describe('filtraTrades', () => {
  it('senza filtri restituisce tutto', () => {
    expect(filtraTrades(TRADES, ENTRAMBI, FILTRI_VUOTI)).toHaveLength(3)
  })

  it('taglia per data di inizio e di fine', () => {
    expect(filtraTrades(TRADES, ENTRAMBI, con({ da: '2026-09-05' }))).toHaveLength(2)
    expect(filtraTrades(TRADES, ENTRAMBI, con({ a: '2026-09-05' }))).toHaveLength(2)
    expect(
      filtraTrades(TRADES, ENTRAMBI, con({ da: '2026-09-02', a: '2026-09-09' })),
    ).toHaveLength(1)
  })

  it('include gli estremi dell\'intervallo', () => {
    const r = filtraTrades(TRADES, ENTRAMBI, con({ da: '2026-09-01', a: '2026-09-01' }))
    expect(r).toHaveLength(1)
  })

  it('filtra per finestra oraria', () => {
    expect(filtraTrades(TRADES, ENTRAMBI, con({ finestra: '09:00-10:30' }))).toHaveLength(1)
    expect(filtraTrades(TRADES, ENTRAMBI, con({ finestra: 'fuori finestra' }))).toHaveLength(1)
  })

  it('filtra per esito', () => {
    expect(filtraTrades(TRADES, ENTRAMBI, con({ esito: 'win' }))).toHaveLength(2)
    expect(filtraTrades(TRADES, ENTRAMBI, con({ esito: 'loss' }))).toHaveLength(1)
  })

  it('isola i trade con tutte e cinque le conferme', () => {
    const r = filtraTrades(TRADES, ENTRAMBI, con({ soloProcessoCompleto: true }))
    expect(r).toHaveLength(1)
    expect(r[0].data).toBe('2026-09-01')
  })

  it('nasconde i trade che non toccano l\'account selezionato', () => {
    // Il terzo trade è solo sull'account B.
    const r = filtraTrades(TRADES, [A], FILTRI_VUOTI)
    expect(r).toHaveLength(2)
    expect(r.map((t) => t.data)).not.toContain('2026-09-10')
  })

  it('combina più filtri', () => {
    const r = filtraTrades(TRADES, ENTRAMBI, con({ esito: 'win', finestra: '09:00-10:30' }))
    expect(r).toHaveLength(1)
  })
})

describe('ordinaTrades', () => {
  it('ordina per data nei due versi', () => {
    expect(ordinaTrades(TRADES, ENTRAMBI, 'data', 'asc')[0].data).toBe('2026-09-01')
    expect(ordinaTrades(TRADES, ENTRAMBI, 'data', 'desc')[0].data).toBe('2026-09-10')
  })

  it('ordina per P&L', () => {
    const crescente = ordinaTrades(TRADES, ENTRAMBI, 'pnl', 'asc')
    expect(crescente[0].data).toBe('2026-09-05') // −500, l'unico in perdita
  })

  it('ordina per numero di conferme', () => {
    expect(ordinaTrades(TRADES, ENTRAMBI, 'conferme', 'desc')[0].data).toBe('2026-09-01')
  })

  it('tiene i valori mancanti in fondo in entrambi i versi', () => {
    const aperto = trade('2026-09-20', 'long', [exe('a', { entry: 2000, stop_loss: 1995 })])
    const insieme = [...TRADES, aperto]

    expect(ordinaTrades(insieme, ENTRAMBI, 'pnl', 'asc').at(-1)?.data).toBe('2026-09-20')
    expect(ordinaTrades(insieme, ENTRAMBI, 'pnl', 'desc').at(-1)?.data).toBe('2026-09-20')
  })

  it('non modifica l\'array originale', () => {
    const prima = TRADES.map((t) => t.data)
    ordinaTrades(TRADES, ENTRAMBI, 'pnl', 'asc')
    expect(TRADES.map((t) => t.data)).toEqual(prima)
  })
})
