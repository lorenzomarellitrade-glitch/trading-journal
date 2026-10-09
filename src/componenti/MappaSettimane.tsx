import { intensita } from '../lib/aggregazioni'
import { velato } from '../lib/colori'
import { formattaData, formattaPercent, formattaUsd } from '../lib/formato'
import type { CasellaMappa, MappaSettimane as DatiMappa } from '../lib/statistiche'

/**
 * Le ultime settimane come mappa a calore: una colonna per settimana, una
 * riga per giorno feriale. Il colore dice utile o perdita, l'intensità quanto
 * rispetto al giorno più mosso. È un colpo d'occhio sulla costanza: il valore
 * di ogni giorno sta nel tooltip, i numeri veri nella scheda accanto.
 */

const GIORNI = ['L', 'M', 'M', 'G', 'V']

/** Opacità minima e massima della tinta: anche un giorno piccolo deve vedersi. */
const MINIMO = 0.3
const MASSIMO = 0.9

function sfondo(c: CasellaMappa, massimo: number): string | undefined {
  if (c.pnlUsd == null || c.pnlUsd === 0) return undefined
  const quota = MINIMO + (MASSIMO - MINIMO) * intensita(c.pnlUsd, massimo)
  return velato(c.pnlUsd > 0 ? 'positivo' : 'negativo', quota)
}

function descrizione(c: CasellaMappa, inUsd: boolean): string {
  const giorno = formattaData(c.data)
  if (c.futuro) return `${giorno}: deve ancora venire`
  if (c.pnlUsd == null) return c.numeroTrade > 0 ? `${giorno}: trade non conclusi` : `${giorno}: nessun trade`
  const valore = inUsd ? formattaUsd(c.pnlUsd, true) : formattaPercent(c.pnlPercent, 2, true)
  return `${giorno}: ${valore}, ${c.numeroTrade} trade`
}

export default function MappaSettimane({ mappa, inUsd }: { mappa: DatiMappa; inUsd: boolean }) {
  const giornate = mappa.settimane.flatMap((s) => s.giorni).filter((c) => c.pnlUsd != null)
  const inUtile = giornate.filter((c) => (c.pnlUsd ?? 0) > 0).length
  const inPerdita = giornate.filter((c) => (c.pnlUsd ?? 0) < 0).length

  return (
    <figure>
      <div
        role="img"
        aria-label={`Ultime ${mappa.settimane.length} settimane: ${inUtile} giornate in utile, ${inPerdita} in perdita.`}
        className="flex gap-1"
      >
        <div className="flex flex-col gap-1 pr-1" aria-hidden="true">
          {GIORNI.map((g, i) => (
            <span key={i} className="flex h-3.5 items-center text-[9px] leading-none text-testo-soft">
              {g}
            </span>
          ))}
        </div>

        {mappa.settimane.map((s) => (
          <div key={s.lunedi} className="flex flex-1 flex-col gap-1">
            {s.giorni.map((c) => (
              <span
                key={c.data}
                title={descrizione(c, inUsd)}
                className={`h-3.5 rounded-[3px] ${
                  c.futuro
                    ? 'border border-dashed border-bordo'
                    : c.pnlUsd == null || c.pnlUsd === 0
                      ? 'bg-bordo/50'
                      : ''
                }`}
                style={{ backgroundColor: sfondo(c, mappa.massimoAssoluto) }}
              />
            ))}
          </div>
        ))}
      </div>

      <figcaption className="mt-2 flex items-center justify-between text-[10px] text-testo-soft">
        <span>Ultime {mappa.settimane.length} settimane, lun-ven</span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-positivo" aria-hidden="true" /> utile
          <span className="ml-1.5 h-2 w-2 rounded-sm bg-negativo" aria-hidden="true" /> perdita
        </span>
      </figcaption>
    </figure>
  )
}
