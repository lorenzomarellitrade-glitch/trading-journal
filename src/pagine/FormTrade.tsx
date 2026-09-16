import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { calcolaMetriche, CONFERME_TOTALI, contaConferme } from '../lib/calcoli'
import {
  caricaAccount,
  caricaImpostazioni,
  caricaTrade,
  eliminaTrade,
  IMPOSTAZIONI_DEFAULT,
  salvaTrade,
  type BozzaExecution,
} from '../lib/dati'
import { inputDaNumero, numeroDaInput, oggiIso, oraBreve } from '../lib/formato'
import {
  BIAS,
  CAMPI_LINK,
  DIREZIONI,
  ESITI,
  FINESTRE,
  FLAG_COMPORTAMENTALI,
  STEP_CHECKLIST,
  type Account,
  type Esito,
  type Trade,
} from '../lib/tipi'
import { Campo, Casella, Conferma, GruppoOpzioni, Input, InputNumero, Sezione } from '../componenti/campi'
import RiepilogoMetriche from '../componenti/RiepilogoMetriche'

/** Campi di una execution mentre si digita: stringhe, non numeri. */
interface BozzaCampi {
  entry: string
  stop_loss: string
  take_profit: string
  exit: string
  lotti: string
  esito: Esito | null
}

/** I cinque campi numerici di una execution. */
type CampoPrezzo = 'entry' | 'stop_loss' | 'take_profit' | 'exit' | 'lotti'

const BOZZA_VUOTA: BozzaCampi = {
  entry: '',
  stop_loss: '',
  take_profit: '',
  exit: '',
  lotti: '',
  esito: null,
}

/** Valori di partenza di un trade nuovo. */
function tradeVuoto(data: string): Partial<Trade> {
  return {
    data,
    ora_entrata: null,
    direzione: 'long',
    finestra: null,
    bias_daily: null,
    bias_h4: null,
    bias_h1: null,
    step1_analisi_multitf: false,
    step2_zona_operativa: false,
    step3_prezzo_in_zona: false,
    step4_schematica: false,
    step5_fallimento_rottura: false,
    numero_fr: null,
    sl_spostato: false,
    chiuso_manualmente: false,
    oltre_4h: false,
    news_durante: false,
    idea_esterna: false,
    link_daily: null,
    link_h4: null,
    link_h1: null,
    link_m15: null,
    link_m5: null,
    nota_uscita: null,
    emozione: null,
  }
}

/** Testo vuoto → null, così nel database non finiscono stringhe vuote. */
function testoONull(v: string): string | null {
  const t = v.trim()
  return t === '' ? null : t
}

