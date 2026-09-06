import type { ConsumoRischio } from '../lib/aggregazioni'
import { formattaPercent } from '../lib/formato'

/**
 * Soglia oltre la quale il limite è "vicino". Sotto questa quota la barra
 * resta neutra: se ogni giornata leggermente negativa diventasse un allarme,
 * l'allarme smetterebbe di significare qualcosa.
 */
const QUOTA_ATTENZIONE = 0.8

function Barra({
  etichetta,
  perdita,
  limite,
  quota,
}: {
  etichetta: string
  perdita: number
  limite: number
  quota: number
}) {
  const superato = quota >= 1
  const vicino = !superato && quota >= QUOTA_ATTENZIONE

  const colore = superato
    ? 'bg-negativo'
    : vicino
      ? 'bg-accento'
      : 'bg-testo-soft/40'

  return (
    <div className="flex-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] uppercase tracking-wide text-testo-soft">{etichetta}</span>
        <span
          className={`num text-xs ${
            superato ? 'font-medium text-negativo' : vicino ? 'text-accento' : 'text-testo-soft'
          }`}
        >
          {formattaPercent(perdita)} / {formattaPercent(limite, 1)}
        </span>
      </div>

      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bordo">
        <div
          className={`h-full rounded-full transition-all ${colore}`}
          style={{ width: `${Math.min(100, quota * 100)}%` }}
        />
      </div>

      {superato && (
        <p role="alert" className="mt-1 text-[11px] text-negativo">
          Limite superato.
        </p>
      )}
      {vicino && <p className="mt-1 text-[11px] text-accento">Limite quasi raggiunto.</p>}
    </div>
  )
}

/**
 * Consumo dei limiti di perdita giornaliero e settimanale.
 * Con più account selezionati mostra il peggiore: è quello che fa scattare
 * il breach della prop firm.
 */
export default function BarraRischio({ consumo }: { consumo: ConsumoRischio }) {
  return (
    <div className="flex gap-6 rounded-card border border-bordo bg-superficie px-4 py-3">
      <Barra
        etichetta="Perdita oggi"
        perdita={consumo.perditaOggiPercent}
        limite={consumo.limiteGiornaliero}
        quota={consumo.quotaGiornaliera}
      />
      <Barra
        etichetta="Perdita settimana"
        perdita={consumo.perditaSettimanaPercent}
        limite={consumo.limiteSettimanale}
        quota={consumo.quotaSettimanale}
      />
    </div>
  )
}
