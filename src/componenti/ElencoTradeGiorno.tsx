import { Link } from 'react-router-dom'
import { metricheTrade } from '../lib/aggregazioni'
import { formattaR, formattaUsd, oraBreve, VUOTO } from '../lib/formato'
import { verificheProcesso } from '../lib/processo'
import type { Account, TradeCompleto } from '../lib/tipi'
import VerificheProcesso from './VerificheProcesso'

/**
 * I trade di una giornata, in ordine di ora: ora, direzione, le cinque
 * verifiche del processo, P&L ed R. Ogni riga apre il resoconto del trade.
 * Lo usano il pannello del giorno nel calendario e la pagina del diario.
 */

function classeSegno(n: number | null): string {
  if (n == null || n === 0) return 'text-testo'
  return n > 0 ? 'text-positivo' : 'text-negativo'
}

export default function ElencoTradeGiorno({
  trades,
  account,
}: {
  trades: TradeCompleto[]
  account: Account[]
}) {
  if (trades.length === 0) {
    return <p className="py-2 text-sm text-testo-soft">Nessun trade in questa giornata.</p>
  }

  const ordinati = [...trades].sort((a, b) =>
    (a.ora_entrata ?? '99').localeCompare(b.ora_entrata ?? '99'),
  )

  return (
    <ul className="divide-y divide-bordo">
      {ordinati.map((t) => {
        const m = metricheTrade(t, account)
        return (
          <li key={t.id}>
            <Link
              to={`/trade/${t.id}`}
              className="flex flex-wrap items-center gap-x-4 gap-y-1.5 py-2.5 transition-colors hover:text-accento"
            >
              <span className="num w-12 text-xs text-testo-soft">
                {oraBreve(t.ora_entrata) || VUOTO}
              </span>
              <span className="w-12 text-xs uppercase tracking-wide text-testo-soft">
                {t.direzione}
              </span>
              <span className="min-w-0 flex-1">
                <VerificheProcesso verifiche={verificheProcesso(t)} compatta />
              </span>
              <span className={`num w-28 text-right text-sm ${classeSegno(m.pnlUsd)}`}>
                {m.pnlUsd == null ? 'aperto' : formattaUsd(m.pnlUsd, true)}
              </span>
              <span className={`num w-16 text-right text-sm ${classeSegno(m.rMedio)}`}>
                {formattaR(m.rMedio)}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
