import { describe, expect, it } from 'vitest'
import { A, acc, ENTRAMBI, exe, perdente, trade, vincente } from './fixture'
import {
  andamentoCumulato,
  curvaPnl,
  giornate,
  giornoMiglioreEPeggiore,
  mappaSettimane,
  mediaVincitaPerdita,
  pesoGiornoMigliore,
  profitFactor,
  rischioOltreSoglia,
  rrMedioPianificato,
  serieGiornate,
  tradePerGiorno,
  type Giornata,
} from './statistiche'

/**
 * Test delle sintesi della Home. Con i fixture: un trade vincente fa +500
 * per conto (R +2, RR pianificato 1:2), uno perdente −250 per conto (R −1).
 */

/** Long chiuso in pari: entry ed exit coincidono. */
function pari(accountId: string) {
  return exe(accountId, { entry: 2000, stop_loss: 1995, take_profit: 2010, exit: 2000, lotti: 0.5, esito: 'breakeven' })
}

/** Long ancora aperto: niente exit, ma rischio e RR sono già noti. */
function aperto(accountId: string, takeProfit = 2015) {
  return exe(accountId, { entry: 2000, stop_loss: 1995, take_profit: takeProfit, lotti: 0.5 })
}

/** Una giornata costruita a mano, per i test che lavorano sull'elenco. */
function g(data: string, pnlUsd: number): Giornata {
  return { data, pnlUsd, pnlPercent: null, numeroTrade: 1 }
}

describe('profitFactor', () => {
  it('somma delle vincite diviso somma delle perdite', () => {
    const pf = profitFactor(
      [
        trade('2026-09-01', 'long', [vincente('a')]),
        trade('2026-09-02', 'long', [vincente('a')]),
        trade('2026-09-03', 'long', [perdente('a')]),
      ],
      [A],
    )
    expect(pf).toBeCloseTo(1000 / 250)
  })

  it('conta per trade: lo stesso trade su due conti somma i dollari, non i campioni', () => {
    const pf = profitFactor(
      [
        trade('2026-09-01', 'long', [vincente('a'), vincente('b')]),
        trade('2026-09-02', 'long', [perdente('a'), perdente('b')]),
      ],
      ENTRAMBI,
    )
    expect(pf).toBeCloseTo(1000 / 500)
  })

  it('null senza perdite e senza trade conclusi', () => {
    expect(profitFactor([trade('2026-09-01', 'long', [vincente('a')])], [A])).toBeNull()
    expect(profitFactor([trade('2026-09-01', 'long', [aperto('a')])], [A])).toBeNull()
    expect(profitFactor([], [A])).toBeNull()
  })

  it('i pareggi e gli annullati non spostano il rapporto', () => {
    const pf = profitFactor(
      [
        trade('2026-09-01', 'long', [vincente('a')]),
        trade('2026-09-02', 'long', [perdente('a')]),
        trade('2026-09-03', 'long', [pari('a')]),
        trade('2026-09-04', 'long', [perdente('a', 'annullato')]),
      ],
      [A],
    )
    expect(pf).toBeCloseTo(2)
  })
})

describe('mediaVincitaPerdita', () => {
  it('media dei trade in utile e di quelli in perdita, in dollari e in percentuale', () => {
    const m = mediaVincitaPerdita(
      [
        trade('2026-09-01', 'long', [vincente('a')]),
        trade('2026-09-02', 'long', [exe('a', { entry: 2000, stop_loss: 1995, exit: 2020, lotti: 0.5 })]),
        trade('2026-09-03', 'long', [perdente('a')]),
        trade('2026-09-04', 'long', [pari('a')]),
      ],
      [A],
    )
    expect(m.vincite).toBe(2)
    expect(m.perdite).toBe(1)
    expect(m.vincitaUsd).toBeCloseTo((500 + 1000) / 2)
    expect(m.vincitaPercent).toBeCloseTo(0.75)
    expect(m.perditaUsd).toBeCloseTo(-250)
    expect(m.perditaPercent).toBeCloseTo(-0.25)
    expect(m.rapporto).toBeCloseTo(750 / 250)
  })

  it('senza vincite o senza perdite la media mancante è null, e così il rapporto', () => {
    const soloPerdite = mediaVincitaPerdita([trade('2026-09-01', 'long', [perdente('a')])], [A])
    expect(soloPerdite.vincitaUsd).toBeNull()
    expect(soloPerdite.perditaUsd).toBeCloseTo(-250)
    expect(soloPerdite.rapporto).toBeNull()
  })
})

