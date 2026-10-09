import { describe, expect, it } from 'vitest'
import { geometriaCurva, indicePiuVicino } from './curva'

describe('geometriaCurva', () => {
  it('parte da zero e distribuisce i punti su tutta la larghezza', () => {
    const g = geometriaCurva([100, 50], 200, 100, { margine: 0 })!
    // Serie [0, 100, 50]: minimo 0 in basso, massimo 100 in alto
    expect(g.punti).toBe('0,100 100,0 200,50')
    expect(g.coordinate).toHaveLength(3)
    expect(g.zeroY).toBe(100)
    expect(g.ultimo).toEqual({ x: 200, y: 50 })
    expect(g.valoreFinale).toBe(50)
  })

  it('con valori negativi la linea dello zero sta in mezzo', () => {
    const g = geometriaCurva([100, -100], 100, 100, { margine: 0 })!
    expect(g.zeroY).toBe(50)
    expect(g.valoreFinale).toBe(-100)
  })

  it('rispetta il margine sopra e sotto', () => {
    const g = geometriaCurva([100], 100, 100, { margine: 10 })!
    expect(g.punti).toBe('0,90 100,10')
  })

  it('senza partire da zero disegna solo la forma della serie', () => {
    const g = geometriaCurva([50, 60, 55], 100, 10, { margine: 0, daZero: false })!
    expect(g.coordinate).toHaveLength(3)
    expect(g.coordinate[0].y).toBe(10) // 50 è il minimo, in basso
    expect(g.coordinate[1].y).toBe(0) // 60 è il massimo, in alto
    expect(g.valoreFinale).toBe(55)
  })

  it('una serie piatta o di un solo punto non produce NaN', () => {
    expect(geometriaCurva([0, 0], 100, 100)!.punti).not.toContain('NaN')
    expect(geometriaCurva([5], 100, 100, { daZero: false })!.punti).toBe('50,50')
  })

  it("senza valori non c'è niente da disegnare", () => {
    expect(geometriaCurva([], 100, 100)).toBeNull()
  })
})

describe('indicePiuVicino', () => {
  it('aggancia il punto più vicino alla posizione del puntatore', () => {
    expect(indicePiuVicino(5, 0)).toBe(0)
    expect(indicePiuVicino(5, 0.49)).toBe(2)
    expect(indicePiuVicino(5, 1)).toBe(4)
  })

  it('resta dentro la serie anche fuori dai bordi', () => {
    expect(indicePiuVicino(5, -0.3)).toBe(0)
    expect(indicePiuVicino(5, 1.7)).toBe(4)
    expect(indicePiuVicino(1, 0.8)).toBe(0)
    expect(indicePiuVicino(0, 0.8)).toBe(0)
  })
})
