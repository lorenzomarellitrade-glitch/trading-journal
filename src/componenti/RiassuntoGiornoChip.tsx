import { formattaUsd } from '../lib/formato'
import type { RiassuntoGiorno } from '../lib/giorno'

/**
 * I trade di un giorno in una riga: quanti, il P&L e quanti a 5/5. Collega
 * quello che si è scritto (journal, diario) a quello che si è fatto.
 */
export default function RiassuntoGiornoChip({ r }: { r: RiassuntoGiorno }) {
  const segno =
    r.pnlUsd == null || r.pnlUsd === 0
      ? 'text-testo-soft'
      : r.pnlUsd > 0
        ? 'text-positivo'
        : 'text-negativo'

  return (
    <span
      title={`${r.numeroTrade} trade, ${r.processoCompleto} con 5 conferme su 5`}
      className="num inline-flex items-center rounded-full border border-bordo px-2.5 py-0.5 text-[11px] text-testo-soft"
    >
      {r.numeroTrade} trade
      {r.pnlUsd != null && <span className={`ml-1.5 ${segno}`}>{formattaUsd(r.pnlUsd, true)}</span>}
      <span className="ml-1.5">
        ✓ {r.processoCompleto}/{r.numeroTrade}
      </span>
    </span>
  )
}