describe('rrMedioPianificato', () => {
  it('media dei RR pianificati, anche dei trade ancora aperti', () => {
    const rr = rrMedioPianificato(
      [
        trade('2026-09-01', 'long', [vincente('a')]), // 1:2
        trade('2026-09-02', 'long', [aperto('a', 2015)]), // 1:3
      ],
      [A],
    )
    expect(rr).toBeCloseTo(2.5)
  })

  it('null se nessun trade ha un target', () => {
    const senzaTarget = exe('a', { entry: 2000, stop_loss: 1995, lotti: 0.5 })
    expect(rrMedioPianificato([trade('2026-09-01', 'long', [senzaTarget])], [A])).toBeNull()
  })
})

describe('rischioOltreSoglia', () => {
  it('conta i trade che rischiano più della soglia', () => {
    // vincente: 5 $ × 100 × 0,5 lotti = 250 $ = 0,25% di 100.000
    const grande = exe('a', { entry: 2000, stop_loss: 1980, take_profit: 2040, lotti: 1 }) // 2.000 $ = 2%
    const r = rischioOltreSoglia(
      [trade('2026-09-01', 'long', [vincente('a')]), trade('2026-09-02', 'long', [grande])],
      [A],
      1.2,
    )
    expect(r).toEqual({ totale: 2, oltre: 1 })
  })
})

describe('giornate', () => {
  it('una voce per giornata con trade conclusi, in ordine di data', () => {
    const elenco = giornate(
      [
        trade('2026-09-03', 'long', [perdente('a')]),
        trade('2026-09-01', 'long', [vincente('a')]),
        trade('2026-09-01', 'long', [perdente('a')]),
        trade('2026-09-02', 'long', [aperto('a')]),
      ],
      [A],
    )
    expect(elenco.map((x) => x.data)).toEqual(['2026-09-01', '2026-09-03'])
    expect(elenco[0]).toMatchObject({ pnlUsd: 250, numeroTrade: 2 })
    expect(elenco[0].pnlPercent).toBeCloseTo(0.25)
  })
})

describe('serieGiornate', () => {
  it('serie in corso e serie più lunghe', () => {
    const s = serieGiornate([
      g('2026-09-01', 100),
      g('2026-09-02', 50),
      g('2026-09-03', 20),
      g('2026-09-04', -10),
      g('2026-09-05', -30),
    ])
    expect(s).toEqual({ segnoAttuale: -1, attuale: 2, maxVincenti: 3, maxPerdenti: 2 })
  })

  it('una giornata in pari interrompe la serie', () => {
    const s = serieGiornate([g('2026-09-01', 100), g('2026-09-02', 0), g('2026-09-03', 100)])
    expect(s).toEqual({ segnoAttuale: 1, attuale: 1, maxVincenti: 1, maxPerdenti: 0 })
    expect(serieGiornate([g('2026-09-01', 0)])).toMatchObject({ segnoAttuale: 0, attuale: 0 })
  })

  it('senza giornate tutto a zero', () => {
    expect(serieGiornate([])).toEqual({ segnoAttuale: 0, attuale: 0, maxVincenti: 0, maxPerdenti: 0 })
  })
})

describe('giornoMiglioreEPeggiore', () => {
  it('la giornata più alta e quella più bassa', () => {
    const { migliore, peggiore } = giornoMiglioreEPeggiore([
      g('2026-09-01', 100),
      g('2026-09-02', 400),
      g('2026-09-03', -250),
    ])
    expect(migliore?.data).toBe('2026-09-02')
    expect(peggiore?.data).toBe('2026-09-03')
  })

  it('a parità vince la più recente; senza giornate null', () => {
    const { migliore } = giornoMiglioreEPeggiore([g('2026-09-01', 100), g('2026-09-02', 100)])
    expect(migliore?.data).toBe('2026-09-02')
    expect(giornoMiglioreEPeggiore([])).toEqual({ migliore: null, peggiore: null })
  })
})

describe('pesoGiornoMigliore', () => {
  it('quota del profitto del periodo che viene dalla giornata migliore', () => {
    expect(pesoGiornoMigliore([g('2026-09-01', 300), g('2026-09-02', -100), g('2026-09-03', 200)])).toBeCloseTo(
      (300 / 400) * 100,
    )
  })

  it('null se il periodo non è in utile', () => {
    expect(pesoGiornoMigliore([g('2026-09-01', 100), g('2026-09-02', -300)])).toBeNull()
    expect(pesoGiornoMigliore([])).toBeNull()
  })
})

