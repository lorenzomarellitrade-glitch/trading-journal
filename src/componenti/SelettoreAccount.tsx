import type { Account } from '../lib/tipi'

/** `null` significa "tutti gli account selezionati". */
export type SelezioneAccount = string | null

/**
 * Selettore account condiviso da calendario, lista e statistiche.
 * Con un solo account configurato non si mostra: non c'è niente da scegliere.
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
  if (account.length < 2) return null

  const voci: { valore: SelezioneAccount; etichetta: string }[] = [
    ...account.map((a) => ({ valore: a.id as SelezioneAccount, etichetta: a.nome })),
    { valore: null, etichetta: 'Entrambi' },
  ]

  return (
    <div className="flex gap-1">
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

/** Gli account effettivamente inclusi da una selezione. */
export function accountSelezionati(account: Account[], selezione: SelezioneAccount): Account[] {
  return selezione == null ? account : account.filter((a) => a.id === selezione)
}
