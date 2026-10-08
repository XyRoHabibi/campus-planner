import { describe, expect, it } from 'vitest'

import { describeSync } from '@/lib/utils/sync'

const at = new Date(2026, 9, 5, 9, 7).getTime() // 09:07 lokal
const base = { online: true, fetching: false, refreshFailed: false, updatedAt: at }

describe('describeSync', () => {
  it('online normal menampilkan waktu pembaruan terakhir', () => {
    expect(describeSync(base)).toEqual({ tone: 'ok', label: 'Online · diperbarui 09:07' })
  })

  it('offline dinyatakan jujur sebagai data terakhir, bukan data terbaru', () => {
    const r = describeSync({ ...base, online: false })
    expect(r.tone).toBe('offline')
    expect(r.label).toBe('Offline · menampilkan data terakhir (dimuat 09:07)')
    expect(describeSync({ ...base, online: false, updatedAt: null }).label).toBe('Offline · data belum bisa dimuat')
  })

  it('offline mengalahkan status lain (tidak mengklaim sedang memperbarui)', () => {
    expect(describeSync({ ...base, online: false, fetching: true, refreshFailed: true }).tone).toBe('offline')
  })

  it('sedang memperbarui', () => {
    expect(describeSync({ ...base, fetching: true })).toEqual({ tone: 'busy', label: 'Memperbarui data…' })
  })

  it('gagal memperbarui tetap menyebut waktu data yang ditampilkan', () => {
    expect(describeSync({ ...base, refreshFailed: true })).toEqual({ tone: 'error', label: 'Gagal memperbarui · data terakhir dimuat 09:07' })
    expect(describeSync({ ...base, refreshFailed: true, updatedAt: null })).toEqual({ tone: 'error', label: 'Gagal memuat data' })
  })

  it('jam satu digit diberi nol di depan', () => {
    expect(describeSync({ ...base, updatedAt: new Date(2026, 0, 1, 0, 5).getTime() }).label).toContain('00:05')
  })
})
