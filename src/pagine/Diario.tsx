import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { caricaPagineDiario } from '../lib/dati'
import { primoDelMese, ultimoDelMese } from '../lib/date'
import { ETICHETTA_STATO, etichettaPiano, statoPagina, type StatoPagina } from '../lib/diario'
import { formattaDataEstesa, oggiIso } from '../lib/formato'
import type { PaginaDiario } from '../lib/tipi'
import SchedeDiario from '../componenti/SchedeDiario'
import SelettoreMese, { chiaveMese, daChiave } from '../componenti/SelettoreMese'

/** Colori dei bollini di stato: la bozza attira l'attenzione, la verificata no. */
const CLASSE_STATO: Record<StatoPagina, string> = {
  bozza: 'border-accento/50 bg-accento/10 text-accento',
  'da-verificare': 'border-negativo/40 bg-negativo/10 text-negativo',
  verificata: 'border-bordo text-testo-soft',
}

/** Elenco delle pagine del giorno di un mese. */
export default function Diario() {
  const adesso = new Date()
  const [mese, setMese] = useState(chiaveMese(adesso.getFullYear(), adesso.getMonth()))
  const [pagine, setPagine] = useState<PaginaDiario[]>([])
  const [caricamento, setCaricamento] = useState(true)
  const [errore, setErrore] = useState<string | null>(null)

  useEffect(() => {
    let annullato = false
    const [anno, m] = daChiave(mese)

    setCaricamento(true)
    setErrore(null)
    caricaPagineDiario(primoDelMese(anno, m), ultimoDelMese(anno, m))
      .then((p) => {
        if (!annullato) setPagine(p)
      })
      .catch((e) => {
        if (!annullato) setErrore(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!annullato) setCaricamento(false)
      })

    return () => {
      annullato = true
    }
  }, [mese])

  return (
    <div className="space-y-4">
      <SchedeDiario />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="w-56">
          <SelettoreMese mese={mese} mesiConNote={new Set()} onChange={setMese} />
        </div>
        <Link
          to={`/diario/nuova?data=${oggiIso()}`}
          className="rounded-md bg-accento px-4 py-2 text-sm font-medium text-superficie transition-opacity hover:opacity-90"
        >
          Nuova pagina
        </Link>
      </div>

      {errore && (
        <p
          role="alert"
          className="rounded-md border border-negativo/40 bg-negativo/10 px-3 py-2 text-sm text-negativo"
        >
          {errore}
        </p>
      )}

      {caricamento ? (
        <p className="text-sm text-testo-soft">Caricamento…</p>
      ) : pagine.length === 0 ? (
        <p className="rounded-card border border-bordo bg-superficie px-4 py-8 text-center text-sm text-testo-soft">
          Nessuna pagina in questo mese. Comincia dal piano, prima di entrare.
        </p>
      ) : (
        <ul className="space-y-2">
          {pagine.map((p) => {
            const stato = statoPagina(p)
            return (
              <li key={p.id}>
                <Link
                  to={`/diario/${p.id}`}
                  className="block rounded-card border border-bordo bg-superficie p-4 transition-colors hover:border-accento"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium capitalize text-testo">
                      {formattaDataEstesa(p.data)}
                    </span>
                    {(p.strumento || p.time_frame) && (
                      <span className="num text-xs text-testo-soft">
                        {[p.strumento, p.time_frame].filter(Boolean).join(' · ')}
                      </span>
                    )}
                    <span
                      className={`ml-auto rounded border px-1.5 py-0.5 text-[11px] ${CLASSE_STATO[stato]}`}
                    >
                      {ETICHETTA_STATO[stato]}
                    </span>
                    {p.piano_rispettato && (
                      <span className="rounded border border-bordo px-1.5 py-0.5 text-[11px] text-testo-soft">
                        Piano: {etichettaPiano(p.piano_rispettato)}
                      </span>
                    )}
                  </div>
                  {p.cosa_vedo && (
                    <p className="mt-1 line-clamp-2 text-sm text-testo-soft">{p.cosa_vedo}</p>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
