import { metricheTrade } from './aggregazioni'
import { contaConferme } from './calcoli'
import { calcolaMetriche } from './calcoli'
import type { Account, TradeCompleto } from './tipi'

/**
 * Export CSV dei trade.
 *
 * Separatore punto e virgola e decimali con la virgola: è il formato che Excel
 * in italiano apre con un doppio clic, senza passare dalla procedura di
 * importazione. Con la virgola come separatore di colonna e i decimali
 * italiani le due cose entrerebbero in conflitto.
 */

const SEPARATORE = ';'

function numero(n: number | null | undefined, decimali = 2): string {
  if (n == null || !Number.isFinite(n)) return ''
  return n.toFixed(decimali).replace('.', ',')
}

function testo(v: string | null | undefined): string {
  return v ?? ''
}

function siNo(v: boolean | null | undefined): string {
  return v ? 'sì' : 'no'
}

/** Racchiude fra virgolette solo quando serve, raddoppiando quelle interne. */
function cella(v: string): string {
  if (v.includes(SEPARATORE) || v.includes('"') || v.includes('\n')) {
    return `"${v.replace(/"/g, '""')}"`
  }
  return v
}

function riga(valori: string[]): string {
  return valori.map(cella).join(SEPARATORE)
}

/**
 * Una riga per trade. Le colonne dei prezzi sono ripetute per ogni account,
 * prefissate col suo nome, così un trade resta una riga sola anche quando è
 * stato aperto su due conti.
 */
export function tradesInCsv(trades: TradeCompleto[], account: Account[]): string {
  const intestazione = [
    'Data',
    'Ora',
    'Direzione',
    'Finestra',
    'Bias Daily',
    'Bias H4',
    'Bias H1',
    'Conferme',
    'F+R',
    'SL spostato',
    'Chiuso manualmente',
    'Oltre 4h',
    'News durante',
    'Idea esterna',
    'P&L USD',
    'P&L %',
    'R medio',
    'Esito',
    ...account.flatMap((a) => [
      `${a.nome} entry`,
      `${a.nome} SL`,
      `${a.nome} TP`,
      `${a.nome} exit`,
      `${a.nome} lotti`,
      `${a.nome} esito`,
      `${a.nome} rischio USD`,
      `${a.nome} R`,
    ]),
    'Emozione',
    'Nota uscita',
  ]

  const righe = trades.map((t) => {
    const m = metricheTrade(t, account)

    const colonneAccount = account.flatMap((a) => {
      const e = (t.executions ?? []).find((x) => x.account_id === a.id)
      if (!e) return ['', '', '', '', '', '', '', '']

      const me = calcolaMetriche(e, t.direzione, a.saldo_iniziale)
      return [
        numero(e.entry, 3),
        numero(e.stop_loss, 3),
        numero(e.take_profit, 3),
        numero(e.exit, 3),
        numero(e.lotti),
        testo(e.esito),
        numero(me.rischioUsd),
        numero(me.rRealizzato),
      ]
    })

    return [
      t.data,
      testo(t.ora_entrata),
      t.direzione,
      testo(t.finestra),
      testo(t.bias_daily),
      testo(t.bias_h4),
      testo(t.bias_h1),
      String(contaConferme(t)),
      testo(t.numero_fr),
      siNo(t.sl_spostato),
      siNo(t.chiuso_manualmente),
      siNo(t.oltre_4h),
      siNo(t.news_durante),
      siNo(t.idea_esterna),
      numero(m.pnlUsd),
      numero(m.pnlPercent),
      numero(m.rMedio),
      testo(m.esito),
      ...colonneAccount,
      testo(t.emozione),
      testo(t.nota_uscita),
    ]
  })

  return [riga(intestazione), ...righe.map(riga)].join('\r\n')
}

/** Fa scaricare il CSV al browser. Il BOM serve a Excel per leggere gli accenti. */
export function scaricaCsv(contenuto: string, nomeFile: string): void {
  const blob = new Blob(['﻿' + contenuto], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = nomeFile
  a.click()

  URL.revokeObjectURL(url)
}
