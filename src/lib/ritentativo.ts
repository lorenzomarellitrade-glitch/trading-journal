/**
 * Ritentativo sull'errore "JWT issued at future".
 *
 * Supabase a volte rifiuta un token appena emesso perché il servizio che lo
 * verifica ha l'orologio qualche istante indietro rispetto a quello che lo ha
 * creato. Non dipende dal computer dell'utente e si risolve da solo in un
 * attimo: basta aspettare e ripetere la richiesta.
 *
 * Ripetere è sicuro anche per le scritture: la richiesta è stata respinta al
 * controllo del token, prima di toccare qualsiasi dato.
 */

type Fetch = typeof fetch

/** Tempo di attesa prima del secondo tentativo. */
export const ATTESA_RITENTATIVO_MS = 1500

function attendi(ms: number): Promise<void> {
  return new Promise((risolvi) => setTimeout(risolvi, ms))
}

export function creaFetchConRitentativo(
  fetchBase: Fetch,
  attesaMs = ATTESA_RITENTATIVO_MS,
): Fetch {
  return async (input, init) => {
    const risposta = await fetchBase(input, init)
    if (risposta.status !== 401) return risposta

    // clone(): il corpo si può leggere una volta sola, e se non è l'errore
    // che cerchiamo la risposta originale deve arrivare intatta al chiamante.
    const testo = await risposta.clone().text()
    if (!testo.includes('issued at future')) return risposta

    await attendi(attesaMs)
    return fetchBase(input, init)
  }
}
