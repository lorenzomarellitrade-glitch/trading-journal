import type { ReactNode } from 'react'

/**
 * Mattoncini dell'interfaccia, condivisi da form e filtri.
 * Nessuna logica di dominio: solo aspetto e accessibilità.
 */

export function Sezione({
  titolo,
  azione,
  children,
}: {
  titolo: string
  azione?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-card border border-bordo bg-superficie p-4 md:p-5">
      <header className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium tracking-tight text-testo">{titolo}</h2>
        {azione}
      </header>
      {children}
    </section>
  )
}

export function Campo({
  etichetta,
  suggerimento,
  children,
}: {
  etichetta: string
  suggerimento?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="text-xs text-testo-soft">{etichetta}</span>
      {children}
      {suggerimento && <span className="mt-0.5 block text-xs text-testo-soft">{suggerimento}</span>}
    </label>
  )
}

const CLASSI_INPUT =
  'mt-0.5 w-full rounded-md border border-bordo bg-sfondo px-2.5 py-2 text-sm text-testo ' +
  'placeholder:text-testo-soft/60 disabled:opacity-50'

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...resto } = props
  return <input {...resto} className={`${CLASSI_INPUT} ${className}`} />
}

/** Input numerico: `inputMode="decimal"` fa comparire il tastierino su telefono. */
export function InputNumero(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <Input type="text" inputMode="decimal" autoComplete="off" {...props} className="num" />
}

/**
 * Selettore a pulsanti affiancati, al posto di una tendina.
 * Su un form da compilare in meno di un minuto un clic batte sempre
 * apri-scorri-scegli, e a colpo d'occhio si vede cosa è selezionato.
 */
export function GruppoOpzioni<T extends string>({
  opzioni,
  valore,
  onChange,
  consentiVuoto = true,
  etichette,
}: {
  opzioni: readonly T[]
  valore: T | null
  onChange: (v: T | null) => void
  consentiVuoto?: boolean
  etichette?: Partial<Record<T, string>>
}) {
  return (
    <div className="mt-0.5 flex flex-wrap gap-1">
      {opzioni.map((o) => {
        const attiva = valore === o
        return (
          <button
            key={o}
            type="button"
            aria-pressed={attiva}
            // Ricliccare l'opzione attiva la deseleziona: serve a correggere
            // un tocco sbagliato senza dover ricaricare il form.
            onClick={() => onChange(attiva && consentiVuoto ? null : o)}
            className={`rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
              attiva
                ? 'border-accento bg-accento/15 text-accento'
                : 'border-bordo text-testo-soft hover:text-testo'
            }`}
          >
            {etichette?.[o] ?? o}
          </button>
        )
      })}
    </div>
  )
}

/** Toggle grande per le 5 conferme: deve essere leggibile con un'occhiata. */
export function Conferma({
  etichetta,
  numero,
  attiva,
  onChange,
}: {
  etichetta: string
  numero: number
  attiva: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={attiva}
      onClick={() => onChange(!attiva)}
      className={`flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${
        attiva
          ? 'border-positivo bg-positivo/10 text-testo'
          : 'border-bordo bg-sfondo text-testo-soft hover:text-testo'
      }`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs num ${
          attiva ? 'border-positivo bg-positivo text-superficie' : 'border-bordo'
        }`}
      >
        {attiva ? '✓' : numero}
      </span>
      <span className="text-sm">{etichetta}</span>
    </button>
  )
}

/** Icona in un riquadro colorato, come segno di riconoscimento di una metrica. */
export function Icona({ percorso }: { percorso: string }) {
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accento/15 text-accento">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path d={percorso} />
      </svg>
    </span>
  )
}

/** Riquadro di una metrica singola, usato nelle statistiche. */
export function Kpi({
  etichetta,
  valore,
  classe = 'text-testo',
  nota,
  icona,
}: {
  etichetta: string
  valore: string
  classe?: string
  nota?: string
  icona?: string
}) {
  return (
    <div className="rounded-card border border-bordo bg-superficie px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <dt className="text-[11px] uppercase tracking-wide text-testo-soft">{etichetta}</dt>
        {icona && <Icona percorso={icona} />}
      </div>
      <dd className={`num mt-0.5 text-lg ${classe}`}>{valore}</dd>
      {nota && <p className="num text-[11px] text-testo-soft">{nota}</p>}
    </div>
  )
}

/** Checkbox semplice per i flag comportamentali. */
export function Casella({
  etichetta,
  attiva,
  onChange,
}: {
  etichetta: string
  attiva: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-bordo bg-sfondo px-3 py-2 text-sm text-testo">
      <input
        type="checkbox"
        checked={attiva}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-accento"
      />
      {etichetta}
    </label>
  )
}
