import { describe, expect, it } from 'vitest'
import { tradesInCsv } from './csv'
import { A, ENTRAMBI, trade, vincente } from './fixture'

const T = trade('2026-09-01', 'long', [vincente('a'), vincente('b')], {
  finestra: '09:00-12:00',
  emozione: 'calmo',
  sl_spostato: true,
})

describe('tradesInCsv', () => {
  it('usa il punto e virgola come separatore', () => {
    // Con la virgola andrebbe in conflitto con i decimali italiani.
    const intestazione = tradesInCsv([T], ENTRAMBI).split('\r\n')[0]
    expect(intestazione).toContain('Data;Ora;Direzione')
  })

  it('scrive una riga per trade, non una per execution', () => {
    const righe = tradesInCsv([T], ENTRAMBI).split('\r\n')
    expect(righe).toHaveLength(2) // intestazione + un trade
  })

  it('ripete le colonne dei prezzi per ogni account', () => {
    const intestazione = tradesInCsv([T], ENTRAMBI).split('\r\n')[0]
    expect(intestazione).toContain('A entry')
    expect(intestazione).toContain('B entry')
  })

  it('scrive i decimali con la virgola', () => {
    const riga = tradesInCsv([T], ENTRAMBI).split('\r\n')[1]
    expect(riga).toContain('1000,00') // P&L complessivo
    expect(riga).toContain('2,00') // R medio
  })

  it('riporta i flag comportamentali in chiaro', () => {
    const riga = tradesInCsv([T], ENTRAMBI).split('\r\n')[1]
    expect(riga).toContain('sì') // SL spostato
    expect(riga).toContain('no') // gli altri quattro
  })

  it('lascia vuote le colonne di un account non operato', () => {
    const soloA = trade('2026-09-02', 'long', [vincente('a')])
    const riga = tradesInCsv([soloA], ENTRAMBI).split('\r\n')[1]
    // otto colonne vuote di fila per l'account B
    expect(riga).toContain(';;;;;;;;')
  })

  it('protegge le note che contengono il separatore', () => {
    const conNota = trade('2026-09-03', 'long', [vincente('a')], {
      nota_uscita: 'Uscito presto; non era il piano',
    })
    const riga = tradesInCsv([conNota], [A]).split('\r\n')[1]
    expect(riga).toContain('"Uscito presto; non era il piano"')
  })

  it('raddoppia le virgolette interne', () => {
    const conNota = trade('2026-09-04', 'long', [vincente('a')], {
      nota_uscita: 'Ho seguito il "piano"',
    })
    const riga = tradesInCsv([conNota], [A]).split('\r\n')[1]
    expect(riga).toContain('"Ho seguito il ""piano"""')
  })

  it('produce comunque l\'intestazione senza trade', () => {
    const righe = tradesInCsv([], ENTRAMBI).split('\r\n')
    expect(righe).toHaveLength(1)
  })
})
