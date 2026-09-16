import type { Account } from '../lib/tipi'

/** `null` significa "Tutti": ogni account, anche quelli non più attivi. */
export type SelezioneAccount = string | null

/**
 * Selettore account condiviso da calendario, lista e statistiche.
 *
 * Ha un pulsante per ciascun conto **attivo** più "Tutti", che somma l'intero
 * storico compresi i conti di fasi ormai chiuse. I conti non attivi non hanno
 * un pulsante proprio: restano visibili solo dentro "Tutti".
 */
export default function SelettoreAccount({
  account,
  selezione,
  onChange,
}: {
  account: Account[]
  selezione: SelezioneAccount
  onChange: (s: SelezioneAccount) => void
}) {
  // Con un solo conto in tutto non c'è niente da scegliere.
  if (account.length < 2) return null

  const voci: { valore: SelezioneAccount; etichetta: string }[] = [
    ...account
      .filter((a) => a.attivo)
      .map((a) => ({ valore: a.id as SelezioneAccount, etichetta: a.nome })),
    { valore: null, etichetta: 'Tutti' },
  ]

  return (
    <div className="flex flex-wrap gap-1">
      {voci.map((v) => {
        const attiva = selezione === v.valore
        return (
          <button
            key={v.etichetta}
            type="button"
            aria-pressed={attiva}
            onClick={() => onChange(v.valore)}
            className={`rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
              attiva
                ? 'border-accento bg-accento/15 text-accento'
                : 'border-bordo text-testo-soft hover:text-testo'
            }`}
          >
            {v.etichetta}
          </button>
        )
      })}
    </div>
  )
}

/** Gli account inclusi da una selezione. "Tutti" comprende anche i non attivi. */
export function accountSelezionati(account: Account[], selezione: SelezioneAccount): Account[] {
  return selezione == null ? account : account.filter((a) => a.id === selezione)
}
