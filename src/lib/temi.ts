/**
 * I temi dell'interfaccia: elenco, predefinito, lettura e salvataggio della
 * scelta. I colori veri stanno in src/index.css, uno blocco per tema; qui ci
 * sono solo i nomi.
 *
 * Lo script in index.html applica il tema prima che React parta, per non far
 * lampeggiare la pagina: ripete l'elenco dei temi e la chiave di salvataggio
 * in forma ridotta, e un test controlla che restino allineati.
 */

export const TEMI = [
  {
    id: 'grafite',
    nome: 'Grafite',
    descrizione: 'Grigio neutro quasi nero. Verde acqua per gli utili, corallo per le perdite.',
  },
  {
    id: 'freddo',
    nome: 'Freddo',
    descrizione:
      'Quasi nero bluastro. Azzurro per gli utili, arancio per le perdite: la coppia più leggibile anche per chi confonde rosso e verde.',
  },
  {
    id: 'notte',
    nome: 'Notte',
    descrizione: 'Il più scuro, praticamente nero. Per le sessioni serali in una stanza poco illuminata.',
  },
] as const

export type Tema = (typeof TEMI)[number]['id']

export const TEMA_PREDEFINITO: Tema = 'freddo'

/** Chiave in localStorage. */
export const CHIAVE_TEMA = 'tema'

/** Il tema indicato se è uno di quelli esistenti, altrimenti il predefinito. */
export function validaTema(valore: unknown): Tema {
  return TEMI.some((t) => t.id === valore) ? (valore as Tema) : TEMA_PREDEFINITO
}

type Archivio = Pick<Storage, 'getItem' | 'setItem'>

/**
 * Il localStorage, o null se il browser lo nega: in navigazione privata o con
 * i dati del sito bloccati anche solo accedervi può lanciare un'eccezione.
 */
function archivioDelBrowser(): Archivio | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** Il tema salvato, o il predefinito se manca, non è valido o non si può leggere. */
export function leggiTemaSalvato(archivio: Archivio | null = archivioDelBrowser()): Tema {
  try {
    return validaTema(archivio?.getItem(CHIAVE_TEMA))
  } catch {
    return TEMA_PREDEFINITO
  }
}

/** Salva la scelta. Se non si può, il tema vale comunque per questa sessione. */
export function salvaTema(tema: Tema, archivio: Archivio | null = archivioDelBrowser()): void {
  try {
    archivio?.setItem(CHIAVE_TEMA, tema)
  } catch {
    // Archivio pieno o bloccato: nessun danno, al prossimo avvio torna il predefinito.
  }
}

/**
 * Attiva il tema sulla pagina e aggiorna il colore della barra del browser
 * con lo sfondo del tema, letto dal CSS: così il colore esiste in un solo posto.
 */
export function applicaTema(tema: Tema, doc: Document = document): void {
  const radice = doc.documentElement
  radice.dataset.theme = tema

  const sfondo = getComputedStyle(radice).getPropertyValue('--color-sfondo').trim()
  const meta = doc.querySelector('meta[name="theme-color"]')
  if (meta && sfondo) meta.setAttribute('content', sfondo)
}
