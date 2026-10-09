/**
 * La palette in forma utilizzabile da JavaScript.
 *
 * I colori esistono in un solo posto, i token di src/index.css, ridefiniti
 * per ogni tema. Qui non c'è nessun codice colore: solo due modi di usarli.
 *
 * - TOKEN: riferimenti `var(--color-…)` per SVG e stili inline. Il browser
 *   li risolve da solo e cambiano col tema senza bisogno di ridisegnare.
 * - leggiColori(): i valori risolti del tema attivo, per Recharts, che vuole
 *   stringhe esplicite. Va riletto a ogni cambio tema (vedi useColori).
 */

export type NomeColore =
  | 'sfondo'
  | 'superficie'
  | 'bordo'
  | 'testo'
  | 'testoSoft'
  | 'positivo'
  | 'negativo'
  | 'accento'
  | 'serieA'
  | 'serieB'

const VARIABILI: Record<NomeColore, string> = {
  sfondo: '--color-sfondo',
  superficie: '--color-superficie',
  bordo: '--color-bordo',
  testo: '--color-testo',
  testoSoft: '--color-testo-soft',
  positivo: '--color-positivo',
  negativo: '--color-negativo',
  accento: '--color-accento',
  serieA: '--color-serie-a',
  serieB: '--color-serie-b',
}

const NOMI = Object.keys(VARIABILI) as NomeColore[]

export type Colori = Record<NomeColore, string>

/** Riferimenti CSS ai token, per SVG e stili inline. */
export const TOKEN = Object.fromEntries(
  NOMI.map((n) => [n, `var(${VARIABILI[n]})`]),
) as Colori

/** Valori risolti dal tema attivo sull'elemento indicato, di norma <html>. */
export function leggiColori(elemento: Element = document.documentElement): Colori {
  const stile = getComputedStyle(elemento)
  return Object.fromEntries(
    NOMI.map((n) => [n, stile.getPropertyValue(VARIABILI[n]).trim()]),
  ) as Colori
}

/**
 * Un token reso semitrasparente, es. per lo sfondo delle caselle del
 * calendario. `quota` va da 0 a 1.
 */
export function velato(nome: NomeColore, quota: number): string {
  const percento = Math.round(Math.min(1, Math.max(0, quota)) * 1000) / 10
  return `color-mix(in srgb, ${TOKEN[nome]} ${percento}%, transparent)`
}

/**
 * Tinte delle serie nei grafici a più linee, in ordine di assegnazione.
 * Restano distinguibili fra loro in tutti i temi.
 */
export function coloriSerie(c: Colori): string[] {
  return [c.accento, c.positivo, c.serieA, c.negativo]
}
