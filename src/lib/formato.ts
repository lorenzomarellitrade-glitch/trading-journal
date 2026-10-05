/**
 * Formattazione dei numeri per la visualizzazione.
 * Separata da calcoli.ts di proposito: qui si decide come si *mostra* un
 * numero, là come si *ottiene*. I test di calcolo non devono dipendere dal
 * locale, e il locale non deve influenzare la matematica.
 */

const LOCALE = 'it-IT'

/** Segnaposto mostrato al posto di un valore non ancora calcolabile. */
export const VUOTO = '—'

/** Importo in dollari, con separatore delle migliaia. Es. 1.387,50 USD */
export function formattaUsd(n: number | null | undefined, conSegno = false): string {
  if (n == null || !Number.isFinite(n)) return VUOTO
  const testo = n.toLocaleString(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: conSegno ? 'exceptZero' : 'auto',
  })
  return `${testo} USD`
}

/** Importo senza decimali, per le caselle strette del calendario. Es. +1.500 */
export function formattaUsdCompatto(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return VUOTO
  return n.toLocaleString(LOCALE, { maximumFractionDigits: 0, signDisplay: 'exceptZero' })
}

/** Percentuale. Es. 0,25% */
export function formattaPercent(
  n: number | null | undefined,
  decimali = 2,
  conSegno = false,
): string {
  if (n == null || !Number.isFinite(n)) return VUOTO
  const testo = n.toLocaleString(LOCALE, {
    minimumFractionDigits: decimali,
    maximumFractionDigits: decimali,
    signDisplay: conSegno ? 'exceptZero' : 'auto',
  })
  return `${testo}%`
}

/** Multipli di rischio. Es. +2,00R */
export function formattaR(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return VUOTO
  const testo = n.toLocaleString(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'exceptZero',
  })
  return `${testo}R`
}

/** Prezzo di XAUUSD, senza zeri finali superflui. Es. 2.345,67 */
export function formattaPrezzo(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return VUOTO
  return n.toLocaleString(LOCALE, { maximumFractionDigits: 3 })
}

/** Rapporto rischio/rendimento pianificato. Es. 1:2,00 */
export function formattaRR(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return VUOTO
  return `1:${n.toLocaleString(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Converte il testo di un input in numero.
 * Accetta la virgola come separatore decimale: su tastiera italiana è quello
 * che viene naturale digitare, e Firefox la propone nei campi numerici.
 * Stringa vuota significa "non compilato", quindi `null` e non 0.
 */
export function numeroDaInput(v: string | null | undefined): number | null {
  if (v == null) return null
  const t = String(v).trim().replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

/**
 * Il valore di un campo di testo **mentre lo si scrive**.
 *
 * Un campo vuoto o fatto solo di spazi diventa null, ma per il resto il testo
 * resta esattamente com'è. Non va tolto lo spazio finale: in un campo
 * controllato verrebbe cancellato a ogni tasto, e diventerebbe impossibile
 * separare una parola dalla successiva.
 */
export function testoInDigitazione(v: string): string | null {
  return v.trim() === '' ? null : v
}

/** Il valore di un campo di testo **al salvataggio**: senza spazi agli estremi. */
export function testoPulito(v: string | null | undefined): string | null {
  if (v == null) return null
  const t = v.trim()
  return t === '' ? null : t
}

/** Numero → testo per un input controllato. `null` diventa stringa vuota. */
export function inputDaNumero(n: number | null | undefined): string {
  return n == null || !Number.isFinite(n) ? '' : String(n)
}

/** Data ISO 'YYYY-MM-DD' → '6 set 2026' */
export function formattaData(iso: string | null | undefined): string {
  if (!iso) return VUOTO
  const [anno, mese, giorno] = iso.split('-').map(Number)
  // Costruita a mano e non con new Date(iso): il parsing ISO viene
  // interpretato come UTC e in Italia sposterebbe la data indietro di un giorno.
  return new Date(anno, mese - 1, giorno).toLocaleDateString(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** Data ISO → 'lunedì 27 settembre 2026', per le intestazioni di giornata. */
export function formattaDataEstesa(iso: string | null | undefined): string {
  if (!iso) return VUOTO
  const [anno, mese, giorno] = iso.split('-').map(Number)
  return new Date(anno, mese - 1, giorno).toLocaleDateString(LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Data di oggi come 'YYYY-MM-DD' nel fuso orario locale. */
export function oggiIso(): string {
  const d = new Date()
  const mese = String(d.getMonth() + 1).padStart(2, '0')
  const giorno = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mese}-${giorno}`
}

/** 'HH:MM:SS' → 'HH:MM' (l'input time non vuole i secondi). */
export function oraBreve(t: string | null | undefined): string {
  return t ? t.slice(0, 5) : ''
}
