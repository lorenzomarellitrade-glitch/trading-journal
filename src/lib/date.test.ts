import { describe, expect, it } from 'vitest'
import {
  aggiungiGiorni,
  etichettaMese,
  fineSettimana,
  grigliaMese,
  inizioSettimana,
  isoDaData,
  primoDelMese,
  spostaMese,
  ultimoDelMese,
} from './date'

describe('inizioSettimana', () => {
  it('trova il lunedì partendo da metà settimana', () => {
    // giovedì 3 settembre 2026 → lunedì 31 agosto
    expect(inizioSettimana('2026-09-03')).toBe('2026-08-31')
  })

  it('lascia il lunedì dov\'è', () => {
    expect(inizioSettimana('2026-08-31')).toBe('2026-08-31')
  })

  it('tratta la domenica come ultimo giorno, non come primo', () => {
    // domenica 6 settembre 2026 appartiene alla settimana del 31 agosto
    expect(inizioSettimana('2026-09-06')).toBe('2026-08-31')
  })

  it('attraversa il cambio d\'anno', () => {
    // venerdì 1 gennaio 2027 → lunedì 28 dicembre 2026
    expect(inizioSettimana('2027-01-01')).toBe('2026-12-28')
  })
})

describe('aggiungiGiorni', () => {
  it('va avanti di una settimana', () => {
    expect(aggiungiGiorni('2026-09-28', 7)).toBe('2026-10-05')
  })

  it('torna indietro attraversando il cambio di mese', () => {
    expect(aggiungiGiorni('2026-10-05', -7)).toBe('2026-09-28')
  })

  it('attraversa il cambio d\'anno', () => {
    expect(aggiungiGiorni('2026-12-28', 7)).toBe('2027-01-04')
  })

  it('non slitta nel giorno del cambio dell\'ora legale', () => {
    // In Italia l'ora solare torna l'ultima domenica di ottobre.
    expect(aggiungiGiorni('2026-10-24', 1)).toBe('2026-10-25')
    expect(aggiungiGiorni('2026-10-25', 1)).toBe('2026-10-26')
  })
})

describe('fineSettimana', () => {
  it('è la domenica sei giorni dopo il lunedì', () => {
    expect(fineSettimana('2026-09-03')).toBe('2026-09-06')
  })
})

describe('primoDelMese / ultimoDelMese', () => {
  it('delimita un mese di 30 giorni', () => {
    expect(primoDelMese(2026, 8)).toBe('2026-09-01') // mese 8 = settembre
    expect(ultimoDelMese(2026, 8)).toBe('2026-09-30')
  })

  it('gestisce febbraio bisestile', () => {
    expect(ultimoDelMese(2028, 1)).toBe('2028-02-29')
    expect(ultimoDelMese(2026, 1)).toBe('2026-02-28')
  })

  it('gestisce dicembre senza sconfinare nell\'anno dopo', () => {
    expect(ultimoDelMese(2026, 11)).toBe('2026-12-31')
  })
})

describe('grigliaMese', () => {
  it('produce settimane intere', () => {
    expect(grigliaMese(2026, 8).length % 7).toBe(0)
  })

  it('comincia sempre di lunedì', () => {
    const g = grigliaMese(2026, 8)
    expect(new Date(g[0].iso + 'T12:00:00').getDay()).toBe(1)
  })

  it('riempie l\'inizio con i giorni del mese precedente', () => {
    // 1 settembre 2026 è un martedì: davanti serve una casella (lunedì 31 agosto)
    const g = grigliaMese(2026, 8)
    expect(g[0].iso).toBe('2026-08-31')
    expect(g[0].nelMese).toBe(false)
    expect(g[1].iso).toBe('2026-09-01')
    expect(g[1].nelMese).toBe(true)
  })

  it('contiene tutti i giorni del mese', () => {
    const g = grigliaMese(2026, 8)
    expect(g.filter((c) => c.nelMese)).toHaveLength(30)
  })

  it('non segna come "nel mese" i giorni di riempimento finali', () => {
    const g = grigliaMese(2026, 8)
    expect(g[g.length - 1].nelMese).toBe(false)
  })
})

describe('spostaMese', () => {
  it('va al mese successivo', () => {
    expect(spostaMese(2026, 8, 1)).toEqual([2026, 9])
  })

  it('passa da dicembre a gennaio dell\'anno dopo', () => {
    expect(spostaMese(2026, 11, 1)).toEqual([2027, 0])
  })

  it('passa da gennaio a dicembre dell\'anno prima', () => {
    expect(spostaMese(2026, 0, -1)).toEqual([2025, 11])
  })
})

describe('isoDaData', () => {
  it('non slitta di un giorno a fine giornata', () => {
    // Il bug classico: new Date('2026-09-06') sarebbe UTC e in Italia
    // di sera tornerebbe il 5. Qui si costruisce in ora locale.
    expect(isoDaData(new Date(2026, 8, 6, 23, 30))).toBe('2026-09-06')
  })

  it('mette lo zero davanti a mesi e giorni singoli', () => {
    expect(isoDaData(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('etichettaMese', () => {
  it('scrive il mese in italiano', () => {
    expect(etichettaMese(2026, 8)).toBe('Settembre 2026')
  })
})
