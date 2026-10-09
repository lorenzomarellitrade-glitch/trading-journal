import { TEMI } from '../lib/temi'
import { impostaTema, useTema } from './useTema'

/**
 * Scelta del tema. Due forme: compatta nella barra in alto, accanto a Esci,
 * ed estesa in Impostazioni con la descrizione di ciascun tema. Leggono e
 * scrivono lo stesso stato, quindi restano sempre allineate.
 */
export default function SelettoreTema({ esteso = false }: { esteso?: boolean }) {
  const attivo = useTema()

  if (!esteso) {
    return (
      <div role="group" aria-label="Tema" className="flex rounded-md border border-bordo p-0.5">
        {TEMI.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={t.id === attivo}
            title={t.descrizione}
            onClick={() => impostaTema(t.id)}
            className={`rounded px-2 py-1 text-xs transition-colors ${
              t.id === attivo ? 'bg-accento/15 text-accento' : 'text-testo-soft hover:text-testo'
            }`}
          >
            {t.nome}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div role="group" aria-label="Tema" className="grid gap-2 sm:grid-cols-3">
      {TEMI.map((t) => (
        <button
          key={t.id}
          type="button"
          aria-pressed={t.id === attivo}
          onClick={() => impostaTema(t.id)}
          className={`rounded-md border p-3 text-left transition-colors ${
            t.id === attivo
              ? 'border-accento bg-accento/15'
              : 'border-bordo bg-sfondo hover:border-testo-soft'
          }`}
        >
          <span className={`text-sm ${t.id === attivo ? 'text-accento' : 'text-testo'}`}>
            {t.nome}
          </span>
          <span className="mt-1 block text-xs leading-snug text-testo-soft">{t.descrizione}</span>
        </button>
      ))}
    </div>
  )
}
