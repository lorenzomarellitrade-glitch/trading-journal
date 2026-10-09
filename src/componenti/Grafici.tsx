import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { coloriSerie, type Colori } from '../lib/colori'
import type { BarraR, PuntoEquity, RigaDisciplina } from '../lib/statistiche'
import { formattaData, formattaUsd } from '../lib/formato'
import type { Account } from '../lib/tipi'
import { useColori } from './useTema'


/**
 * Recharts passa ai formatter un `ValueType | undefined` (numero, stringa o
 * array). Qui si riduce a un numero utilizzabile, o a null se non lo è.
 */
function aNumero(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * Stili comuni dei grafici, dai colori del tema attivo. Recharts vuole valori
 * espliciti, non variabili CSS: per questo si ricalcolano a ogni cambio tema.
 */
function stili(c: Colori) {
  return {
    asse: { stroke: c.testoSoft, fontSize: 11 },
    griglia: c.bordo,
    tooltip: {
      backgroundColor: c.superficie,
      border: `1px solid ${c.bordo}`,
      borderRadius: '0.5rem',
      fontSize: '12px',
      color: c.testo,
    },
    legenda: { fontSize: '12px', color: c.testoSoft },
  }
}

/** P&L cumulativo nel tempo, una linea per account. */
export function GraficoEquity({
  punti,
  account,
}: {
  punti: PuntoEquity[]
  account: Account[]
}) {
  const c = useColori()
  const { asse, griglia, tooltip, legenda } = stili(c)
  const serie = coloriSerie(c)

  if (punti.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-testo-soft">
        Nessun trade concluso da rappresentare.
      </p>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={punti} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={griglia} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="data"
          tick={asse}
          tickLine={false}
          axisLine={{ stroke: griglia }}
          tickFormatter={(v: string) => formattaData(v).replace(/ \d{4}$/, '')}
          minTickGap={24}
        />
        <YAxis
          tick={asse}
          tickLine={false}
          axisLine={false}
          width={64}
          tickFormatter={(v: number) => v.toLocaleString('it-IT', { maximumFractionDigits: 0 })}
        />
        {/* Lo zero è il riferimento che conta: sopra si guadagna, sotto si perde. */}
        <ReferenceLine y={0} stroke={c.testoSoft} strokeWidth={1} />
        <Tooltip
          contentStyle={tooltip}
          labelFormatter={(v) => formattaData(String(v))}
          formatter={(valore, nome) => [formattaUsd(aNumero(valore), true), String(nome)]}
        />
        <Legend wrapperStyle={legenda} />

        {account.map((a, i) => (
          <Line
            key={a.id}
            type="monotone"
            dataKey={a.id}
            name={a.nome}
            stroke={serie[i % serie.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

/** Le cinque serie della disciplina, con il verso "buono" di ciascuna. */
const SERIE_DISCIPLINA = [
  { chiave: 'processoCompleto', nome: '5/5 conferme', colore: 'positivo' },
  { chiave: 'slSpostato', nome: 'SL spostato', colore: 'negativo' },
  { chiave: 'chiusoManualmente', nome: 'Chiuso a mano', colore: 'accento' },
  { chiave: 'fuoriFinestra', nome: 'Fuori finestra', colore: 'serieA' },
  { chiave: 'ideaEsterna', nome: 'Idea esterna', colore: 'serieB' },
] as const satisfies readonly { chiave: string; nome: string; colore: keyof Colori }[]

/**
 * Aderenza al processo mese per mese.
 * La linea verde dovrebbe salire, le altre scendere: è l'unico grafico che
 * misura il miglioramento dell'operatore invece del risultato del mercato.
 */
export function GraficoDisciplina({ righe }: { righe: RigaDisciplina[] }) {
  const c = useColori()
  const { asse, griglia, tooltip, legenda } = stili(c)

  if (righe.length < 2) {
    return (
      <p className="py-12 text-center text-sm text-testo-soft">
        Servono almeno due mesi di trade per vedere una tendenza.
      </p>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={righe} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={griglia} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="etichetta" tick={asse} tickLine={false} axisLine={{ stroke: griglia }} />
        <YAxis
          tick={asse}
          tickLine={false}
          axisLine={false}
          width={40}
          domain={[0, 100]}
          tickFormatter={(v: number) => `${v}%`}
        />
        <Tooltip
          contentStyle={tooltip}
          formatter={(v, nome) => {
            const n = aNumero(v)
            return [n == null ? '—' : `${n.toFixed(0)}%`, String(nome)]
          }}
        />
        <Legend wrapperStyle={legenda} />

        {SERIE_DISCIPLINA.map((s) => (
          <Line
            key={s.chiave}
            type="monotone"
            dataKey={s.chiave}
            name={s.nome}
            stroke={c[s.colore]}
            strokeWidth={s.chiave === 'processoCompleto' ? 2.5 : 1.5}
            dot={{ r: 2 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

/** Distribuzione degli R realizzati. */
export function GraficoDistribuzioneR({ barre }: { barre: BarraR[] }) {
  const c = useColori()
  const { asse, griglia, tooltip } = stili(c)

  if (barre.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-testo-soft">
        Nessun R realizzato da distribuire.
      </p>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={barre} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={griglia} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="etichetta" tick={asse} tickLine={false} axisLine={{ stroke: griglia }} />
        <YAxis tick={asse} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <Tooltip
          contentStyle={tooltip}
          formatter={(v) => [`${aNumero(v) ?? 0} trade`, 'Conteggio']}
          labelFormatter={(v) => `R fra ${v}`}
          cursor={{ fill: c.accento, fillOpacity: 0.12 }}
        />
        <Bar dataKey="conteggio" radius={[3, 3, 0, 0]}>
          {/* Le barre in perdita restano mattone, quelle in utile oliva.
              <Cell> dev'essere figlio diretto di <Bar>: Recharts ispeziona i
              propri figli per tipo e non riconoscerebbe un wrapper. */}
          {barre.map((b) => (
            <Cell key={b.etichetta} fill={b.a <= 0 ? c.negativo : c.positivo} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
