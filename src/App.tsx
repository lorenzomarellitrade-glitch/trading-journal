import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProviderAuth, useAuth } from './auth/AuthContext'
import Navigazione from './componenti/Navigazione'
import Login from './pagine/Login'
import Calendario from './pagine/Calendario'

/**
 * Il calendario è la schermata iniziale e resta nel bundle principale.
 * Le altre si caricano solo quando servono: le statistiche in particolare
 * portano con sé Recharts, che da solo pesa più di tutto il resto dell'app.
 */
const ListaTrade = lazy(() => import('./pagine/ListaTrade'))
const Statistiche = lazy(() => import('./pagine/Statistiche'))
const ImpostazioniPagina = lazy(() => import('./pagine/Impostazioni'))
const FormTrade = lazy(() => import('./pagine/FormTrade'))
const ResocontoTrade = lazy(() => import('./pagine/ResocontoTrade'))

function Attesa() {
  return <p className="text-sm text-testo-soft">Caricamento…</p>
}

/**
 * Guardia di autenticazione: senza sessione si vede solo il login.
 * Utente singolo, nessuna registrazione pubblica.
 */
function AppAutenticata() {
  const { session, caricamento } = useAuth()

  if (caricamento) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-testo-soft">
        Caricamento…
      </div>
    )
  }

  if (!session) return <Login />

  return (
    <div className="min-h-screen bg-sfondo">
      <Navigazione />
      {/* pb-20 su mobile lascia spazio alla barra di navigazione in basso */}
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-4 md:px-6 md:pb-10 md:pt-6">
        <Suspense fallback={<Attesa />}>
          <Routes>
            <Route path="/calendario" element={<Calendario />} />
            <Route path="/trade" element={<ListaTrade />} />
            {/* Cliccando un trade, da lista o calendario, si apre il resoconto;
                la modifica è un passo esplicito dal pulsante "Modifica". */}
            <Route path="/trade/nuovo" element={<FormTrade />} />
            <Route path="/trade/:id/modifica" element={<FormTrade />} />
            <Route path="/trade/:id" element={<ResocontoTrade />} />
            <Route path="/statistiche" element={<Statistiche />} />
            <Route path="/impostazioni" element={<ImpostazioniPagina />} />
            <Route path="*" element={<Navigate to="/calendario" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}

export default function App() {
  return (
    // HashRouter e non BrowserRouter: su GitHub Pages non c'è un server che
    // possa riscrivere le rotte, un refresh su /statistiche darebbe 404.
    <HashRouter>
      <ProviderAuth>
        <AppAutenticata />
      </ProviderAuth>
    </HashRouter>
  )
}
