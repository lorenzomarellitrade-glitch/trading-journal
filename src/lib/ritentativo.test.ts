import { describe, expect, it, vi } from 'vitest'
import { creaFetchConRitentativo } from './ritentativo'

function risposta(status: number, corpo: string): Response {
  return new Response(corpo, { status })
}

const ERRORE_OROLOGIO = '{"code":"PGRST303","message":"JWT issued at future"}'

describe('creaFetchConRitentativo', () => {
  it('ritenta una volta sull\'errore di orologio e restituisce la seconda risposta', async () => {
    const base = vi
      .fn()
      .mockResolvedValueOnce(risposta(401, ERRORE_OROLOGIO))
      .mockResolvedValueOnce(risposta(200, '[]'))

    const r = await creaFetchConRitentativo(base, 0)('https://x.supabase.co/rest/v1/trades')

    expect(base).toHaveBeenCalledTimes(2)
    expect(r.status).toBe(200)
  })

  it('non ritenta più di una volta', async () => {
    const base = vi.fn().mockResolvedValue(risposta(401, ERRORE_OROLOGIO))

    const r = await creaFetchConRitentativo(base, 0)('https://x.supabase.co/rest/v1/trades')

    expect(base).toHaveBeenCalledTimes(2)
    expect(r.status).toBe(401)
  })

  it('non ritenta sugli altri 401, ad esempio una password sbagliata', async () => {
    const base = vi.fn().mockResolvedValue(risposta(401, '{"message":"Invalid login credentials"}'))

    const r = await creaFetchConRitentativo(base, 0)('https://x.supabase.co/auth/v1/token')

    expect(base).toHaveBeenCalledTimes(1)
    expect(await r.text()).toContain('Invalid login credentials')
  })

  it('lascia passare le risposte riuscite senza toccarle', async () => {
    const base = vi.fn().mockResolvedValue(risposta(200, '[{"id":1}]'))

    const r = await creaFetchConRitentativo(base, 0)('https://x.supabase.co/rest/v1/trades')

    expect(base).toHaveBeenCalledTimes(1)
    expect(await r.text()).toBe('[{"id":1}]')
  })

  it('ripete la richiesta con gli stessi parametri', async () => {
    const base = vi
      .fn()
      .mockResolvedValueOnce(risposta(401, ERRORE_OROLOGIO))
      .mockResolvedValueOnce(risposta(201, ''))
    const init = { method: 'POST', body: '{"nome":"8621"}' }

    await creaFetchConRitentativo(base, 0)('https://x.supabase.co/rest/v1/accounts', init)

    expect(base).toHaveBeenNthCalledWith(2, 'https://x.supabase.co/rest/v1/accounts', init)
  })
})
