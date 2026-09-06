import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface ValoreAuth {
  session: Session | null
  user: User | null
  /** true finché non sappiamo se esiste una sessione salvata: evita di
   *  mostrare il login per un istante a chi è già autenticato. */
  caricamento: boolean
  accedi: (email: string, password: string) => Promise<{ errore: string | null }>
  esci: () => Promise<void>
}

const ContestoAuth = createContext<ValoreAuth | undefined>(undefined)

/** Traduce in italiano i messaggi di errore più frequenti di Supabase Auth. */
function traduciErrore(messaggio: string): string {
  const m = messaggio.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Email o password non corretti.'
  if (m.includes('email not confirmed')) return 'Email non ancora confermata.'
  if (m.includes('too many requests') || m.includes('rate limit'))
    return 'Troppi tentativi. Riprova fra qualche minuto.'
  if (m.includes('failed to fetch') || m.includes('network'))
    return 'Impossibile raggiungere Supabase. Controlla la connessione e le variabili in .env.'
  return messaggio
}

export function ProviderAuth({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [caricamento, setCaricamento] = useState(true)

  useEffect(() => {
    // Sessione già presente in localStorage (login precedente).
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCaricamento(false)
    })

    // Login, logout e refresh del token arrivano tutti da qui.
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, nuovaSessione) => {
      setSession(nuovaSessione)
      setCaricamento(false)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  const accedi: ValoreAuth['accedi'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { errore: error ? traduciErrore(error.message) : null }
  }

  const esci = async () => {
    await supabase.auth.signOut()
  }

  return (
    <ContestoAuth.Provider
      value={{ session, user: session?.user ?? null, caricamento, accedi, esci }}
    >
      {children}
    </ContestoAuth.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): ValoreAuth {
  const valore = useContext(ContestoAuth)
  if (!valore) throw new Error('useAuth va usato dentro <ProviderAuth>')
  return valore
}
