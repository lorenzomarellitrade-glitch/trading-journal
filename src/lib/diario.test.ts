import { describe, expect, it } from 'vitest'
import {
  CAMPI_BLOCCATI,
  CAMPI_PRIMA,
  etichettaPiano,
  GIORNI_FERIALI,
  LIVELLI,
  statoPagina,
} from './diario'

describe('statoPagina', () => {
  it('è una bozza finché il piano non è bloccato', () => {
    expect(statoPagina({ piano_bloccato_at: null, piano_rispettato: null })).toBe('bozza')
  })

  it('è da verificare con il piano bloccato e nessuna risposta', () => {
    expect(
      statoPagina({ piano_bloccato_at: '2026-10-04T08:00:00Z', piano_rispettato: null }),
    ).toBe('da-verificare')
  })

  it('è verificata quando c\'è la risposta, qualunque sia', () => {
    for (const r of ['si', 'no', 'in-parte'] as const) {
      expect(
        statoPagina({ piano_bloccato_at: '2026-10-04T08:00:00Z', piano_rispettato: r }),
      ).toBe('verificata')
    }
  })
})

describe('campi bloccati', () => {
  it('comprendono tutta la metà PRIMA del foglio', () => {
    const bloccati: readonly string[] = CAMPI_BLOCCATI
    for (const c of CAMPI_PRIMA) expect(bloccati).toContain(c.campo)
    for (const l of LIVELLI) expect(bloccati).toContain(l.campo)
    expect(bloccati).toContain('rischio')
  })

  it('comprendono i grafici allegati al piano', () => {
    // Il grafico su cui si è deciso non deve poter essere sostituito dopo.
    const bloccati: readonly string[] = CAMPI_BLOCCATI
    expect(bloccati).toContain('grafici_prima')
  })

  it('comprendono data, strumento e time frame', () => {
    // Cambiarli dopo varrebbe quanto cambiare il piano.
    const bloccati: readonly string[] = CAMPI_BLOCCATI
    expect(bloccati).toEqual(expect.arrayContaining(['data', 'strumento', 'time_frame']))
  })

  it('non comprendono nessun campo della verifica', () => {
    const bloccati: readonly string[] = CAMPI_BLOCCATI
    for (const c of ['cosa_successo', 'risultato', 'piano_rispettato', 'cambiamenti', 'prossima_volta']) {
      expect(bloccati).not.toContain(c)
    }
  })
})

describe('riepilogo settimanale', () => {
  it('ha i cinque giorni feriali, da lunedì a venerdì', () => {
    expect(GIORNI_FERIALI.map((g) => g.giorno)).toEqual(['lun', 'mar', 'mer', 'gio', 'ven'])
  })
})

describe('etichettaPiano', () => {
  it('traduce le risposte', () => {
    expect(etichettaPiano('si')).toBe('Sì')
    expect(etichettaPiano('in-parte')).toBe('In parte')
  })

  it('restituisce stringa vuota senza risposta', () => {
    expect(etichettaPiano(null)).toBe('')
    expect(etichettaPiano('')).toBe('')
  })
})
