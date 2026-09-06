import type { MetricheExecution } from '../lib/calcoli'
import { formattaPercent, formattaR, formattaRR, formattaUsd, VUOTO } from '../lib/formato'

/** Colore in base al segno: oliva se positivo, mattone se negativo, neutro se nullo. */
function classeSegno(n: number | null): string {
  if (n == null || n === 0) return 'text-testo'
  return n > 0 ? 'text-positivo' : 'text-negativo'
}

function Voce({
  etichetta,
  valore,
  classe = 'text-testo',
}: {
  etichetta: string
  valore: string
  classe?: string
}) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-testo-soft">{etichetta}</dt>
      <dd className={`num text-sm ${classe}`}>{valore}</dd>
    </div>
  )
}

/**
 * Riquadro dei valori derivati, sotto ogni blocco account del form.
 * Si aggiorna a ogni battuta: tutti i numeri arrivano da calcolaMetriche,
 * qui non si calcola nulla.
 */
export default function RiepilogoMetriche({
  metriche,
  sogliaRischioPercent,
}: {
  metriche: MetricheExecution
  sogliaRischioPercent: number
}) {
  const { rischioUsd, rischioPercent, rrPianificato, pnlUsd, pnlPercent, rRealizzato } = metriche

  const rischioEccessivo = rischioPercent != null && rischioPercent > sogliaRischioPercent

  return (
    <div className="mt-3 rounded-md border border-bordo bg-sfondo p-3">
      <dl className="grid grid-cols-3 gap-3">
        <Voce etichetta="Rischio" valore={formattaUsd(rischioUsd)} />
        <Voce
          etichetta="Rischio %"
          valore={formattaPercent(rischioPercent)}
          classe={rischioEccessivo ? 'font-medium text-negativo' : 'text-testo'}
        />
        <Voce etichetta="RR pianificato" valore={formattaRR(rrPianificato)} />
      </dl>

      {/* La riga del risultato compare solo quando c'è un'uscita da valutare. */}
      {pnlUsd != null && (
        <dl className="mt-3 grid grid-cols-3 gap-3 border-t border-bordo pt-3">
          <Voce etichetta="P&L" valore={formattaUsd(pnlUsd, true)} classe={classeSegno(pnlUsd)} />
          <Voce
            etichetta="P&L %"
            valore={formattaPercent(pnlPercent, 2, true)}
            classe={classeSegno(pnlPercent)}
          />
          <Voce
            etichetta="R realizzato"
            valore={rRealizzato == null ? VUOTO : formattaR(rRealizzato)}
            classe={classeSegno(rRealizzato)}
          />
        </dl>
      )}

      {rischioEccessivo && (
        <p role="alert" className="mt-3 text-xs text-negativo">
          Rischio oltre la soglia del {formattaPercent(sogliaRischioPercent, 1)} per trade.
        </p>
      )}
    </div>
  )
}
