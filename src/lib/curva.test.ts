import { describe, expect, it } from 'vitest'
import { geometriaCurva } from './curva'

describe('geometriaCurva', () => {
  it('parte da zero e distribuisce i punti su tutta la larghezza', () => {
    const g = geometriaCurva([100, 50], 200, 100, 0)!
    // Serie [0, 100, 50]: minimo 0 in basso, massimo 100 in alto
    expect(g.punti).toBe('0,100 100,0 200,50')
    expect(g.zeroY).toBe(100)
    expect(g.ultimo).toEqual({ x: 200, y: 50 })
    expect(g.valoreFinale).toBe(50)
  })

  it('con valori negativi la linea dello zero sta in mezzo', () => {
    const g = geometriaCurva([100, -100], 100, 100, 0)!
    expect(g.zeroY).toBe(50)
    expect(g.valoreFinale).toBe(-100)
  })

  it('rispetta il margine sopra e sotto', () => {
    const g = geometriaCurva([100], 100, 100, 10)!
    expect(g.punti).toBe('0,90 100,10')
  })

  it('una serie piatta non divide per zero', () => {
    const g = geometriaCurva([0, 0], 100, 100, 0)!
    expect(g.punti).not.toContain('NaN')
  })

  it('senza valori non c\'è niente da disegnare', () => {
    expect(geometriaCurva([], 100, 100)).toBeNull()
  })
})
