import { describe, expect, it } from 'vitest'

import { AppError } from '@/lib/errors'
import { QUERY_MESSAGES, toAppError, unwrap } from '@/lib/supabase/query'

describe('toAppError', () => {
  it('memetakan kode umum ke pesan ramah', () => {
    expect(toAppError({ code: 'PGRST116' }, true).message).toBe(QUERY_MESSAGES.notFound)
    expect(toAppError({ code: 'PGRST301' }, true).message).toBe(QUERY_MESSAGES.session)
    expect(toAppError({ code: '42501' }, true).message).toBe(QUERY_MESSAGES.session)
    expect(toAppError({ code: '23514' }, true).message).toBe(QUERY_MESSAGES.invalid)
  })

  it('offline atau gagal fetch = masalah koneksi', () => {
    expect(toAppError({ code: '23514' }, false).message).toBe(QUERY_MESSAGES.network)
    expect(toAppError({ message: 'TypeError: Failed to fetch' }, true).message).toBe(QUERY_MESSAGES.network)
  })

  it('tidak membocorkan pesan mentah database', () => {
    const e = toAppError({ code: '23505', message: 'duplicate key value violates unique constraint "courses_pkey"' }, true)
    expect(e.message).toBe(QUERY_MESSAGES.generic)
    expect(e.message).not.toMatch(/courses_pkey|duplicate/)
    expect(toAppError(null, true).message).toBe(QUERY_MESSAGES.generic)
  })

  it('AppError dipertahankan apa adanya', () => {
    const original = new AppError('pesan sendiri')
    expect(toAppError(original, true)).toBe(original)
  })
})

describe('unwrap', () => {
  it('mengembalikan data, atau melempar AppError saat error', () => {
    expect(unwrap<number[]>({ data: [1], error: null })).toEqual([1])
    expect(() => unwrap({ data: null, error: { code: 'PGRST116' } })).toThrow(AppError)
  })
})
