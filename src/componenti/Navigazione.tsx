import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const VOCI = [
  { a: '/calendario', etichetta: 'Calendario', icona: 'M7 3v2M17 3v2M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z' },
  { a: '/trade', etichetta: 'Trade', icona: 'M4 6h16M4 12h16M4 18h10' },
  { a: '/statistiche', etichetta: 'Statistiche', icona: 'M4 19V10M10 19V5M16 19v-6M22 19H2' },
  {
    a: '/journal',
    etichetta: 'Journal',
    icona: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z',
  },
  { a: '/impostazioni', etichetta: 'Impostazioni', icona: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z' },
] as const

function Icona({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  )
}

/**
 * Navigazione persistente: barra in alto su desktop, barra in basso su mobile.
 * Le due varianti condividono l'elenco VOCI.
 */
export default function Navigazione() {
  const { user, esci } = useAuth()

  return (
    <>
      {/* Desktop */}
      <header className="sticky top-0 z-20 hidden border-b border-bordo bg-superficie/95 backdrop-blur md:block">
        <div className="mx-auto flex max-w-7xl items-center gap-8 px-6 py-3">
          <span className="text-sm font-medium tracking-tight text-testo">Trading Journal</span>

          <nav className="flex items-center gap-1">
            {VOCI.map((v) => (
              <NavLink
                key={v.a}
                to={v.a}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-accento/15 text-accento'
                      : 'text-testo-soft hover:bg-sfondo hover:text-testo'
                  }`
                }
              >
                {v.etichetta}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-testo-soft">{user?.email}</span>
            <button
              onClick={esci}
              className="rounded-md border border-bordo px-3 py-1.5 text-sm text-testo-soft transition-colors hover:text-testo"
            >
              Esci
            </button>
          </div>
        </div>
      </header>

      {/* Mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-bordo bg-superficie/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="flex">
          {VOCI.map((v) => (
            <NavLink
              key={v.a}
              to={v.a}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 py-2 text-[11px] transition-colors ${
                  isActive ? 'text-accento' : 'text-testo-soft'
                }`
              }
            >
              <Icona d={v.icona} />
              {v.etichetta}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  )
}