export default function FormTrade() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const dataIniziale = searchParams.get('data') ?? oggiIso()

  const [trade, setTrade] = useState<Partial<Trade>>(() => tradeVuoto(dataIniziale))
  const [bozze, setBozze] = useState<Record<string, BozzaCampi>>({})
  const [account, setAccount] = useState<Account[]>([])
  const [soglia, setSoglia] = useState(IMPOSTAZIONI_DEFAULT.soglia_rischio_trade_percent)
  const [accountAttivo, setAccountAttivo] = useState<string | null>(null)

  const [caricamento, setCaricamento] = useState(true)
  const [salvataggio, setSalvataggio] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const [confermaElimina, setConfermaElimina] = useState(false)

  useEffect(() => {
    let annullato = false

    async function carica() {
      setCaricamento(true)
      setErrore(null)
      try {
        const [acc, imp] = await Promise.all([caricaAccount(true), caricaImpostazioni()])
        if (annullato) return

        setAccount(acc)
        setSoglia(imp.soglia_rischio_trade_percent)
        setAccountAttivo(acc[0]?.id ?? null)

        const nuoveBozze: Record<string, BozzaCampi> = {}
        for (const a of acc) nuoveBozze[a.id] = { ...BOZZA_VUOTA }

        if (id) {
          const esistente = await caricaTrade(id)
          if (annullato) return
          if (!esistente) {
            setErrore('Trade non trovato.')
            setCaricamento(false)
            return
          }

          const { executions, ...campi } = esistente
          setTrade(campi)

          for (const e of executions) {
            nuoveBozze[e.account_id] = {
              entry: inputDaNumero(e.entry),
              stop_loss: inputDaNumero(e.stop_loss),
              take_profit: inputDaNumero(e.take_profit),
              exit: inputDaNumero(e.exit),
              lotti: inputDaNumero(e.lotti),
              esito: e.esito,
            }
          }
        }

        setBozze(nuoveBozze)
      } catch (e) {
        if (!annullato) setErrore(e instanceof Error ? e.message : String(e))
      } finally {
        if (!annullato) setCaricamento(false)
      }
    }

    void carica()
    return () => {
      annullato = true
    }
  }, [id])

  const conferme = contaConferme(trade)

  function aggiorna(patch: Partial<Trade>) {
    setTrade((p) => ({ ...p, ...patch }))
  }

  /**
   * Aggiorna un campo scelto a runtime (nei cicli su bias, checklist, flag,
   * link). Il cast serve solo perché TypeScript, con una chiave calcolata,
   * produce un tipo con index signature invece del campo specifico; la
   * relazione campo/valore resta comunque verificata dalla firma generica.
   */
  function aggiornaCampo<K extends keyof Trade>(campo: K, valore: Trade[K]) {
    setTrade((p) => ({ ...p, [campo]: valore }) as Partial<Trade>)
  }

  function aggiornaPrezzo(accountId: string, campo: CampoPrezzo, valore: string) {
    setBozze((p) => ({
      ...p,
      [accountId]: { ...p[accountId], [campo]: valore } as BozzaCampi,
    }))
  }

  function aggiornaEsito(accountId: string, esito: Esito | null) {
    setBozze((p) => ({ ...p, [accountId]: { ...p[accountId], esito } }))
  }

  /** Le executions nella forma attesa dal database. */
  const executionsDaSalvare = useMemo<BozzaExecution[]>(
    () =>
      account.map((a) => {
        const b = bozze[a.id] ?? BOZZA_VUOTA
        return {
          account_id: a.id,
          entry: numeroDaInput(b.entry),
          stop_loss: numeroDaInput(b.stop_loss),
          take_profit: numeroDaInput(b.take_profit),
          exit: numeroDaInput(b.exit),
          lotti: numeroDaInput(b.lotti),
          esito: b.esito,
        }
      }),
    [account, bozze],
  )

  function validazione(): string | null {
    if (!trade.data) return 'La data è obbligatoria.'
    if (!trade.direzione) return 'La direzione è obbligatoria.'
    if (!executionsDaSalvare.some((e) => e.entry != null))
      return "Inserisci il prezzo di entrata in almeno uno dei due account."
    return null
  }

  async function salva(eNuovo = false) {
    const problema = validazione()
    if (problema) {
      setErrore(problema)
      return
    }

    setSalvataggio(true)
    setErrore(null)
    try {
      await salvaTrade(trade, executionsDaSalvare, id)

      if (eNuovo) {
        // Stessa data, tutto il resto azzerato: di solito i trade della
        // giornata si inseriscono uno dopo l'altro.
        const data = trade.data!
        setTrade(tradeVuoto(data))
        const vuote: Record<string, BozzaCampi> = {}
        for (const a of account) vuote[a.id] = { ...BOZZA_VUOTA }
        setBozze(vuote)
        navigate(`/trade/nuovo?data=${data}`, { replace: true })
      } else {
        navigate(-1)
      }
    } catch (e) {
      setErrore(e instanceof Error ? e.message : String(e))
    } finally {
      setSalvataggio(false)
    }
  }

  async function elimina() {
    if (!id) return
    setSalvataggio(true)
    try {
      await eliminaTrade(id)
      navigate('/trade', { replace: true })
    } catch (e) {
      setErrore(e instanceof Error ? e.message : String(e))
      setSalvataggio(false)
    }
  }

  if (caricamento) return <p className="text-sm text-testo-soft">Caricamento…</p>

  if (account.length === 0) {
    return (
      <div className="rounded-card border border-bordo bg-superficie p-6 text-sm text-testo-soft">
        Nessun account attivo. Creane almeno uno in{' '}
        <button onClick={() => navigate('/impostazioni')} className="text-accento underline">
          Impostazioni
        </button>
        .
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-medium tracking-tight">
          {id ? 'Modifica trade' : 'Nuovo trade'}
        </h1>
      </header>

      {errore && (
        <p
          role="alert"
          className="rounded-md border border-negativo/40 bg-negativo/10 px-3 py-2 text-sm text-negativo"
        >
          {errore}
        </p>
      )}

      {/* --- 1. Contesto e 2. Checklist, affiancate su desktop ------------- */}
      <div className="grid gap-4 md:grid-cols-2">
        <Sezione titolo="Contesto">
          <div className="grid grid-cols-2 gap-3">
            <Campo etichetta="Data">
              <Input
                type="date"
                value={trade.data ?? ''}
                onChange={(e) => aggiorna({ data: e.target.value })}
              />
            </Campo>
            <Campo etichetta="Ora entrata">
              <Input
                type="time"
                value={oraBreve(trade.ora_entrata)}
                onChange={(e) => aggiorna({ ora_entrata: testoONull(e.target.value) })}
              />
            </Campo>
          </div>

          <div className="mt-3">
            <Campo etichetta="Direzione">
              <GruppoOpzioni
                opzioni={DIREZIONI}
                valore={trade.direzione ?? null}
                consentiVuoto={false}
                etichette={{ long: 'Long', short: 'Short' }}
                onChange={(v) => v && aggiorna({ direzione: v })}
              />
            </Campo>
          </div>

          <div className="mt-3">
            <Campo etichetta="Finestra oraria">
              <GruppoOpzioni
                opzioni={FINESTRE}
                valore={trade.finestra ?? null}
                onChange={(v) => aggiorna({ finestra: v })}
              />
            </Campo>
          </div>

          <div className="mt-3 space-y-2">
            {(
              [
                ['bias_daily', 'Bias Daily'],
                ['bias_h4', 'Bias H4'],
                ['bias_h1', 'Bias H1'],
              ] as const
            ).map(([campo, etichetta]) => (
              <Campo key={campo} etichetta={etichetta}>
                <GruppoOpzioni
                  opzioni={BIAS}
                  valore={trade[campo] ?? null}
                  onChange={(v) => aggiornaCampo(campo, v)}
                />
              </Campo>
            ))}
          </div>
        </Sezione>

        <Sezione
          titolo="Checklist"
          azione={
            <span
              className={`num rounded-md px-2 py-0.5 text-xs ${
                conferme === CONFERME_TOTALI
                  ? 'bg-positivo/15 text-positivo'
                  : 'bg-sfondo text-testo-soft'
              }`}
            >
              {conferme}/{CONFERME_TOTALI} conferme
            </span>
          }
        >
          <div className="space-y-2">
            {STEP_CHECKLIST.map((s, i) => (
              <Conferma
                key={s.campo}
                numero={i + 1}
                etichetta={s.etichetta}
                attiva={Boolean(trade[s.campo])}
                onChange={(v) => aggiornaCampo(s.campo, v)}
              />
            ))}
          </div>
        </Sezione>
      </div>

      {/* --- 3. Esecuzione ------------------------------------------------ */}
      <Sezione titolo="Esecuzione">
        {/* Su telefono i blocchi diventano schede: due colonne non ci stanno. */}
        <div className="mb-3 flex gap-1 md:hidden">
          {account.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAccountAttivo(a.id)}
              className={`flex-1 rounded-md border px-3 py-1.5 text-xs transition-colors ${
                accountAttivo === a.id
                  ? 'border-accento bg-accento/15 text-accento'
                  : 'border-bordo text-testo-soft'
              }`}
            >
              {a.nome}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {account.map((a) => {
            const b = bozze[a.id] ?? BOZZA_VUOTA
            const metriche = calcolaMetriche(
              {
                entry: numeroDaInput(b.entry),
                stop_loss: numeroDaInput(b.stop_loss),
                take_profit: numeroDaInput(b.take_profit),
                exit: numeroDaInput(b.exit),
                lotti: numeroDaInput(b.lotti),
              },
              trade.direzione ?? null,
              a.saldo_iniziale,
            )

            return (
              <div
                key={a.id}
                className={`rounded-md border border-bordo p-3 ${
                  accountAttivo === a.id ? '' : 'hidden md:block'
                }`}
              >
                <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-testo-soft">
                  {a.nome}
                </h3>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {(
                    [
                      ['entry', 'Entry'],
                      ['stop_loss', 'Stop loss'],
                      ['take_profit', 'Take profit'],
                      ['exit', 'Exit'],
                      ['lotti', 'Lotti'],
                    ] as const
                  ).map(([campo, etichetta]) => (
                    <Campo key={campo} etichetta={etichetta}>
                      <InputNumero
                        value={b[campo]}
                        onChange={(e) => aggiornaPrezzo(a.id, campo, e.target.value)}
                      />
                    </Campo>
                  ))}
                </div>

                <div className="mt-3">
                  <Campo etichetta="Esito">
                    <GruppoOpzioni
                      opzioni={ESITI}
                      valore={b.esito}
                      onChange={(v) => aggiornaEsito(a.id, v)}
                    />
                  </Campo>
                </div>

                <RiepilogoMetriche metriche={metriche} sogliaRischioPercent={soglia} />
              </div>
            )
          })}
        </div>
      </Sezione>

      {/* --- 4. Comportamento e 5. Grafici -------------------------------- */}
      <div className="grid gap-4 md:grid-cols-2">
        <Sezione titolo="Comportamento">
          <div className="grid gap-2 sm:grid-cols-2">
            {FLAG_COMPORTAMENTALI.map((f) => (
              <Casella
                key={f.campo}
                etichetta={f.etichetta}
                attiva={Boolean(trade[f.campo])}
                onChange={(v) => aggiornaCampo(f.campo, v)}
              />
            ))}
          </div>
        </Sezione>

        <Sezione titolo="Grafici">
          <div className="space-y-2">
            {CAMPI_LINK.map((l) => {
              const valore = trade[l.campo] ?? ''
              const sospetto = valore !== '' && !valore.includes('tradingview.com')
              return (
                <div key={l.campo}>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Campo etichetta={l.etichetta}>
                        <Input
                          type="url"
                          placeholder="https://www.tradingview.com/x/…"
                          value={valore}
                          onChange={(e) => aggiornaCampo(l.campo, testoONull(e.target.value))}
                        />
                      </Campo>
                    </div>
                    {valore !== '' && (
                      <a
                        href={valore}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mb-0.5 rounded-md border border-bordo px-2.5 py-2 text-xs text-testo-soft transition-colors hover:text-testo"
                      >
                        Apri
                      </a>
                    )}
                  </div>
                  {sospetto && (
                    <p className="mt-0.5 text-xs text-negativo">
                      Questo link non sembra di TradingView.
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </Sezione>
      </div>

      {/* --- 6. Note ------------------------------------------------------ */}
      <Sezione titolo="Note">
        <div className="grid gap-3 md:grid-cols-[1fr_12rem]">
          <Campo etichetta="Nota sull'uscita">
            <textarea
              rows={3}
              placeholder="Perché sono uscito lì? Era il piano?"
              value={trade.nota_uscita ?? ''}
              onChange={(e) => aggiorna({ nota_uscita: testoONull(e.target.value) })}
              className="mt-0.5 w-full rounded-md border border-bordo bg-sfondo px-2.5 py-2 text-sm text-testo placeholder:text-testo-soft/60"
            />
          </Campo>
          <Campo etichetta="Emozione" suggerimento="Una parola">
            <Input
              value={trade.emozione ?? ''}
              onChange={(e) => aggiorna({ emozione: testoONull(e.target.value) })}
              placeholder="calmo, ansioso, euforico…"
            />
          </Campo>
        </div>
      </Sezione>

      {/* --- Azioni ------------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-2 pb-4">
        <button
          onClick={() => void salva(false)}
          disabled={salvataggio}
          className="rounded-md bg-accento px-4 py-2 text-sm font-medium text-superficie transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {salvataggio ? 'Salvataggio…' : 'Salva'}
        </button>

        <button
          onClick={() => void salva(true)}
          disabled={salvataggio}
          className="rounded-md border border-accento px-4 py-2 text-sm text-accento transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Salva e nuovo
        </button>

        <button
          onClick={() => navigate(-1)}
          disabled={salvataggio}
          className="rounded-md border border-bordo px-4 py-2 text-sm text-testo-soft transition-colors hover:text-testo"
        >
          Annulla
        </button>

        {id && (
          <div className="ml-auto">
            {confermaElimina ? (
              <span className="flex items-center gap-2 text-sm">
                <span className="text-testo-soft">Eliminare?</span>
                <button
                  onClick={() => void elimina()}
                  disabled={salvataggio}
                  className="rounded-md bg-negativo px-3 py-2 text-sm text-superficie"
                >
                  Sì, elimina
                </button>
                <button
                  onClick={() => setConfermaElimina(false)}
                  className="rounded-md border border-bordo px-3 py-2 text-sm text-testo-soft"
                >
                  No
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfermaElimina(true)}
                className="rounded-md border border-negativo/50 px-4 py-2 text-sm text-negativo transition-colors hover:bg-negativo/10"
              >
                Elimina
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
