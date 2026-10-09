import { useMemo, useSyncExternalStore } from 'react'
import { leggiColori, type Colori } from '../lib/colori'
import { applicaTema, salvaTema, validaTema, type Tema } from '../lib/temi'

/**
 * Il tema attivo come stato condiviso. La fonte di verità è l'attributo
 * data-theme su <html>, impostato all'avvio dallo script in index.html: qui
 * lo si legge e lo si cambia, avvisando chi è iscritto. Così i due selettori
 * (barra in alto e Impostazioni) e i grafici restano sempre allineati.
 */

const iscritti = new Set<() => void>()

function iscrivi(avvisa: () => void): () => void {
  iscritti.add(avvisa)
  return () => iscritti.delete(avvisa)
}

function temaAttivo(): Tema {
  return validaTema(document.documentElement.dataset.theme)
}

/** Cambia tema, lo ricorda per la prossima volta e ridisegna chi lo usa. */
export function impostaTema(tema: Tema): void {
  applicaTema(tema)
  salvaTema(tema)
  for (const avvisa of iscritti) avvisa()
}

export function useTema(): Tema {
  return useSyncExternalStore(iscrivi, temaAttivo)
}

/**
 * I colori risolti del tema attivo, per Recharts. Si rileggono dal CSS a ogni
 * cambio tema: i grafici si ridisegnano con la nuova palette.
 */
export function useColori(): Colori {
  const tema = useTema()
  // `tema` serve solo a invalidare: i valori arrivano dal CSS già aggiornato.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => leggiColori(), [tema])
}
