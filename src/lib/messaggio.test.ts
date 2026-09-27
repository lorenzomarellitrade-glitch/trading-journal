import { describe, expect, it } from 'vitest'
import { segmentiMessaggio, sorgenteImmagine } from './messaggio'

describe('sorgenteImmagine', () => {
  it('riconosce uno snapshot di TradingView', () => {
    expect(sorgenteImmagine('https://www.tradingview.com/x/AbCd1234/')).toBe(
      'https://s3.tradingview.com/snapshots/a/AbCd1234.png',
    )
  })

  it('riconosce un link diretto a un\'immagine', () => {
    expect(sorgenteImmagine('https://esempio.it/grafico.png')).toBe(
      'https://esempio.it/grafico.png',
    )
  })

  it('ignora i parametri dopo il punto interrogativo', () => {
    const conParametri = 'https://esempio.it/grafico.jpg?larghezza=800'
    expect(sorgenteImmagine(conParametri)).toBe(conParametri)
  })

  it('non considera immagine un link qualunque', () => {
    expect(sorgenteImmagine('https://esempio.it/articolo')).toBeNull()
    expect(sorgenteImmagine('https://www.tradingview.com/chart/XAUUSD/abc/')).toBeNull()
  })

  it('restituisce null su un testo che non è un indirizzo', () => {
    expect(sorgenteImmagine('non è un link')).toBeNull()
  })
})

describe('segmentiMessaggio', () => {
  it('lascia il testo semplice in un pezzo solo', () => {
    expect(segmentiMessaggio('Oggi ho preso stop, male')).toEqual([
      { tipo: 'testo', valore: 'Oggi ho preso stop, male' },
    ])
  })

  it('trasforma il link di TradingView in un\'immagine', () => {
    const s = segmentiMessaggio('guarda qui https://www.tradingview.com/x/AbCd1234/')
    expect(s[0]).toEqual({ tipo: 'testo', valore: 'guarda qui ' })
    expect(s[1]).toMatchObject({ tipo: 'immagine', valore: 'https://www.tradingview.com/x/AbCd1234/' })
  })

  it('tiene i link non immagine come link', () => {
    const s = segmentiMessaggio('fonte: https://esempio.it/articolo')
    expect(s[1]).toEqual({ tipo: 'link', valore: 'https://esempio.it/articolo' })
  })

  it('gestisce più link nello stesso messaggio', () => {
    const s = segmentiMessaggio(
      'prima https://www.tradingview.com/x/AAAA1111/ poi https://www.tradingview.com/x/BBBB2222/ fine',
    )
    expect(s.filter((x) => x.tipo === 'immagine')).toHaveLength(2)
    expect(s.at(-1)).toEqual({ tipo: 'testo', valore: ' fine' })
  })

  it('conserva il testo prima e dopo il link', () => {
    const s = segmentiMessaggio('a https://esempio.it/x b')
    expect(s.map((x) => x.tipo)).toEqual(['testo', 'link', 'testo'])
  })

  it('non si confonde con un link a inizio messaggio', () => {
    const s = segmentiMessaggio('https://esempio.it/grafico.png commento')
    expect(s[0].tipo).toBe('immagine')
    expect(s[1]).toEqual({ tipo: 'testo', valore: ' commento' })
  })

  it('restituisce niente su un messaggio vuoto', () => {
    expect(segmentiMessaggio('')).toEqual([])
  })
})
