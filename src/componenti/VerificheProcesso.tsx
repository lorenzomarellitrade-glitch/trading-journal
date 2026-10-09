import type { EsitoVerifica, Verifica } from '../lib/processo'

/**
 * Le cinque verifiche del processo come etichette: conferme, finestra, stop,
 * uscita a piano, idea tua. Il segno (✓ ✗ –) accompagna sempre il colore,
 * così si leggono anche senza distinguere le tinte.
 *
 * - estesa: nome e dettaglio, per il form e il resoconto;
 * - compatta: sigla di due lettere, per le schede della griglia.
 */

const SEGNO: Record<EsitoVerifica, string> = { ok: '✓', ko: '✗', nd: '–' }

const CLASSE: Record<EsitoVerifica, string> = {
  ok: 'border-positivo/40 bg-positivo/10 text-positivo',
  ko: 'border-negativo/40 bg-negativo/10 text-negativo',
  nd: 'border-bordo text-testo-soft',
}

const LETTURA: Record<EsitoVerifica, string> = {
  ok: 'rispettata',
  ko: 'non rispettata',
  nd: 'non indicata',
}

export default function VerificheProcesso({
  verifiche,
  compatta = false,
}: {
  verifiche: Verifica[]
  compatta?: boolean
}) {
  return (
    <ul className={`flex flex-wrap ${compatta ? 'gap-1' : 'gap-1.5'}`} aria-label="Verifiche del processo">
      {verifiche.map((v) => (
        <li
          key={v.chiave}
          title={`${v.etichetta}: ${v.dettaglio}`}
          className={`num inline-flex items-center gap-1 rounded-md border ${
            compatta ? 'px-1 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'
          } ${CLASSE[v.esito]}`}
        >
          <span aria-hidden="true">{SEGNO[v.esito]}</span>
          {compatta ? (
            <span aria-hidden="true">{v.sigla}</span>
          ) : (
            <span>
              {v.etichetta}
              <span className="ml-1 opacity-80">{v.dettaglio}</span>
            </span>
          )}
          <span className="sr-only">
            {v.etichetta} {LETTURA[v.esito]}
          </span>
        </li>
      ))}
    </ul>
  )
}
