import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'

/**
 * Schermata di accesso. Non esiste registrazione pubblica: l'utente viene
 * creato a mano dalla dashboard Supabase.
 */
export default function Login() {
  const { accedi } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [inCorso, setInCorso] = useState(false)
  const [mostraPassword, setMostraPassword] = useState(false)

  async function invia(e: FormEvent) {
    e.preventDefault()
    setErrore(null)
    setInCorso(true)
    const { errore: err } = await accedi(email.trim(), password)
    // In caso di successo il cambio di sessione smonta questo componente:
    // non serve resettare inCorso.
    if (err) {
      setErrore(err)
      setInCorso(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sfondo px-4">
      <div className="w-full max-w-sm">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-medium tracking-tight text-testo">Trading Journal</h1>
          <p className="mt-1 text-sm text-testo-soft">XAUUSD · SMC/ICT</p>
        </header>

        <form
          onSubmit={invia}
          className="riquadro p-6"
          noValidate
        >
          <label className="block">
            <span className="text-sm text-testo-soft">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              autoFocus
              required
              className="mt-1 w-full rounded-md border border-bordo bg-sfondo px-3 py-2 text-testo placeholder:text-testo-soft/60"
            />
          </label>

          <div className="mt-4">
            <label htmlFor="password" className="text-sm text-testo-soft">
              Password
            </label>
            <div className="relative mt-1">
              <input
                id="password"
                type={mostraPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full rounded-md border border-bordo bg-sfondo py-2 pl-3 pr-20 text-testo"
              />
              {/* Un vero pulsante, non un'icona cliccabile: si raggiunge con Tab. */}
              <button
                type="button"
                onClick={() => setMostraPassword((v) => !v)}
                aria-label={mostraPassword ? 'Nascondi la password' : 'Mostra la password'}
                aria-pressed={mostraPassword}
                className="absolute inset-y-1 right-1 rounded px-2 text-xs text-testo-soft transition-colors hover:text-testo"
              >
                {mostraPassword ? 'Nascondi' : 'Mostra'}
              </button>
            </div>
          </div>

          {errore && (
            <p
              role="alert"
              className="mt-4 rounded-md border border-negativo/40 bg-negativo/10 px-3 py-2 text-sm text-negativo"
            >
              {errore}
            </p>
          )}

          <button
            type="submit"
            disabled={inCorso}
            className="mt-6 w-full rounded-md bg-accento px-4 py-2 font-medium text-superficie transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {inCorso ? 'Accesso in corso…' : 'Accedi'}
          </button>
        </form>
      </div>
    </div>
  )
}
