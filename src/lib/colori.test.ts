import { afterEach, describe, expect, it, vi } from 'vitest'
import { coloriSerie, leggiColori, TOKEN, velato } from './colori'

describe('TOKEN', () => {
  it('rimanda alle variabili dei token, senza codici colore', () => {
    expect(TOKEN.positivo).toBe('var(--color-positivo)')
    expect(TOKEN.testoSoft).toBe('var(--color-testo-soft)')
    expect(TOKEN.serieA).toBe('var(--color-serie-a)')
    for (const v of Object.values(TOKEN)) expect(v).not.toMatch(/#/)
  })
})

describe('velato', () => {
  it('mescola il token con il trasparente nella quota indicata', () => {
    expect(velato('positivo', 0.55)).toBe(
      'color-mix(in srgb, var(--color-positivo) 55%, transparent)',
    )
  })

  it('limita la quota fra 0 e 1', () => {
    expect(velato('negativo', 2)).toContain(' 100%')
    expect(velato('negativo', -1)).toContain(' 0%')
  })
})

describe('leggiColori', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('legge i valori risolti dal tema attivo, senza spazi', () => {
    vi.stubGlobal('getComputedStyle', () => ({
      getPropertyValue: (nome: string) => (nome === '--color-positivo' ? ' #9ad6f7' : ' #000000 '),
    }))

    const c = leggiColori({} as Element)
    expect(c.positivo).toBe('#9ad6f7')
    expect(c.negativo).toBe('#000000')
    expect(coloriSerie(c)).toEqual([c.accento, c.positivo, c.serieA, c.negativo])
  })
})
