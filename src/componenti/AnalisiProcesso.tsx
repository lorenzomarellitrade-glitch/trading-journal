import type { Confronto, Gruppo } from '../lib/statistiche'
import { SOGLIA_CAMPIONE } from '../lib/statistiche'
import { formattaPercent, formattaR, VUOTO } from '../lib/formato'

/**
 * Confronti di processo affiancati. È la sezione che dà senso al journal:
 * non "quanto ho guadagnato" ma "ho guadagnato quando ho seguito il piano".
 */

function ColonnaGruppo({ gruppo, migliore }: { gruppo: Gruppo; migliore: boolean }) {
  const vuoto = gruppo.numeroTrade === 0

  return (
    <div
      className={`rounded-md border p-3 ${
        migliore && !gruppo.campioneScarso ? 'border-positivo bg-positivo/5' : 'border-bordo'
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-testo">{gruppo.etichetta}</span>
        <span className="num text-[11px] text-testo-soft">
          {gruppo.numeroTrade} {gruppo.numeroTrade === 1 ? 'trade' : 'trade'}
        </span>
      </div>

      <dl className="mt-2 grid grid-cols-3 gap-2">
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-testo-soft">Win rate</dt>
          <dd className="num text-sm text-testo">
            {vuoto ? VUOTO : formattaPercent(gruppo.winRate, 0)}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wide text-testo-soft">R medio</dt>
          <dd
            className={`num text-sm ${
              gruppo.rMedio == null
                ? 'text-testo'
                : gruppo.rMedio > 0
                  ? 'text-positivo'
                  : gruppo.rMedio < 0
                    ? 'text-negativo'
                    : 'text-testo'
            }`}
          >
            {formattaR(gruppo.rMedio)}
          </dd>
        </div>
        <div>
          {/* Rivela se in questo gruppo si alza anche il size, non solo il rischio di sbagliare. */}
          <dt className="text-[10px] uppercase tracking-wide text-testo-soft">Rischio</dt>
          <dd className="num text-sm text-testo">
            {vuoto ? VUOTO : formattaPercent(gruppo.rischioMedioPercent)}
          </dd>
        </div>
      </dl>

      {!vuoto && gruppo.campioneScarso && (
        <p className="mt-2 text-[11px] leading-snug text-accento">
          Campione troppo piccolo: sotto i {SOGLIA_CAMPIONE} trade questi numeri non dicono nulla.
        </p>
      )}

      {vuoto && <p className="mt-2 text-[11px] text-testo-soft">Nessun trade in questo gruppo.</p>}
    </div>
  )
}

/**
 * Il gruppo con l'R medio più alto, ma solo se ha un campione sufficiente e
 * c'è almeno un altro gruppo altrettanto solido con cui confrontarlo.
 * Evidenziare un vincitore fra due campioni scarsi sarebbe fuorviante.
 */
function indiceMigliore(gruppi: Gruppo[]): number {
  const validi = gruppi
    .map((g, i) => ({ g, i }))
    .filter(({ g }) => !g.campioneScarso && g.rMedio != null)

  if (validi.length < 2) return -1

  return validi.reduce((best, x) => (x.g.rMedio! > best.g.rMedio! ? x : best)).i
}

function CardConfronto({ confronto }: { confronto: Confronto }) {
  const migliore = indiceMigliore(confronto.gruppi)

  return (
    <section className="riquadro p-4">
      <header className="mb-3">
        <h3 className="text-sm font-medium text-testo">{confronto.titolo}</h3>
        <p className="text-xs text-testo-soft">{confronto.domanda}</p>
      </header>

      <div
        className={`grid gap-2 ${
          confronto.gruppi.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
        }`}
      >
        {confronto.gruppi.map((g, i) => (
          <ColonnaGruppo key={g.etichetta} gruppo={g} migliore={i === migliore} />
        ))}
      </div>
    </section>
  )
}

export default function AnalisiProcesso({
  confronti,
  titolo = 'Analisi di processo',
  sottotitolo = 'Non quanto hai guadagnato, ma se hai guadagnato quando hai seguito il piano.',
}: {
  confronti: Confronto[]
  titolo?: string
  sottotitolo?: string
}) {
  const qualcheDato = confronti.some((c) => c.gruppi.some((g) => g.numeroTrade > 0))

  return (
    <div className="space-y-3">
      <header>
        <h2 className="text-base font-medium tracking-tight text-testo">{titolo}</h2>
        <p className="text-xs text-testo-soft">{sottotitolo}</p>
      </header>

      {!qualcheDato && (
        <p className="riquadro px-4 py-6 text-center text-sm text-testo-soft">
          Servono trade conclusi per poter confrontare qualcosa.
        </p>
      )}

      {qualcheDato && (
        <div className="grid gap-3 lg:grid-cols-2">
          {confronti.map((c) => (
            <CardConfronto key={c.titolo} confronto={c} />
          ))}
        </div>
      )}
    </div>
  )
}

