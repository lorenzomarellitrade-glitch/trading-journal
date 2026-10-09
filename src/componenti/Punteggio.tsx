import type { Punteggio as DatiPunteggio } from '../lib/statistiche'
import { SOGLIA_CAMPIONE } from '../lib/statistiche'
import { TOKEN } from '../lib/colori'
import { VUOTO } from '../lib/formato'
import Anello from './Anello'
import { useConteggio } from './useAnimazione'

/**
 * Punteggio da 0 a 100 mostrato come anello.
 *
 * Il colore segue il valore, ma resta nei toni della palette: non c'è nessun
 * rosso d'allarme né verde di festa, solo tre gradazioni che si distinguono.
 */

function colore(valore: number): string {
  if (valore >= 70) return TOKEN.positivo
  if (valore >= 40) return TOKEN.accento
  return TOKEN.negativo
}

export default function Punteggio({
  titolo,
  spiegazione,
  punteggio,
}: {
  titolo: string
  spiegazione: string
  punteggio: DatiPunteggio
}) {
  const { valore, numeroTrade, campioneScarso } = punteggio
  const tinta = valore == null ? TOKEN.bordo : colore(valore)
  const contato = useConteggio(valore)

  return (
    <section className="riquadro flex items-center gap-4 p-4">
      <div className="shrink-0">
        <Anello quota={(valore ?? 0) / 100} colore={tinta} dimensione="grande">
          <span className="num text-xl" style={{ color: tinta }}>
            {contato == null ? VUOTO : Math.round(contato)}
          </span>
          {valore != null && <span className="text-[10px] text-testo-soft">su 100</span>}
        </Anello>
      </div>

      <div className="min-w-0">
        <h3 className="text-sm font-medium text-testo">{titolo}</h3>
        <p className="mt-0.5 text-xs leading-snug text-testo-soft">{spiegazione}</p>

        <p className="num mt-1 text-[11px] text-testo-soft">
          {numeroTrade} {numeroTrade === 1 ? 'trade' : 'trade'}
          {numeroTrade > 0 && campioneScarso && (
            <span className="text-accento"> · sotto i {SOGLIA_CAMPIONE}, poco significativo</span>
          )}
        </p>
      </div>
    </section>
  )
}
