import { describe, expect, it } from 'vitest'
import {
  calcolaMetriche,
  contaConferme,
  inPercentuale,
  ONCE_PER_LOTTO,
  pnlUsd,
  processoCompleto,
  rRealizzato,
  rischioUsd,
  rrPianificato,
} from './calcoli'

// Trade di riferimento usato in più test.
// Long da 2000, stop a 1995 (5 dollari), target a 2010 (10 dollari), mezzo lotto.
// rischio = 5 × 100 × 0.5 = 250 USD ; RR pianificato = 10 / 5 = 2
const LONG = { entry: 2000, stop_loss: 1995, take_profit: 2010, exit: 2010, lotti: 0.5 }

// Lo speculare short: entry 2000, stop a 2005, target a 1990.
const SHORT = { entry: 2000, stop_loss: 2005, take_profit: 1990, exit: 1990, lotti: 0.5 }

describe('ONCE_PER_LOTTO', () => {
  it('vale 100: su XAUUSD un lotto sono 100 once', () => {
    expect(ONCE_PER_LOTTO).toBe(100)
  })
})

describe('rischioUsd', () => {
  it('moltiplica la distanza dello stop per once e lotti', () => {
    expect(rischioUsd(2000, 1995, 0.5)).toBe(250)
  })

  it('è indifferente al verso: conta la distanza, non il segno', () => {
    expect(rischioUsd(2000, 2005, 0.5)).toBe(250)
  })

  it('vale 0 se lo stop coincide con l\'entry', () => {
    expect(rischioUsd(2000, 2000, 0.5)).toBe(0)
  })

  it('restituisce null se manca un dato', () => {
    expect(rischioUsd(null, 1995, 0.5)).toBeNull()
    expect(rischioUsd(2000, null, 0.5)).toBeNull()
    expect(rischioUsd(2000, 1995, null)).toBeNull()
  })
})

describe('rrPianificato', () => {
  it('rapporta la distanza del target a quella dello stop', () => {
    expect(rrPianificato(2000, 1995, 2010)).toBe(2)
  })

  it('dà lo stesso rapporto sullo short', () => {
    expect(rrPianificato(2000, 2005, 1990)).toBe(2)
  })

  it('gestisce i rapporti frazionari', () => {
    // stop a 10 dollari, target a 5: rischio il doppio di quanto punto
    expect(rrPianificato(2000, 1990, 2005)).toBe(0.5)
  })

  it('restituisce null se lo stop coincide con l\'entry (divisione per zero)', () => {
    expect(rrPianificato(2000, 2000, 2010)).toBeNull()
  })

  it('restituisce null se manca il take profit', () => {
    expect(rrPianificato(2000, 1995, null)).toBeNull()
  })
})

describe('pnlUsd', () => {
  it('sul long guadagna quando il prezzo sale', () => {
    expect(pnlUsd(2000, 2010, 0.5, 'long')).toBe(500)
  })

  it('sul long perde quando il prezzo scende', () => {
    expect(pnlUsd(2000, 1995, 0.5, 'long')).toBe(-250)
  })

  it('sullo short guadagna quando il prezzo scende', () => {
    expect(pnlUsd(2000, 1990, 0.5, 'short')).toBe(500)
  })

  it('sullo short perde quando il prezzo sale', () => {
    expect(pnlUsd(2000, 2005, 0.5, 'short')).toBe(-250)
  })

  it('vale 0 se esco al prezzo di entrata', () => {
    expect(pnlUsd(2000, 2000, 0.5, 'long')).toBe(0)
  })

  it('restituisce null finché non ho inserito l\'uscita', () => {
    expect(pnlUsd(2000, null, 0.5, 'long')).toBeNull()
  })

  it('restituisce null senza direzione', () => {
    expect(pnlUsd(2000, 2010, 0.5, null)).toBeNull()
  })
})

describe('rRealizzato', () => {
  it('esprime il risultato in multipli del rischio', () => {
    expect(rRealizzato(500, 250)).toBe(2)
  })

  it('vale -1 quando la perdita è pari al rischio pianificato', () => {
    expect(rRealizzato(-250, 250)).toBe(-1)
  })

  it('restituisce null con rischio zero, invece di Infinity', () => {
    expect(rRealizzato(500, 0)).toBeNull()
  })

  it('restituisce null se il P&L non c\'è ancora', () => {
    expect(rRealizzato(null, 250)).toBeNull()
  })
})

