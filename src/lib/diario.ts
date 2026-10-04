import type { GiornoFeriale, PaginaDiario, PianoRispettato, RigaSettimana } from './tipi'

/**
 * Struttura del diario di trading: "scrivi prima, verifica dopo".
 *
 * La pagina del giorno ha due metà. La prima si compila prima di entrare e si
 * blocca; la seconda si compila a operazione chiusa. Il riepilogo della
 * settimana raccoglie l'errore che si ripete e una sola regola per la
 * settimana dopo.
 */

/** Campi testuali della metà PRIMA, nell'ordine del foglio. */
export const CAMPI_PRIMA = [
  {
    campo: 'cosa_vedo',
    etichetta: 'Che cosa vedo sul grafico',
    aiuto: 'La struttura descritta a parole, prima dei numeri.',
    righe: 4,
  },
  {
    campo: 'cambierebbe_idea',
    etichetta: 'Che cosa mi farebbe cambiare idea',
    aiuto: 'Il fatto che renderebbe sbagliata questa lettura.',
    righe: 2,
  },
  {
    campo: 'notizie_attese',
    etichetta: 'Il dato o la notizia attesi oggi, e a che ora',
    aiuto: '',
    righe: 2,
  },
] as const

/** I livelli dichiarati prima di entrare. Testo libero, come sul foglio. */
export const LIVELLI = [
  { campo: 'ingresso', etichetta: 'Ingresso' },
  { campo: 'stop', etichetta: 'Stop' },
  { campo: 'uscita', etichetta: 'Uscita' },
] as const

/** Tutti i campi che si bloccano insieme al piano. */
export const CAMPI_BLOCCATI = [
  'data',
  'strumento',
  'time_frame',
  'cosa_vedo',
  // Il grafico visto quando si è deciso fa parte del piano: si blocca con esso.
  'grafici_prima',
  'ingresso',
  'stop',
  'uscita',
  'rischio',
  'cambierebbe_idea',
  'notizie_attese',
] as const satisfies readonly (keyof PaginaDiario)[]

export type CampoBloccato = (typeof CAMPI_BLOCCATI)[number]

/** "Chi ha deciso: io o il riflesso?" */
export const RIFLESSI = [
  { campo: 'riflesso_incassato_presto', etichetta: 'Ho incassato troppo presto' },
  { campo: 'riflesso_tenuto_perdita', etichetta: 'Ho tenuto la perdita' },
  { campo: 'riflesso_rincorso_prezzo', etichetta: 'Ho rincorso il prezzo' },
  { campo: 'riflesso_seguito_regola', etichetta: 'Ho seguito la regola' },
] as const

export type CampoRiflesso = (typeof RIFLESSI)[number]['campo']

export const RISPOSTE_PIANO: { valore: PianoRispettato; etichetta: string }[] = [
  { valore: 'si', etichetta: 'Sì' },
  { valore: 'no', etichetta: 'No' },
  { valore: 'in-parte', etichetta: 'In parte' },
]

export function etichettaPiano(p: PianoRispettato | '' | null): string {
  return RISPOSTE_PIANO.find((r) => r.valore === p)?.etichetta ?? ''
}

export const GIORNI_FERIALI: { giorno: GiornoFeriale; etichetta: string }[] = [
  { giorno: 'lun', etichetta: 'Lunedì' },
  { giorno: 'mar', etichetta: 'Martedì' },
  { giorno: 'mer', etichetta: 'Mercoledì' },
  { giorno: 'gio', etichetta: 'Giovedì' },
  { giorno: 'ven', etichetta: 'Venerdì' },
]

export const RIGA_VUOTA: RigaSettimana = { operazioni: '', piano: '', risultato: '', nota: '' }

/** Suggerimenti per i campi Strumento e Time frame: si può sempre scrivere altro. */
export const TIME_FRAME_COMUNI = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1'] as const

export type StatoPagina = 'bozza' | 'da-verificare' | 'verificata'

/**
 * A che punto è una pagina:
 * - bozza: il piano non è ancora bloccato;
 * - da verificare: piano bloccato, verifica non ancora fatta;
 * - verificata: c'è la risposta a "Ho rispettato il piano?".
 */
export function statoPagina(p: Pick<PaginaDiario, 'piano_bloccato_at' | 'piano_rispettato'>): StatoPagina {
  if (p.piano_bloccato_at == null) return 'bozza'
  if (p.piano_rispettato == null) return 'da-verificare'
  return 'verificata'
}

export const ETICHETTA_STATO: Record<StatoPagina, string> = {
  bozza: 'Bozza',
  'da-verificare': 'Da verificare',
  verificata: 'Verificata',
}
