import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // base relativa: gli asset funzionano sia in locale sia sotto
  // https://<utente>.github.io/<repo>/ senza dover conoscere il nome del repo.
  // Funziona perché l'app usa HashRouter (vedi src/App.tsx).
  base: './',
  plugins: [react(), tailwindcss()],
})
