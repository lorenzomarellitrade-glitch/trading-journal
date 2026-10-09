import { describe, expect, it } from 'vitest'
import { A, exe, perdente, PROCESSO_COMPLETO, trade, vincente } from './fixture'
import { riassuntoGiorno, testoOperazioni } from './giorno'

describe('riassuntoGiorno', () => {
  it('conta i trade, il P&L dei conclusi e quanti erano a 5/5', () => {
    const r = riassuntoGiorno(
      [
        trade('2026-09-01', 'long', [vincente('a')], PROCESSO_COMPLETO),
        trade('2026-09-01', 'long', [perdente('a')]),
        trade('2026-09-01', 'long', [exe('a', { entry: 2000, stop_loss: 1995, lotti: 0.5 })], PROCESSO_COMPLETO),
      ],
      [A],
    )
    expect(r).toMatchObject({ numeroTrade: 3, conclusi: 2, pnlUsd: 250, processoCompleto: 2 })
    expect(r.pnlPercent).toBeCloseTo(0.25)
  })

  it('senza trade conclusi il P&L è null, non zero', () => {
    const r = riassuntoGiorno([], [A])
    expect(r).toEqual({ numeroTrade: 0, conclusi: 0, pnlUsd: null, pnlPercent: null, processoCompleto: 0 })
  })
})

describe('testoOperazioni', () => {
  it('una riga leggibile per il riepilogo settimanale', () => {
    expect(testoOperazioni({ numeroTrade: 2, conclusi: 2, pnlUsd: 100, pnlPercent: 0.1, processoCompleto: 1 })).toBe(
      '2 trade, 1 a 5/5',
    )
    expect(testoOperazioni({ numeroTrade: 1, conclusi: 1, pnlUsd: 1, pnlPercent: 0, processoCompleto: 1 })).toBe(
      '1 trade, 1 a 5/5',
    )
    expect(testoOperazioni({ numeroTrade: 0, conclusi: 0, pnlUsd: null, pnlPercent: null, processoCompleto: 0 })).toBe(
      'Nessun trade',
    )
  })
})