describe('tradePerGiorno', () => {
  it('media e massimo sulle giornate con almeno un trade, anche aperto', () => {
    const t = tradePerGiorno([
      trade('2026-09-01', 'long', [vincente('a')]),
      trade('2026-09-01', 'long', [perdente('a')]),
      trade('2026-09-01', 'long', [aperto('a')]),
      trade('2026-09-02', 'long', [aperto('a')]),
    ])
    expect(t).toEqual({ giornate: 2, media: 2, massimo: 3 })
  })

  it('senza trade la media è null', () => {
    expect(tradePerGiorno([])).toEqual({ giornate: 0, media: null, massimo: 0 })
  })
})

describe('curvaPnl', () => {
  it('cumula il P&L giorno per giorno, in dollari e sul capitale del periodo', () => {
    const punti = curvaPnl(
      [
        trade('2026-09-01', 'long', [vincente('a'), vincente('b')]),
        trade('2026-09-02', 'long', [perdente('a'), perdente('b')]),
      ],
      ENTRAMBI,
    )
    expect(punti.map((p) => p.usd)).toEqual([1000, 500])
    // Capitale operativo: due conti da 100.000
    expect(punti[1].percent).toBeCloseTo(0.25)
  })

  it('la percentuale usa i soli conti che hanno operato nel periodo', () => {
    const punti = curvaPnl([trade('2026-09-01', 'long', [vincente('a')])], [A, acc('c', 50000)])
    expect(punti[0].percent).toBeCloseTo(0.5)
  })
})

describe('andamentoCumulato', () => {
  it('win rate, profit factor ed expectancy dopo ogni trade concluso, in ordine di tempo', () => {
    const a = andamentoCumulato(
      [
        trade('2026-09-03', 'long', [vincente('a')]),
        trade('2026-09-01', 'long', [vincente('a')]),
        trade('2026-09-02', 'long', [perdente('a')]),
        trade('2026-09-04', 'long', [aperto('a')]),
      ],
      [A],
    )
    // Ordine: +2R, −1R, +2R. Il trade aperto non conta.
    expect(a.winRate).toEqual([100, 50, (2 / 3) * 100])
    expect(a.profitFactor).toEqual([null, 2, 4])
    expect(a.expectancyR[0]).toBeCloseTo(2)
    expect(a.expectancyR[1]).toBeCloseTo(0.5)
    expect(a.expectancyR[2]).toBeCloseTo(1)
  })

  it("l'ora di entrata ordina i trade della stessa giornata", () => {
    const a = andamentoCumulato(
      [
        trade('2026-09-01', 'long', [vincente('a')], { ora_entrata: '11:00:00' }),
        trade('2026-09-01', 'long', [perdente('a')], { ora_entrata: '09:30:00' }),
      ],
      [A],
    )
    expect(a.winRate).toEqual([0, 50])
  })
})

describe('mappaSettimane', () => {
  it('settimane da lunedì a venerdì, la più recente per ultima', () => {
    // 2026-10-09 è un venerdì
    const m = mappaSettimane([g('2026-10-07', 300), g('2026-09-29', -500)], '2026-10-09', 2)
    expect(m.settimane.map((s) => s.lunedi)).toEqual(['2026-09-28', '2026-10-05'])
    expect(m.settimane[1].giorni.map((x) => x.data)).toEqual([
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
    ])
    expect(m.settimane[1].giorni[2].pnlUsd).toBe(300)
    expect(m.settimane[0].giorni[1].pnlUsd).toBe(-500)
    expect(m.settimane[0].giorni[0].pnlUsd).toBeNull()
    expect(m.massimoAssoluto).toBe(500)
  })

  it('segna i giorni della settimana in corso che devono ancora venire', () => {
    // 2026-10-07 è un mercoledì
    const m = mappaSettimane([], '2026-10-07', 1)
    expect(m.settimane[0].giorni.map((x) => x.futuro)).toEqual([false, false, false, true, true])
    expect(m.massimoAssoluto).toBe(0)
  })

  it('ignora le giornate più vecchie della finestra', () => {
    const m = mappaSettimane([g('2026-08-03', 900)], '2026-10-09', 2)
    expect(m.massimoAssoluto).toBe(0)
  })
})
