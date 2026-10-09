import { describe, expect, it } from 'vitest'
import { A, perdente, trade, vincente } from './fixture'
import { analisiContesto, perOraEntrata } from './statistiche'

describe('analisiContesto', () => {
  it('propone bias Daily, bias H4 e F+R, in questo ordine', () => {
    expect(analisiContesto([], [A]).map((c) => c.titolo)).toEqual([
      'Bias Daily',
      'Bias H4',
      'Fallimento + Rottura',
    ])
  })

  it('divide i trade a favore e contro il bias, in entrambe le direzioni', () => {
    const trades = [
      trade('2026-09-01', 'long', [vincente('a')], { bias_daily: 'rialzista' }), // a favore
      trade('2026-09-02', 'short', [vincente('a')], { bias_daily: 'ribassista' }), // a favore
      trade('2026-09-03', 'short', [perdente('a')], { bias_daily: 'rialzista' }), // contro
      trade('2026-09-04', 'long', [perdente('a')], { bias_daily: 'laterale' }), // laterale
      trade('2026-09-05', 'long', [perdente('a')]), // bias non indicato: fuori
    ]
    const [daily] = analisiContesto(trades, [A])
    expect(daily.gruppi.map((g) => g.numeroTrade)).toEqual([2, 1, 1])
    expect(daily.gruppi[0].winRate).toBe(100)
    expect(daily.gruppi[1].winRate).toBe(0)
  })

  it('confronta prima e seconda F+R, lasciando fuori quelle non indicate', () => {
    const trades = [
      trade('2026-09-01', 'long', [vincente('a')], { numero_fr: 'primo' }),
      trade('2026-09-02', 'long', [perdente('a')], { numero_fr: 'secondo' }),
      trade('2026-09-03', 'long', [perdente('a')], { numero_fr: 'secondo' }),
      trade('2026-09-04', 'long', [perdente('a')]),
    ]
    const fr = analisiContesto(trades, [A])[2]
    expect(fr.gruppi.map((g) => [g.etichetta, g.numeroTrade])).toEqual([
      ['Prima F+R', 1],
      ['Seconda F+R', 2],
    ])
  })
})

describe('perOraEntrata', () => {
  it("una riga per ogni ora d'entrata, in ordine, e i trade senza ora in fondo", () => {
    const righe = perOraEntrata(
      [
        trade('2026-09-01', 'long', [vincente('a')], { ora_entrata: '10:15:00' }),
        trade('2026-09-02', 'long', [perdente('a')], { ora_entrata: '09:40:00' }),
        trade('2026-09-03', 'long', [vincente('a')], { ora_entrata: '10:50:00' }),
        trade('2026-09-04', 'long', [perdente('a')]),
      ],
      [A],
    )
    expect(righe.map((r) => [r.etichetta, r.numeroTrade])).toEqual([
      ['09:00-09:59', 1],
      ['10:00-10:59', 2],
      ['Ora non indicata', 1],
    ])
    expect(righe[1].winRate).toBe(100)
  })

  it('senza trade nessuna riga', () => {
    expect(perOraEntrata([], [A])).toEqual([])
  })
})
