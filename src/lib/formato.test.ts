import { describe, expect, it } from 'vitest'
import { numeroDaInput, testoInDigitazione, testoPulito } from './formato'

describe('testoInDigitazione', () => {
  it('conserva lo spazio finale mentre si scrive', () => {
    // Regressione: togliendolo a ogni tasto non si riusciva a separare le
    // parole nella nota sull'uscita del form trade.
    expect(testoInDigitazione('ciao ')).toBe('ciao ')
  })

  it('conserva gli spazi fra le parole e gli a capo', () => {
    expect(testoInDigitazione('uscito presto\nera il piano')).toBe('uscito presto\nera il piano')
  })

  it('tratta come vuoto un campo fatto solo di spazi', () => {
    expect(testoInDigitazione('')).toBeNull()
    expect(testoInDigitazione('   ')).toBeNull()
  })
})

describe('testoPulito', () => {
  it('toglie gli spazi agli estremi al salvataggio', () => {
    expect(testoPulito('  ciao mondo  ')).toBe('ciao mondo')
  })

  it('lascia intatti gli spazi interni', () => {
    expect(testoPulito('uscito  presto')).toBe('uscito  presto')
  })

  it('restituisce null per valori vuoti', () => {
    expect(testoPulito(null)).toBeNull()
    expect(testoPulito(undefined)).toBeNull()
    expect(testoPulito('   ')).toBeNull()
  })
})

describe('numeroDaInput', () => {
  it('accetta la virgola come separatore decimale', () => {
    expect(numeroDaInput('2345,67')).toBe(2345.67)
  })

  it('restituisce null per un campo vuoto', () => {
    expect(numeroDaInput('')).toBeNull()
  })
})
