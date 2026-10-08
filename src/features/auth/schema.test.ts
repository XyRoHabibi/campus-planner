import { describe, expect, it } from 'vitest'

import { loginSchema } from '@/features/auth/schema'

describe('loginSchema', () => {
  it('menerima email valid (di-trim) dan password apa pun yang tidak kosong', () => {
    const r = loginSchema.safeParse({ email: '  a@b.co  ', password: ' x ' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data).toEqual({ email: 'a@b.co', password: ' x ' }) // password tidak di-trim
  })

  it('memberi pesan Indonesia per field', () => {
    const empty = loginSchema.safeParse({ email: '', password: '' })
    expect(empty.success).toBe(false)
    if (!empty.success) {
      const byField = Object.fromEntries(empty.error.issues.map((i) => [String(i.path[0]), i.message]))
      expect(byField).toEqual({ email: 'Email wajib diisi', password: 'Password wajib diisi' })
    }
    const bad = loginSchema.safeParse({ email: 'bukan-email', password: 'x' })
    expect(bad.success).toBe(false)
    if (!bad.success) expect(bad.error.issues[0]?.message).toBe('Format email tidak valid')
  })
})
