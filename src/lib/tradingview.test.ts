import { describe, expect, it } from 'vitest'
import { immagineSnapshot } from './tradingview'

describe('immagineSnapshot', () => {
  it('ricava l\'immagine dal link di uno snapshot', () => {
    expect(immagineSnapshot('https://www.tradingview.com/x/AbCd1234/')).toBe(
      'https://s3.tradingview.com/snapshots/a/AbCd1234.png',
    )
  })

  it('usa la prima lettera in minuscolo come cartella', () => {
    expect(immagineSnapshot('https://www.tradingview.com/x/Zq9Xy77K/')).toBe(
      'https://s3.tradingview.com/snapshots/z/Zq9Xy77K.png',
    )
  })

  it('accetta il link senza barra finale e senza www', () => {
    expect(immagineSnapshot('https://tradingview.com/x/AbCd1234')).toBe(
      'https://s3.tradingview.com/snapshots/a/AbCd1234.png',
    )
  })

  it('accetta i sottodomini di lingua', () => {
    expect(immagineSnapshot('https://it.tradingview.com/x/AbCd1234/')).toBe(
      'https://s3.tradingview.com/snapshots/a/AbCd1234.png',
    )
  })

  it('ignora parametri e spazi attorno al link incollato', () => {
    expect(immagineSnapshot('  https://www.tradingview.com/x/AbCd1234/?ref=share  ')).toBe(
      'https://s3.tradingview.com/snapshots/a/AbCd1234.png',
    )
  })

  it('lascia invariato un link che è già l\'immagine', () => {
    const diretto = 'https://s3.tradingview.com/snapshots/a/AbCd1234.png'
    expect(immagineSnapshot(diretto)).toBe(diretto)
  })

  it('non inventa un\'immagine per il link a un grafico interattivo', () => {
    expect(immagineSnapshot('https://www.tradingview.com/chart/XAUUSD/abc123/')).toBeNull()
  })

  it('rifiuta i link che non sono di TradingView', () => {
    expect(immagineSnapshot('https://example.com/x/AbCd1234/')).toBeNull()
    // un dominio che contiene "tradingview.com" ma non lo è
    expect(immagineSnapshot('https://tradingview.com.truffa.net/x/AbCd1234/')).toBeNull()
  })

  it('restituisce null per valori vuoti o non validi', () => {
    expect(immagineSnapshot(null)).toBeNull()
    expect(immagineSnapshot('')).toBeNull()
    expect(immagineSnapshot('non è un link')).toBeNull()
  })
})
