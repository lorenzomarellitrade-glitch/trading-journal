import { createClient } from '@supabase/supabase-js'
import type { Database } from './tipi'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Fallire subito e in modo esplicito è meglio di un errore di rete oscuro
// al primo login: senza .env il client non ha senso di esistere.
if (!url || !anonKey) {
  throw new Error(
    'Variabili Supabase mancanti. Copia .env.example in .env e compila ' +
      'VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY, poi riavvia `npm run dev`.',
  )
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // La sessione non viene letta dall'URL: l'app non usa magic link né OAuth,
    // e l'hash dell'URL serve al router.
    detectSessionInUrl: false,
  },
})
