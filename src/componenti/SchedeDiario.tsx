import { NavLink } from 'react-router-dom'

/** Le due pagine del diario: le sedute e il riepilogo della settimana. */
export default function SchedeDiario() {
  const voci = [
    { a: '/diario', etichetta: 'Pagine del giorno', esatta: true },
    { a: '/diario/settimana', etichetta: 'Riepilogo della settimana', esatta: false },
  ]

  return (
    <div className="space-y-1">
      <h1 className="text-xl font-medium tracking-tight">Diario di trading</h1>
      <p className="text-xs text-testo-soft">
        Si scrive prima, si verifica dopo. Il piano, una volta bloccato, non si cambia: se cambi
        idea lo annoti.
      </p>

      <nav className="flex gap-1 pt-2">
        {voci.map((v) => (
          <NavLink
            key={v.a}
            to={v.a}
            end={v.esatta}
            className={({ isActive }) =>
              `rounded-md border px-3 py-1.5 text-sm transition-colors ${
                isActive
                  ? 'border-accento bg-accento/15 text-accento'
                  : 'border-bordo text-testo-soft hover:text-testo'
              }`
            }
          >
            {v.etichetta}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
