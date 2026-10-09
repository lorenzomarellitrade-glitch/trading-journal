/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // base relativa: gli asset funzionano sia in locale sia sotto
  // https://<utente>.github.io/<repo>/ senza dover conoscere il nome del repo.
  // Funziona perché l'app usa HashRouter (vedi src/App.tsx).
  base: './',
  plugins: [react(), tailwindcss()],
  test: {
    // Di norma Vitest svuota i CSS importati. index.css va lasciato intatto:
    // temi.test.ts lo legge per controllare che i temi siano allineati a
    // quelli dello script in index.html.
    css: { include: [/index\.css/] },
  },
})
