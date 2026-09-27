import { describe, expect, it } from 'vitest'
import { acc, perdente, trade, vincente } from './fixture'
import { qualcheObiettivo, statoConti } from './obiettivi'
import type { Account } from './tipi'

function conRegole(
  id: string,
  target: number | null,
  giornaliero: number | null,
  totale: number | null,
): Account {
  return {
    ...acc(id),
    target_profitto_percent: target,
    drawdown_giornaliero_percent: giornaliero,
    drawdown_massimo_percent: totale,
  }
}

/** Conto prop in fase 2: +5% per passare, −4% al giorno, −10% in tutto. */
const PROP = conRegole('a', 5, 4, 10)
/** Conto reale personale: nessun obiettivo, nessun limite. */
const PERSONALE = conRegole('b', null, null, null)

const OGGI = '2026-09-27'

describe('statoConti', () => {
  it('misura il rendimento sul saldo iniziale del conto', () => {
    // +500 su 100.000 = +0,5%
    const [s] = statoConti([trade('2026-09-01', 'long', [vincente('a')])], [PROP], OGGI)
    expect(s.pnlUsd).toBe(500)
    expect(s.pnlPercent).toBe(0.5)
  })

  it('calcola la quota di target raggiunta', () => {
    // +0,5% su un target del 5%
    const [s] = statoConti([trade('2026-09-01', 'long', [vincente('a')])], [PROP], OGGI)
    expect(s.quotaTarget).toBeCloseTo(0.1, 6)
  })

  it('non mostra obiettivi sul conto che non ne ha', () => {
    const [s] = statoConti([trade('2026-09-01', 'long', [vincente('b')])], [PERSONALE], OGGI)
    expect(s.targetPercent).toBeNull()
    expect(s.quotaTarget).toBeNull()
    expect(s.drawdownPercent).toBeNull()
    expect(s.marginePercent).toBeNull()
    expect(s.limiteGiornalieroPercent).toBeNull()
    expect(s.quotaGiornaliera).toBeNull()
    // il rendimento però si vede lo stesso
    expect(s.pnlPercent).toBe(0.5)
  })

  it('in perdita consuma il margine complessivo', () => {
    // −250 su 100.000 = −0,25%, su un limite del 10%
    const [s] = statoConti([trade('2026-09-01', 'long', [perdente('a')])], [PROP], OGGI)
    expect(s.pnlPercent).toBe(-0.25)
    expect(s.quotaDrawdown).toBeCloseTo(0.025, 6)
    expect(s.marginePercent).toBeCloseTo(9.75, 6)
  })

  it('in utile il margine cresce, perché il limite resta fisso sotto il saldo iniziale', () => {
    const [s] = statoConti([trade('2026-09-01', 'long', [vincente('a')])], [PROP], OGGI)
    expect(s.marginePercent).toBeCloseTo(10.5, 6)
    expect(s.quotaDrawdown).toBe(0)
  })

  it('un conto che non ha ancora operato è a zero, non a valore ignoto', () => {
    const [s] = statoConti([], [PROP], OGGI)
    expect(s.pnlPercent).toBe(0)
    expect(s.quotaTarget).toBe(0)
    expect(s.quotaDrawdown).toBe(0)
    expect(s.quotaGiornaliera).toBe(0)
  })

  it('tiene i conti separati: uno in utile non copre l\'altro in perdita', () => {
    const stati = statoConti(
      [trade('2026-09-01', 'long', [vincente('a'), perdente('b')])],
      [PROP, PERSONALE],
      OGGI,
    )
    expect(stati[0].pnlPercent).toBe(0.5)
    expect(stati[1].pnlPercent).toBe(-0.25)
  })

  it('considera tutto lo storico, non solo il mese in corso', () => {
    const stati = statoConti(
      [
        trade('2026-07-01', 'long', [vincente('a')]),
        trade('2026-09-01', 'long', [vincente('a')]),
      ],
      [PROP],
      OGGI,
    )
    expect(stati[0].pnlUsd).toBe(1000)
  })
})

describe('limite giornaliero della prop', () => {
  it('conta solo la perdita di oggi, non quella complessiva', () => {
    const stati = statoConti(
      [
        trade('2026-09-01', 'long', [perdente('a')]), // vecchia, non conta per oggi
        trade(OGGI, 'long', [perdente('a')]), // −0,25% oggi
      ],
      [PROP],
      OGGI,
    )

    expect(stati[0].perditaOggiPercent).toBe(0.25)
    expect(stati[0].quotaGiornaliera).toBeCloseTo(0.0625, 6) // 0,25 su 4
    // il totale invece somma entrambe
    expect(stati[0].pnlPercent).toBe(-0.5)
  })

  it('una giornata chiusa in utile non consuma il limite', () => {
    const stati = statoConti([trade(OGGI, 'long', [vincente('a')])], [PROP], OGGI)
    expect(stati[0].perditaOggiPercent).toBe(0)
    expect(stati[0].quotaGiornaliera).toBe(0)
  })

  it('segnala lo sforamento con una quota superiore a 1', () => {
    // 10 lotti con 5 dollari di stop: −5.000 su 100.000 = −5%, oltre il 4%
    const grosso = trade(OGGI, 'long', [
      { ...perdente('a'), lotti: 10 },
    ])
    const stati = statoConti([grosso], [PROP], OGGI)

    expect(stati[0].perditaOggiPercent).toBe(5)
    expect(stati[0].quotaGiornaliera).toBeCloseTo(1.25, 6)
  })
})

describe('qualcheObiettivo', () => {
  it('è falso quando nessun conto ha regole', () => {
    expect(qualcheObiettivo(statoConti([], [PERSONALE], OGGI))).toBe(false)
  })

  it('è vero se almeno un conto ne ha', () => {
    expect(qualcheObiettivo(statoConti([], [PERSONALE, PROP], OGGI))).toBe(true)
  })
})
