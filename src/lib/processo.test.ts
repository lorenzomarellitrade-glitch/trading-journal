import { describe, expect, it } from 'vitest'
import { PROCESSO_COMPLETO, trade } from './fixture'
import { finestraDaOra, verificheProcesso } from './processo'

describe('verificheProcesso', () => {
  it('un trade da manuale passa tutte e cinque le verifiche', () => {
    const v = verificheProcesso(
      trade('2026-09-01', 'long', [], { ...PROCESSO_COMPLETO, finestra: '09:00-12:00' }),
    )
    expect(v.map((x) => x.chiave)).toEqual(['conferme', 'finestra', 'stop', 'uscita', 'idea'])
    expect(v.every((x) => x.esito === 'ok')).toBe(true)
    expect(v[0].dettaglio).toBe('5/5')
  })

  it('segnala ogni deviazione dal piano', () => {
    const v = verificheProcesso(
      trade('2026-09-01', 'long', [], {
        step1_analisi_multitf: true,
        finestra: 'fuori finestra',
        sl_spostato: true,
        chiuso_manualmente: true,
        idea_esterna: true,
      }),
    )
    expect(v.map((x) => x.esito)).toEqual(['ko', 'ko', 'ko', 'ko', 'ko'])
    expect(v[0].dettaglio).toBe('1/5')
  })

  it('la finestra non indicata non è una violazione', () => {
    const v = verificheProcesso({ finestra: null })
    expect(v.find((x) => x.chiave === 'finestra')?.esito).toBe('nd')
  })
})

describe('finestraDaOra', () => {
  it('dalle 09:00 alle 11:59 è dentro la finestra', () => {
    expect(finestraDaOra('09:00')).toBe('09:00-12:00')
    expect(finestraDaOra('11:59:00')).toBe('09:00-12:00')
  })

  it('prima delle 9 e da mezzogiorno in poi è fuori', () => {
    expect(finestraDaOra('08:59')).toBe('fuori finestra')
    expect(finestraDaOra('12:00')).toBe('fuori finestra')
    expect(finestraDaOra('15:30:00')).toBe('fuori finestra')
  })

  it('senza ora, o con un valore non valido, nessuna proposta', () => {
    expect(finestraDaOra(null)).toBeNull()
    expect(finestraDaOra('')).toBeNull()
    expect(finestraDaOra('9.30')).toBeNull()
  })
})
