import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { numeroDaInput } from '../lib/formato'
import type { Account } from '../lib/tipi'
import SelettoreTema from '../componenti/SelettoreTema'

const IMPOSTAZIONI_DEFAULT = {
  limite_giornaliero_percent: 2,
  limite_settimanale_percent: 4,
  soglia_rischio_trade_percent: 1.2,
}

/** Riga account in modifica: i numerici restano stringhe finché non si salva. */
interface BozzaAccount {
  id: string | null
  nome: string
  saldo_iniziale: string
  valuta: string
  attivo: boolean
  /** Vuoti sui conti senza regole da rispettare, es. un conto reale personale. */
  target: string
  drawdownGiorno: string
  drawdown: string
}

function testoDaNumero(n: number | null): string {
  return n == null ? '' : String(n)
}

function bozzaDa(a: Account): BozzaAccount {
  return {
    id: a.id,
    nome: a.nome,
    saldo_iniziale: String(a.saldo_iniziale),
    valuta: a.valuta,
    attivo: a.attivo,
    target: testoDaNumero(a.target_profitto_percent),
    drawdownGiorno: testoDaNumero(a.drawdown_giornaliero_percent),
    drawdown: testoDaNumero(a.drawdown_massimo_percent),
  }
}

export default function ImpostazioniPagina() {
  const [account, setAccount] = useState<BozzaAccount[]>([])
  const [limiti, setLimiti] = useState(IMPOSTAZIONI_DEFAULT)
  const [caricamento, setCaricamento] = useState(true)
  const [messaggio, setMessaggio] = useState<{ tipo: 'ok' | 'errore'; testo: string } | null>(null)

  useEffect(() => {
    void carica()
  }, [])

  async function carica() {
    setCaricamento(true)
    const [risAccount, risImpostazioni] = await Promise.all([
      supabase.from('accounts').select('*').order('created_at'),
      supabase.from('impostazioni').select('*').maybeSingle(),
    ])

    if (risAccount.error) {
      setMessaggio({ tipo: 'errore', testo: risAccount.error.message })
    } else {
      setAccount((risAccount.data ?? []).map(bozzaDa))
    }

    // La riga impostazioni può non esistere ancora: in quel caso usiamo i default.
    if (risImpostazioni.data) {
      const d = risImpostazioni.data
      setLimiti({
        limite_giornaliero_percent: Number(d.limite_giornaliero_percent),
        limite_settimanale_percent: Number(d.limite_settimanale_percent),
        soglia_rischio_trade_percent: Number(d.soglia_rischio_trade_percent),
      })
    }
    setCaricamento(false)
  }

  function aggiornaAccount(indice: number, patch: Partial<BozzaAccount>) {
    setAccount((prec) => prec.map((a, i) => (i === indice ? { ...a, ...patch } : a)))
  }

  function nuovoAccount() {
    setAccount((prec) => [
      ...prec,
      {
        id: null,
        nome: '',
        saldo_iniziale: '100000',
        valuta: 'USD',
        attivo: true,
        target: '',
        drawdownGiorno: '',
        drawdown: '',
      },
    ])
  }

  async function salva() {
    setMessaggio(null)

    const daSalvare = account.filter((a) => a.nome.trim() !== '')
    for (const a of daSalvare) {
      const saldo = Number(a.saldo_iniziale)
      if (!Number.isFinite(saldo) || saldo <= 0) {
        setMessaggio({ tipo: 'errore', testo: `Saldo iniziale non valido per "${a.nome}".` })
        return
      }

      // Campo vuoto significa "nessun obiettivo": va salvato come null, non 0.
      const target = numeroDaInput(a.target)
      const drawdownGiorno = numeroDaInput(a.drawdownGiorno)
      const drawdown = numeroDaInput(a.drawdown)
      for (const [valore, nome] of [
        [target, 'Target profitto'],
        [drawdownGiorno, 'Drawdown giornaliero'],
        [drawdown, 'Drawdown massimo'],
      ] as const) {
        if (valore != null && valore <= 0) {
          setMessaggio({ tipo: 'errore', testo: `${nome} non valido per "${a.nome}".` })
          return
        }
      }

      const riga = {
        nome: a.nome.trim(),
        saldo_iniziale: saldo,
        valuta: a.valuta.trim() || 'USD',
        attivo: a.attivo,
        target_profitto_percent: target,
        drawdown_giornaliero_percent: drawdownGiorno,
        drawdown_massimo_percent: drawdown,
      }

      const ris = a.id
        ? await supabase.from('accounts').update(riga).eq('id', a.id)
        : await supabase.from('accounts').insert(riga)

      if (ris.error) {
        setMessaggio({ tipo: 'errore', testo: ris.error.message })
        return
      }
    }

    // upsert: crea la riga impostazioni al primo salvataggio, poi la aggiorna.
    const { data: utente } = await supabase.auth.getUser()
    const risLimiti = await supabase
      .from('impostazioni')
      .upsert({ user_id: utente.user!.id, ...limiti })

    if (risLimiti.error) {
      setMessaggio({ tipo: 'errore', testo: risLimiti.error.message })
      return
    }

    setMessaggio({ tipo: 'ok', testo: 'Impostazioni salvate.' })
    await carica()
  }

  if (caricamento) return <p className="text-sm text-testo-soft">Caricamento…</p>

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-xl font-medium tracking-tight">Impostazioni</h1>

      {/* --- Tema ------------------------------------------------------ */}
      <section className="rounded-card border border-bordo bg-superficie p-5">
        <h2 className="text-sm font-medium text-testo">Tema</h2>
        <p className="mt-1 text-xs text-testo-soft">
          In tutti e tre gli utili sono più chiari delle perdite. La scelta resta salvata in
          questo browser.
        </p>
        <div className="mt-4">
          <SelettoreTema esteso />
        </div>
      </section>

      {/* --- Account --------------------------------------------------- */}
      <section className="rounded-card border border-bordo bg-superficie p-5">
        <h2 className="text-sm font-medium text-testo">Account</h2>
        <p className="mt-1 text-xs text-testo-soft">
          I saldi iniziali sono la base per il calcolo di P&amp;L% e rischio%. Target e drawdown
          servono solo ai conti prop: lasciali vuoti su un conto reale, e non comparirà nessun
          obiettivo.
        </p>

        <div className="mt-4 space-y-3">
          {account.map((a, i) => (
            <div
              key={a.id ?? `nuovo-${i}`}
              className="grid grid-cols-2 gap-3 rounded-md border border-bordo bg-sfondo p-3 sm:grid-cols-3 lg:grid-cols-[1fr_8rem_4rem_5rem_5rem_5rem_auto]"
            >
              <label className="col-span-2 sm:col-span-1">
                <span className="text-xs text-testo-soft">Nome</span>
                <input
                  value={a.nome}
                  onChange={(e) => aggiornaAccount(i, { nome: e.target.value })}
                  placeholder="FTMO A"
                  className="mt-0.5 w-full rounded border border-bordo bg-superficie px-2 py-1.5 text-sm"
                />
              </label>

              <label>
                <span className="text-xs text-testo-soft">Saldo iniziale</span>
                <input
                  type="number"
                  step="0.01"
                  value={a.saldo_iniziale}
                  onChange={(e) => aggiornaAccount(i, { saldo_iniziale: e.target.value })}
                  className="num mt-0.5 w-full rounded border border-bordo bg-superficie px-2 py-1.5 text-sm"
                />
              </label>

              <label>
                <span className="text-xs text-testo-soft">Valuta</span>
                <input
                  value={a.valuta}
                  onChange={(e) => aggiornaAccount(i, { valuta: e.target.value })}
                  className="mt-0.5 w-full rounded border border-bordo bg-superficie px-2 py-1.5 text-sm"
                />
              </label>

              <label>
                <span className="text-xs text-testo-soft">Target %</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={a.target}
                  onChange={(e) => aggiornaAccount(i, { target: e.target.value })}
                  placeholder="—"
                  className="num mt-0.5 w-full rounded border border-bordo bg-superficie px-2 py-1.5 text-sm"
                />
              </label>

              <label>
                <span className="text-xs text-testo-soft">DD giorno %</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={a.drawdownGiorno}
                  onChange={(e) => aggiornaAccount(i, { drawdownGiorno: e.target.value })}
                  placeholder="—"
                  className="num mt-0.5 w-full rounded border border-bordo bg-superficie px-2 py-1.5 text-sm"
                />
              </label>

              <label>
                <span className="text-xs text-testo-soft">DD totale %</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={a.drawdown}
                  onChange={(e) => aggiornaAccount(i, { drawdown: e.target.value })}
                  placeholder="—"
                  className="num mt-0.5 w-full rounded border border-bordo bg-superficie px-2 py-1.5 text-sm"
                />
              </label>

              <label className="flex items-end gap-2 pb-1.5 text-sm text-testo-soft">
                <input
                  type="checkbox"
                  checked={a.attivo}
                  onChange={(e) => aggiornaAccount(i, { attivo: e.target.checked })}
                  className="h-4 w-4 accent-accento"
                />
                Attivo
              </label>
            </div>
          ))}
        </div>

        <button
          onClick={nuovoAccount}
          className="mt-3 rounded-md border border-bordo px-3 py-1.5 text-sm text-testo-soft transition-colors hover:text-testo"
        >
          + Aggiungi account
        </button>
      </section>

      {/* --- Limiti di rischio ----------------------------------------- */}
      <section className="rounded-card border border-bordo bg-superficie p-5">
        <h2 className="text-sm font-medium text-testo">Limiti di rischio</h2>
        <p className="mt-1 text-xs text-testo-soft">
          Usati dalla barra rischio del calendario e dall'avviso nel form trade.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {(
            [
              ['limite_giornaliero_percent', 'Perdita max giornaliera %'],
              ['limite_settimanale_percent', 'Perdita max settimanale %'],
              ['soglia_rischio_trade_percent', 'Avviso rischio per trade %'],
            ] as const
          ).map(([campo, etichetta]) => (
            <label key={campo}>
              <span className="text-xs text-testo-soft">{etichetta}</span>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={limiti[campo]}
                onChange={(e) => setLimiti({ ...limiti, [campo]: Number(e.target.value) })}
                className="num mt-0.5 w-full rounded border border-bordo bg-sfondo px-2 py-1.5 text-sm"
              />
            </label>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={salva}
          className="rounded-md bg-accento px-4 py-2 text-sm font-medium text-superficie transition-opacity hover:opacity-90"
        >
          Salva
        </button>
        {messaggio && (
          <span
            role="status"
            className={`text-sm ${messaggio.tipo === 'ok' ? 'text-positivo' : 'text-negativo'}`}
          >
            {messaggio.testo}
          </span>
        )}
      </div>
    </div>
  )
}
