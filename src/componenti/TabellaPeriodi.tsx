import { formattaPercent, formattaR, formattaUsd, VUOTO } from '../lib/formato'
import { SOGLIA_CAMPIONE, type RigaPeriodo } from '../lib/statistiche'

/**
 * Ripartizione del rendimento per giorno della settimana o per mese.
 * La barra orizzontale è in scala relativa alla riga più mossa: serve a far
 * vedere a colpo d'occhio dove si concentra il risultato.
 */
export default function TabellaPeriodi({
  righe,
  intestazionePrimaColonna,
}: {
  righe: RigaPeriodo[]
  intestazionePrimaColonna: string
}) {
  if (righe.length === 0) {
    return <p className="py-6 text-center text-sm text-testo-soft">Nessun dato nel periodo.</p>
  }

  const massimo = Math.max(...righe.map((r) => Math.abs(r.pnlUsd)), 0)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-bordo text-[11px] uppercase tracking-wide text-testo-soft">
            <th scope="col" className="py-2 pr-3 text-left font-normal">
              {intestazionePrimaColonna}
            </th>
            <th scope="col" className="px-3 py-2 text-right font-normal">
              Trade
            </th>
            <th scope="col" className="px-3 py-2 text-right font-normal">
              Win rate
            </th>
            <th scope="col" className="px-3 py-2 text-right font-normal">
              R medio
            </th>
            <th scope="col" className="px-3 py-2 text-right font-normal">
              P&amp;L
            </th>
            <th scope="col" className="w-32 py-2 pl-3 text-left font-normal">
              <span className="sr-only">Peso relativo</span>
            </th>
          </tr>
        </thead>

        <tbody>
          {righe.map((r) => {
            const vuota = r.numeroTrade === 0
            const larghezza = massimo > 0 ? (Math.abs(r.pnlUsd) / massimo) * 100 : 0
            const positiva = r.pnlUsd > 0

            return (
              <tr key={r.etichetta} className="border-b border-bordo/60 last:border-0">
                <td className={`py-2 pr-3 ${vuota ? 'text-testo-soft' : 'text-testo'}`}>
                  {r.etichetta}
                </td>
                <td className="num px-3 py-2 text-right text-testo-soft">
                  {r.numeroTrade}
                  {!vuota && r.campioneScarso && (
                    <span
                      title={`Sotto i ${SOGLIA_CAMPIONE} trade il dato non è leggibile`}
                      className="ml-1 text-accento"
                    >
                      *
                    </span>
                  )}
                </td>
                <td className="num px-3 py-2 text-right text-testo">
                  {vuota ? VUOTO : formattaPercent(r.winRate, 0)}
                </td>
                <td
                  className={`num px-3 py-2 text-right ${
                    r.rMedio == null
                      ? 'text-testo'
                      : r.rMedio > 0
                        ? 'text-positivo'
                        : r.rMedio < 0
                          ? 'text-negativo'
                          : 'text-testo'
                  }`}
                >
                  {formattaR(r.rMedio)}
                </td>
                <td
                  className={`num px-3 py-2 text-right ${
                    vuota ? 'text-testo-soft' : positiva ? 'text-positivo' : 'text-negativo'
                  }`}
                >
                  {vuota ? VUOTO : formattaUsd(r.pnlUsd, true)}
                </td>
                <td className="py-2 pl-3">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-bordo/60">
                    <div
                      className={`h-full rounded-full ${positiva ? 'bg-positivo' : 'bg-negativo'}`}
                      style={{ width: `${larghezza}%` }}
                    />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {righe.some((r) => r.numeroTrade > 0 && r.campioneScarso) && (
        <p className="mt-2 text-[11px] text-testo-soft">
          <span className="text-accento">*</span> meno di {SOGLIA_CAMPIONE} trade: campione troppo
          piccolo per concluderne qualcosa.
        </p>
      )}
    </div>
  )
}
