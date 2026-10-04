/**
 * Utilità sulle date, in formato ISO 'YYYY-MM-DD'.
 *
 * Le stringhe ISO non vengono mai date in pasto a `new Date(stringa)`: quel
 * parsing è interpretato come UTC e in Italia sposterebbe la data indietro di
 * un giorno per tutta la sera. Si costruisce sempre con new Date(anno, mese, giorno).
 */

export const NOMI_MESI = [
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  'Luglio',
  'Agosto',
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre',
] as const

/** Lunedì per primo: è così che si guarda una settimana di trading. */
export const NOMI_GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'] as const

export const NOMI_GIORNI_ESTESI = [
  'Lunedì',
  'Martedì',
  'Mercoledì',
  'Giovedì',
  'Venerdì',
  'Sabato',
  'Domenica',
] as const

/** Indice del giorno con lunedì = 0, per una data ISO. */
export function indiceGiornoSettimana(iso: string): number {
  return (dataDaIso(iso).getDay() + 6) % 7
}

export function isoDaData(d: Date): string {
  const mese = String(d.getMonth() + 1).padStart(2, '0')
  const giorno = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mese}-${giorno}`
}

export function dataDaIso(iso: string): Date {
  const [anno, mese, giorno] = iso.split('-').map(Number)
  return new Date(anno, mese - 1, giorno)
}

/** Primo giorno del mese, in ISO. `mese` è 0-based come in Date. */
export function primoDelMese(anno: number, mese: number): string {
  return isoDaData(new Date(anno, mese, 1))
}

/** Ultimo giorno del mese, in ISO. Il giorno 0 del mese dopo è l'ultimo di questo. */
export function ultimoDelMese(anno: number, mese: number): string {
  return isoDaData(new Date(anno, mese + 1, 0))
}

/**
 * Lunedì della settimana che contiene la data indicata.
 * `getDay()` restituisce 0 per domenica: va rimappato perché la settimana
 * qui comincia di lunedì.
 */
export function inizioSettimana(iso: string): string {
  const d = dataDaIso(iso)
  const giornoSettimana = (d.getDay() + 6) % 7 // lunedì = 0, domenica = 6
  d.setDate(d.getDate() - giornoSettimana)
  return isoDaData(d)
}

/** La data spostata di n giorni, avanti o indietro, senza sorprese di fuso. */
export function aggiungiGiorni(iso: string, n: number): string {
  const d = dataDaIso(iso)
  d.setDate(d.getDate() + n)
  return isoDaData(d)
}

/** Domenica della settimana che contiene la data indicata. */
export function fineSettimana(iso: string): string {
  const d = dataDaIso(inizioSettimana(iso))
  d.setDate(d.getDate() + 6)
  return isoDaData(d)
}

/** Una casella della griglia mensile. */
export interface GiornoGriglia {
  iso: string
  giorno: number
  /** false per le caselle di riempimento del mese precedente o successivo */
  nelMese: boolean
}

/**
 * Griglia del mese: sempre settimane intere da lunedì a domenica, con i giorni
 * di riempimento agli estremi. Restituisce 35 o 42 caselle.
 */
export function grigliaMese(anno: number, mese: number): GiornoGriglia[] {
  const primo = new Date(anno, mese, 1)
  const offset = (primo.getDay() + 6) % 7 // quante caselle prima del giorno 1

  const inizio = new Date(anno, mese, 1 - offset)
  const giorniNelMese = new Date(anno, mese + 1, 0).getDate()
  const caselle = Math.ceil((offset + giorniNelMese) / 7) * 7

  const griglia: GiornoGriglia[] = []
  for (let i = 0; i < caselle; i++) {
    const d = new Date(inizio.getFullYear(), inizio.getMonth(), inizio.getDate() + i)
    griglia.push({
      iso: isoDaData(d),
      giorno: d.getDate(),
      nelMese: d.getMonth() === mese && d.getFullYear() === anno,
    })
  }
  return griglia
}

/** Mese precedente o successivo, senza sbagliare il cambio d'anno. */
export function spostaMese(anno: number, mese: number, delta: number): [number, number] {
  const d = new Date(anno, mese + delta, 1)
  return [d.getFullYear(), d.getMonth()]
}

export function etichettaMese(anno: number, mese: number): string {
  return `${NOMI_MESI[mese]} ${anno}`
}
