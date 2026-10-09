import { describe, expect, it } from 'vitest'
import { DURATA_MS, easeOutCubic, valoreAnimato } from './animazione'

describe('animazione', () => {
  it('resta sotto i 600 ms', () => {
    expect(DURATA_MS).toBeLessThan(600)
  })

  it('easeOutCubic va da 0 a 1 e rallenta alla fine', () => {
    expect(easeOutCubic(0)).toBe(0)
    expect(easeOutCubic(1)).toBe(1)
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5)
    expect(easeOutCubic(-1)).toBe(0)
    expect(easeOutCubic(2)).toBe(1)
  })

  it('valoreAnimato parte da "da" e arriva esattamente ad "a"', () => {
    expect(valoreAnimato(0, 1000, 0)).toBe(0)
    expect(valoreAnimato(0, 1000, DURATA_MS)).toBe(1000)
    expect(valoreAnimato(0, 1000, DURATA_MS * 3)).toBe(1000)
    const meta = valoreAnimato(0, -500, DURATA_MS / 2)
    expect(meta).toBeLessThan(0)
    expect(meta).toBeGreaterThan(-500)
  })

  it('con durata nulla salta subito al valore finale', () => {
    expect(valoreAnimato(0, 42, 0, 0)).toBe(42)
  })
})
