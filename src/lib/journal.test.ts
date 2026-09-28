import { describe, expect, it } from 'vitest'
import {
  COPPIE_FOREX,
  coppiaObbligatoria,
  stessaPosizione,
  titoloPosizione,
  usaCoppia,
} from './journal'

describe('COPPIE_FOREX', () => {
  const tutte = COPPIE_FOREX.flatMap((g) => g.coppie)

  it('contiene le 22 coppie della watchlist', () => {
    expect(tutte).toHaveLength(22)
  })

  it('non ha doppioni', () => {
    expect(new Set(tutte).size).toBe(tutte.length)
  })

  it('usa solo il formato accettato dal database', () => {
    // Stesso controllo del vincolo note_coppia_formato: sei lettere maiuscole.
    for (const c of tutte) expect(c).toMatch(/^[A-Z]{6}$/)
  })

  it('mette ogni coppia nel gruppo della sua valuta base', () => {
    for (const g of COPPIE_FOREX) {
      for (const c of g.coppie) expect(c.startsWith(g.valuta)).toBe(true)
    }
  })
})

describe('regole sulla coppia', () => {
  it('sull\'oro la coppia non si usa', () => {
    expect(usaCoppia({ mercato: 'xauusd', canale: 'tp' })).toBe(false)
    expect(coppiaObbligatoria({ mercato: 'xauusd', canale: 'tp' })).toBe(false)
  })

  it('sullo Stato mentale la coppia non si usa', () => {
    expect(usaCoppia({ mercato: null, canale: 'stato-mentale' })).toBe(false)
  })

  it('nei canali dei trade forex è obbligatoria', () => {
    for (const canale of ['tp', 'stop', 'be', 'miss'] as const) {
      expect(coppiaObbligatoria({ mercato: 'forex', canale })).toBe(true)
    }
  })

  it('in Visione forex si può indicare ma non è obbligatoria', () => {
    const p = { mercato: 'forex', canale: 'visione' } as const
    expect(usaCoppia(p)).toBe(true)
    expect(coppiaObbligatoria(p)).toBe(false)
  })
})

describe('stessaPosizione', () => {
  it('distingue lo stesso canale su mercati diversi', () => {
    expect(
      stessaPosizione({ mercato: 'xauusd', canale: 'stop' }, { mercato: 'forex', canale: 'stop' }),
    ).toBe(false)
  })

  it('riconosce la stessa posizione', () => {
    expect(
      stessaPosizione({ mercato: 'forex', canale: 'tp' }, { mercato: 'forex', canale: 'tp' }),
    ).toBe(true)
  })
})

describe('titoloPosizione', () => {
  it('antepone il mercato al canale', () => {
    expect(titoloPosizione({ mercato: 'forex', canale: 'stop' })).toBe('Forex · Stop')
    expect(titoloPosizione({ mercato: 'xauusd', canale: 'visione' })).toBe('XAUUSD · Visione')
  })

  it('lo Stato mentale non ha mercato davanti', () => {
    expect(titoloPosizione({ mercato: null, canale: 'stato-mentale' })).toBe('Stato mentale')
  })
})
