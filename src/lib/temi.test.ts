import { afterEach, describe, expect, it, vi } from 'vitest'
import css from '../index.css?raw'
import html from '../../index.html?raw'
import {
  applicaTema,
  CHIAVE_TEMA,
  leggiTemaSalvato,
  salvaTema,
  TEMA_PREDEFINITO,
  TEMI,
  validaTema,
} from './temi'

/** Un localStorage finto, in memoria. */
function archivio(iniziale: Record<string, string> = {}) {
  const dati = new Map(Object.entries(iniziale))
  return {
    getItem: (k: string) => dati.get(k) ?? null,
    setItem: (k: string, v: string) => void dati.set(k, v),
    dati,
  }
}

/** Un archivio che lancia a ogni accesso, come in navigazione privata. */
const archivioRotto = {
  getItem: () => {
    throw new Error('SecurityError')
  },
  setItem: () => {
    throw new Error('QuotaExceededError')
  },
}

describe('validaTema', () => {
  it('accetta i tre temi', () => {
    expect(validaTema('grafite')).toBe('grafite')
    expect(validaTema('freddo')).toBe('freddo')
    expect(validaTema('notte')).toBe('notte')
  })

  it('il predefinito è Freddo', () => {
    expect(TEMA_PREDEFINITO).toBe('freddo')
  })

  it('qualsiasi altro valore diventa il predefinito', () => {
    for (const v of [null, undefined, '', 'Notte', 'terra', 42, {}, 'freddo ']) {
      expect(validaTema(v)).toBe(TEMA_PREDEFINITO)
    }
  })
})

describe('leggiTemaSalvato e salvaTema', () => {
  it('legge il tema salvato', () => {
    expect(leggiTemaSalvato(archivio({ [CHIAVE_TEMA]: 'notte' }))).toBe('notte')
  })

  it('senza nulla di salvato, o con un valore non valido, usa il predefinito', () => {
    expect(leggiTemaSalvato(archivio())).toBe(TEMA_PREDEFINITO)
    expect(leggiTemaSalvato(archivio({ [CHIAVE_TEMA]: 'terra' }))).toBe(TEMA_PREDEFINITO)
  })

  it('senza archivio, o con un archivio che lancia, usa il predefinito', () => {
    expect(leggiTemaSalvato(null)).toBe(TEMA_PREDEFINITO)
    expect(leggiTemaSalvato(archivioRotto)).toBe(TEMA_PREDEFINITO)
  })

  it('salva la scelta, e un archivio che lancia non rompe nulla', () => {
    const a = archivio()
    salvaTema('grafite', a)
    expect(a.dati.get(CHIAVE_TEMA)).toBe('grafite')
    expect(leggiTemaSalvato(a)).toBe('grafite')

    expect(() => salvaTema('notte', archivioRotto)).not.toThrow()
    expect(() => salvaTema('notte', null)).not.toThrow()
  })
})

describe('applicaTema', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('imposta data-theme e porta lo sfondo del tema nel meta theme-color', () => {
    const meta = { content: '', setAttribute: (_: string, v: string) => (meta.content = v) }
    const doc = {
      documentElement: { dataset: {} as Record<string, string> },
      querySelector: () => meta,
    }
    vi.stubGlobal('getComputedStyle', () => ({
      getPropertyValue: (nome: string) => (nome === '--color-sfondo' ? ' #010101 ' : ''),
    }))

    applicaTema('notte', doc as unknown as Document)

    expect(doc.documentElement.dataset.theme).toBe('notte')
    expect(meta.content).toBe('#010101')
  })
})

/**
 * Lo script in index.html non può importare temi.ts: ne ripete elenco,
 * chiave e sfondi. Questi test se ne accorgono se le copie divergono.
 */
describe('allineamento con index.html e index.css', () => {
  /** Lo sfondo di ogni tema secondo index.css: Freddo in @theme, gli altri nei blocchi. */
  function sfondoCss(tema: string): string | undefined {
    const blocco =
      tema === TEMA_PREDEFINITO
        ? css.match(/@theme static \{([\s\S]*?)\}/)?.[1]
        : css.match(new RegExp(`\\[data-theme='${tema}'\\] \\{([\\s\\S]*?)\\}`))?.[1]
    return blocco?.match(/--color-sfondo:\s*(#[0-9a-f]{6})/i)?.[1].toLowerCase()
  }

  it('ogni tema ha il suo blocco in index.css', () => {
    for (const t of TEMI) expect(sfondoCss(t.id), t.id).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('lo script di index.html conosce gli stessi temi con gli stessi sfondi', () => {
    const mappa = html.match(/var sfondi = (\{[^}]*\})/)?.[1]
    expect(mappa).toBeDefined()
    const sfondi = JSON.parse(mappa!.replace(/'/g, '"').replace(/(\w+):/g, '"$1":'))

    expect(Object.keys(sfondi).sort()).toEqual(TEMI.map((t) => t.id).sort())
    for (const t of TEMI) expect(sfondi[t.id].toLowerCase(), t.id).toBe(sfondoCss(t.id))
  })

  it('lo script usa la stessa chiave e lo stesso predefinito', () => {
    expect(html).toContain(`getItem('${CHIAVE_TEMA}')`)
    expect(html).toContain(`var tema = '${TEMA_PREDEFINITO}'`)
    expect(html).toContain(`data-theme="${TEMA_PREDEFINITO}"`)
  })
})
