import { describe, expect, it } from 'vitest'
import { trade, vincente } from './fixture'
import { immagineSnapshot, linkAnteprima } from './tradingview'

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

describe('linkAnteprima', () => {
  const t = (link: Record<string, string>) =>
    trade('2026-09-01', 'long', [vincente('a')], link)

  it('preferisce il timeframe dell\'esecuzione a quelli di contesto', () => {
    const scelto = linkAnteprima(
      t({
        link_daily: 'https://www.tradingview.com/x/DDDD1111/',
        link_h1: 'https://www.tradingview.com/x/HHHH1111/',
        link_m15: 'https://www.tradingview.com/x/MMMM1111/',
      }),
    )
    expect(scelto).toContain('MMMM1111')
  })

  it('ripiega sul timeframe più alto disponibile', () => {
    const scelto = linkAnteprima(t({ link_daily: 'https://www.tradingview.com/x/DDDD1111/' }))
    expect(scelto).toContain('DDDD1111')
  })

  it('ignora i link da cui non si ricava un\'immagine', () => {
    const scelto = linkAnteprima(
      t({
        link_m15: 'https://www.tradingview.com/chart/XAUUSD/abc/',
        link_h4: 'https://www.tradingview.com/x/HHHH4444/',
      }),
    )
    expect(scelto).toContain('HHHH4444')
  })

  it('restituisce null se il trade non ha grafici', () => {
    expect(linkAnteprima(t({}))).toBeNull()
  })
})
