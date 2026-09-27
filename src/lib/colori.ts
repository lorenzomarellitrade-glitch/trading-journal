/**
 * La palette in forma leggibile da JavaScript.
 *
 * Tailwind legge i colori dai token in src/index.css, ma Recharts e le
 * sfumature del calendario vogliono stringhe esplicite. Questi valori devono
 * restare identici a quelli dei token: se cambi la palette, cambia entrambi.
 */

export const COLORI = {
  sfondo: '#17150F',
  superficie: '#211E18',
  testo: '#ECE5D9',
  testoSoft: '#9B9184',
  positivo: '#93A181',
  negativo: '#C78A6B',
  accento: '#C79C74',
  bordo: '#3A342B',
} as const

/** Componenti RGB, per costruire sfondi semitrasparenti. */
export const RGB = {
  positivo: '147, 161, 129',
  negativo: '199, 138, 107',
  accento: '199, 156, 116',
} as const

/**
 * Tinte delle serie nei grafici a più linee, in ordine di assegnazione.
 * Scelte per restare distinguibili fra loro senza uscire dai toni terra.
 */
export const COLORI_SERIE = [
  COLORI.accento,
  COLORI.positivo,
  '#A2937F',
  COLORI.negativo,
] as const