describe('inPercentuale', () => {
  it('rapporta l\'importo al capitale di partenza', () => {
    expect(inPercentuale(500, 100000)).toBe(0.5)
    expect(inPercentuale(250, 100000)).toBe(0.25)
  })

  it('mantiene il segno delle perdite', () => {
    expect(inPercentuale(-2000, 100000)).toBe(-2)
  })

  it('restituisce null con saldo zero', () => {
    expect(inPercentuale(500, 0)).toBeNull()
  })
})

describe('calcolaMetriche', () => {
  it('calcola tutto per un long andato a target', () => {
    const m = calcolaMetriche(LONG, 'long', 100000)
    expect(m.rischioUsd).toBe(250)
    expect(m.rischioPercent).toBe(0.25)
    expect(m.rrPianificato).toBe(2)
    expect(m.pnlUsd).toBe(500)
    expect(m.pnlPercent).toBe(0.5)
    expect(m.rRealizzato).toBe(2)
  })

  it('dà gli stessi numeri sullo short speculare', () => {
    const m = calcolaMetriche(SHORT, 'short', 100000)
    expect(m.rischioUsd).toBe(250)
    expect(m.rrPianificato).toBe(2)
    expect(m.pnlUsd).toBe(500)
    expect(m.rRealizzato).toBe(2)
  })

  it('su uno stop colpito dà R = -1', () => {
    const m = calcolaMetriche({ ...LONG, exit: 1995 }, 'long', 100000)
    expect(m.pnlUsd).toBe(-250)
    expect(m.rRealizzato).toBe(-1)
    expect(m.pnlPercent).toBe(-0.25)
  })

  it('con posizione ancora aperta dà rischio e RR ma non P&L', () => {
    const m = calcolaMetriche({ ...LONG, exit: null }, 'long', 100000)
    expect(m.rischioUsd).toBe(250)
    expect(m.rrPianificato).toBe(2)
    expect(m.pnlUsd).toBeNull()
    expect(m.pnlPercent).toBeNull()
    expect(m.rRealizzato).toBeNull()
  })

  it('con un trade appena abbozzato non inventa numeri', () => {
    const vuoto = { entry: null, stop_loss: null, take_profit: null, exit: null, lotti: null }
    const m = calcolaMetriche(vuoto, null, 100000)
    expect(m.rischioUsd).toBeNull()
    expect(m.rischioPercent).toBeNull()
    expect(m.rrPianificato).toBeNull()
    expect(m.pnlUsd).toBeNull()
    expect(m.pnlPercent).toBeNull()
    expect(m.rRealizzato).toBeNull()
  })

  it('gestisce i prezzi decimali di XAUUSD senza derive', () => {
    // Entry 2345.67, stop 2340.12 → 5.55 dollari di distanza, 1.25 lotti
    const m = calcolaMetriche(
      { entry: 2345.67, stop_loss: 2340.12, take_profit: 2356.77, exit: 2356.77, lotti: 1.25 },
      'long',
      100000,
    )
    expect(m.rischioUsd).toBeCloseTo(693.75, 6)
    expect(m.rrPianificato).toBeCloseTo(2, 6)
    expect(m.pnlUsd).toBeCloseTo(1387.5, 6)
    expect(m.rRealizzato).toBeCloseTo(2, 6)
  })

  it('supera la soglia di rischio dell\'1.2% quando il size è troppo grande', () => {
    // 5 dollari di stop con 3 lotti = 1500 USD = 1.5% di 100.000
    const m = calcolaMetriche({ ...LONG, lotti: 3 }, 'long', 100000)
    expect(m.rischioPercent).toBe(1.5)
    expect(m.rischioPercent! > 1.2).toBe(true)
  })
})

describe('contaConferme', () => {
  const tutte = {
    step1_analisi_multitf: true,
    step2_zona_operativa: true,
    step3_prezzo_in_zona: true,
    step4_schematica: true,
    step5_fallimento_rottura: true,
  }

  it('conta 5 su 5 quando il processo è rispettato', () => {
    expect(contaConferme(tutte)).toBe(5)
    expect(processoCompleto(tutte)).toBe(true)
  })

  it('conta le conferme parziali', () => {
    expect(contaConferme({ ...tutte, step4_schematica: false })).toBe(4)
    expect(processoCompleto({ ...tutte, step4_schematica: false })).toBe(false)
  })

  it('conta 0 su un trade vuoto', () => {
    expect(contaConferme({})).toBe(0)
    expect(processoCompleto({})).toBe(false)
  })
})
