import type { StatoConto } from '../lib/obiettivi'
import { TOKEN } from '../lib/colori'
import { formattaPercent, formattaUsd } from '../lib/formato'
import Anello from './Anello'

/**
 * Stato dei conti rispetto alle regole della prop, in anelli.
 *
 * Attenzione a come si leggono: l'anello del target si riempie mentre le cose
 * vanno bene, quelli dei limiti si riempiono mentre vanno male. Il colore lo
 * rende evidente — i limiti passano ad ambra e poi a mattone — e l'etichetta
 * sotto dice sempre a quale soglia si riferisce.
 *
 * Un conto senza regole, tipicamente un conto reale personale, mostra solo il
 * proprio andamento: nessun anello, nessun limite inventato.
 */

/** Soglia oltre la quale il consumo di un limite diventa un avviso. */
const QUOTA_ATTENZIONE = 0.8

function classeSegno(n: number): string {
  if (n === 0) return 'text-testo'
  return n > 0 ? 'text-positivo' : 'text-negativo'
}

/** Colore di un anello che misura il consumo di un limite: più è pieno, peggio è. */
function coloreLimite(quota: number): string {
  if (quota >= 1) return TOKEN.negativo
  if (quota >= QUOTA_ATTENZIONE) return TOKEN.accento
  return TOKEN.testoSoft
}

function Misura({
  quota,
  colore,
  valore,
  etichetta,
  classeValore = 'text-testo',
}: {
  quota: number
  colore: string
  valore: string
  etichetta: string
  classeValore?: string
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <Anello quota={quota} colore={colore}>
        <span className={`num text-[11px] font-medium ${classeValore}`}>{valore}</span>
      </Anello>
      <span className="text-center text-[10px] leading-tight text-testo-soft">{etichetta}</span>
    </div>
  )
}

function Conto({ stato }: { stato: StatoConto }) {
  const { account, pnlUsd, pnlPercent } = stato
  const { targetPercent, quotaTarget } = stato
  const { drawdownPercent, marginePercent, quotaDrawdown } = stato
  const { perditaOggiPercent, limiteGiornalieroPercent, quotaGiornaliera } = stato

  const senzaRegole =
    targetPercent == null && drawdownPercent == null && limiteGiornalieroPercent == null

  return (
    <div className="rounded-md border border-bordo bg-sfondo p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-testo">{account.nome}</span>
        <span className={`num text-sm ${classeSegno(pnlPercent)}`}>
          {formattaPercent(pnlPercent, 2, true)}
        </span>
      </div>
      <p className={`num text-xs ${classeSegno(pnlUsd)}`}>{formattaUsd(pnlUsd, true)}</p>

      {senzaRegole ? (
        <p className="mt-2 text-[11px] text-testo-soft">
          Nessun obiettivo impostato per questo conto.
        </p>
      ) : (
        <div className="mt-3 flex items-start justify-around gap-2">
          {targetPercent != null && quotaTarget != null && (
            <Misura
              quota={quotaTarget}
              colore={quotaTarget >= 1 ? TOKEN.positivo : TOKEN.accento}
              valore={`${Math.round(quotaTarget * 100)}%`}
              classeValore={quotaTarget >= 1 ? 'text-positivo' : 'text-testo'}
              etichetta={`del target ${formattaPercent(targetPercent, 0)}`}
            />
          )}

          {limiteGiornalieroPercent != null && quotaGiornaliera != null && (
            <Misura
              quota={quotaGiornaliera}
              colore={coloreLimite(quotaGiornaliera)}
              valore={formattaPercent(perditaOggiPercent, 1)}
              classeValore={quotaGiornaliera >= 1 ? 'text-negativo' : 'text-testo'}
              etichetta={`oggi, limite ${formattaPercent(limiteGiornalieroPercent, 0)}`}
            />
          )}

          {drawdownPercent != null && marginePercent != null && quotaDrawdown != null && (
            <Misura
              quota={quotaDrawdown}
              colore={coloreLimite(quotaDrawdown)}
              valore={formattaPercent(marginePercent, 1)}
              classeValore={quotaDrawdown >= 1 ? 'text-negativo' : 'text-testo'}
              etichetta={`prima del −${formattaPercent(drawdownPercent, 0)}`}
            />
          )}
        </div>
      )}

      {quotaGiornaliera != null && quotaGiornaliera >= 1 && (
        <p role="alert" className="mt-2 text-[11px] text-negativo">
          Limite giornaliero della prop superato.
        </p>
      )}
      {quotaDrawdown != null && quotaDrawdown >= 1 && (
        <p role="alert" className="mt-1 text-[11px] text-negativo">
          Drawdown massimo superato.
        </p>
      )}
    </div>
  )
}

export default function StatoConti({ stati }: { stati: StatoConto[] }) {
  if (stati.length === 0) return null

  return (
    <section className="riquadro p-4">
      <header className="mb-3">
        <h2 className="text-sm font-medium text-testo">Stato dei conti</h2>
        <p className="text-xs text-testo-soft">
          Dall'apertura del conto, calcolato sul saldo iniziale e separatamente per ciascuno.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stati.map((s) => (
          <Conto key={s.account.id} stato={s} />
        ))}
      </div>
    </section>
  )
}
