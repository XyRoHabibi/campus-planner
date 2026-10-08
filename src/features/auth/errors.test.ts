import { describe, expect, it } from 'vitest'

import { LOGIN_MESSAGES, sanitizeRedirect, toLoginErrorMessage } from '@/features/auth/errors'

describe('toLoginErrorMessage', () => {
  it('memetakan kredensial salah ke pesan ramah', () => {
    expect(toLoginErrorMessage({ code: 'invalid_credentials', status: 400, message: 'Invalid login credentials' })).toBe(
      LOGIN_MESSAGES.invalidCredentials,
    )
    expect(toLoginErrorMessage({ status: 400, message: 'Invalid login credentials' })).toBe(LOGIN_MESSAGES.invalidCredentials)
  })

  it('memetakan rate limit, jaringan, dan akun nonaktif', () => {
    expect(toLoginErrorMessage({ code: 'over_request_rate_limit', status: 429 })).toBe(LOGIN_MESSAGES.rateLimited)
    expect(toLoginErrorMessage({ name: 'AuthRetryableFetchError', status: 0 })).toBe(LOGIN_MESSAGES.network)
    expect(toLoginErrorMessage(new TypeError('Failed to fetch'))).toBe(LOGIN_MESSAGES.network)
    expect(toLoginErrorMessage({ code: 'email_not_confirmed' })).toBe(LOGIN_MESSAGES.inactive)
  })

  it('offline selalu dijelaskan sebagai masalah koneksi', () => {
    expect(toLoginErrorMessage({ code: 'invalid_credentials' }, false)).toBe(LOGIN_MESSAGES.network)
  })

  it('error tak dikenal tidak membocorkan teks mentah backend', () => {
    const msg = toLoginErrorMessage({ status: 500, message: 'duplicate key value violates constraint "users_pkey"' })
    expect(msg).toBe(LOGIN_MESSAGES.generic)
    expect(msg).not.toMatch(/constraint|users_pkey/)
    expect(toLoginErrorMessage(null)).toBe(LOGIN_MESSAGES.generic)
    expect(toLoginErrorMessage('boom')).toBe(LOGIN_MESSAGES.generic)
  })
})

describe('sanitizeRedirect', () => {
  it('mengizinkan path internal beserta query dan hash', () => {
    expect(sanitizeRedirect('/tasks')).toBe('/tasks')
    expect(sanitizeRedirect('/tasks/abc?x=1#y')).toBe('/tasks/abc?x=1#y')
  })

  it('menolak open redirect dan nilai tak valid', () => {
    for (const bad of ['https://evil.com', '//evil.com', '/\\evil.com', 'javascript:alert(1)', 'tasks', '', undefined, null, 42, {}]) {
      expect(sanitizeRedirect(bad)).toBe('/')
    }
  })

  it('tidak mengarahkan balik ke /login', () => {
    expect(sanitizeRedirect('/login')).toBe('/')
    expect(sanitizeRedirect('/login?x=1')).toBe('/')
    expect(sanitizeRedirect('/loginx')).toBe('/loginx')
  })
})
