import { describe, expect, it } from 'vitest'

import { queryGate } from '@/lib/query/gate'

const q = (over: Partial<Parameters<typeof queryGate>[0]> = {}) => ({
  isPending: false, isError: false, error: null, data: [1] as unknown, fetchStatus: 'idle' as const, ...over,
})

describe('queryGate', () => {
  it('data tersedia → ready', () => {
    expect(queryGate(q())).toEqual({ state: 'ready' })
  })

  it('memuat pertama kali → loading', () => {
    expect(queryGate(q({ isPending: true, data: undefined, fetchStatus: 'fetching' }))).toEqual({ state: 'loading' })
  })

  it('gagal tanpa data → error (membawa error-nya)', () => {
    const err = new Error('x')
    expect(queryGate(q({ isError: true, error: err, data: undefined }))).toEqual({ state: 'error', error: err })
  })

  it('gagal TETAPI masih punya data (cache/pemuatan ulang gagal) → tetap ready, data tidak disembunyikan', () => {
    expect(queryGate(q({ isError: true, error: new Error('x'), data: [1, 2] }))).toEqual({ state: 'ready' })
  })

  it('offline tanpa data: permintaan tertahan → offline (bukan skeleton selamanya)', () => {
    expect(queryGate(q({ isPending: true, data: undefined, fetchStatus: 'paused' }))).toEqual({ state: 'offline' })
  })

  it('offline dengan data dari cache → ready', () => {
    expect(queryGate(q({ isPending: false, data: [1], fetchStatus: 'paused' }))).toEqual({ state: 'ready' })
  })

  it('beberapa query: error mengalahkan offline mengalahkan loading', () => {
    const ok = q()
    const loading = q({ isPending: true, data: undefined, fetchStatus: 'fetching' })
    const paused = q({ isPending: true, data: undefined, fetchStatus: 'paused' })
    const failed = q({ isError: true, error: 'e', data: undefined })
    expect(queryGate(ok, loading).state).toBe('loading')
    expect(queryGate(loading, paused).state).toBe('offline')
    expect(queryGate(paused, failed).state).toBe('error')
    expect(queryGate(ok, ok).state).toBe('ready')
  })
})
