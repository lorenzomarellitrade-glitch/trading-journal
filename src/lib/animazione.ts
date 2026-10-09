/**
 * Calcoli delle micro-animazioni, separati dai componenti per poterli testare.
 *
 * Le animazioni della Home servono solo a orientare all'apertura e al cambio
 * di filtro: durano al massimo DURATA_MS e non partono affatto se il sistema
 * chiede di ridurre il movimento (prefers-reduced-motion).
 */

/** Durata massima di ogni animazione della Home. */
export const DURATA_MS = 450

/** Rallenta verso la fine: il numero "si posa" sul valore invece di fermarsi di colpo. */
export function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return 1 - (1 - x) ** 3
}

/** Il valore intermedio fra `da` e `a` dopo `trascorso` millisecondi. */
export function valoreAnimato(da: number, a: number, trascorso: number, durata = DURATA_MS): number {
  if (durata <= 0 || trascorso >= durata) return a
  return da + (a - da) * easeOutCubic(trascorso / durata)
}
