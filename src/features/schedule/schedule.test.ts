import { describe, expect, it } from 'vitest'

import { formToSessionRow, sessionToForm } from '@/features/schedule/mappers'
import { emptySessionForm, sessionSchema } from '@/features/schedule/schema'
import type { ClassSession } from '@/types'

const valid = { ...emptySessionForm('c1', '2'), startTime: '08:00', endTime: '09:40' }
const issues = (v: unknown) => {
  const r = sessionSchema.safeParse(v)
  return r.success ? [] : r.error.issues.map((i) => `${String(i.path[0])}: ${i.message}`)
}

describe('sessionSchema (prd.md §9.4 / §12)', () => {
  it('menerima isian minimal', () => {
    expect(sessionSchema.safeParse(valid).success).toBe(true)
  })

  it('menolak jam selesai yang tidak lebih lambat dari jam mulai', () => {
    expect(issues({ ...valid, startTime: '09:00', endTime: '09:00' })).toEqual(['endTime: Jam selesai harus setelah jam mulai'])
    expect(issues({ ...valid, startTime: '10:00', endTime: '09:59' })).toEqual(['endTime: Jam selesai harus setelah jam mulai'])
    expect(sessionSchema.safeParse({ ...valid, startTime: '09:00', endTime: '09:01' }).success).toBe(true)
  })

  it('jam, mata kuliah, dan hari wajib', () => {
    expect(issues({ ...valid, startTime: '' })).toContain('startTime: Jam mulai wajib diisi')
    expect(issues({ ...valid, endTime: '' })).toContain('endTime: Jam selesai wajib diisi')
    expect(issues({ ...valid, courseId: '' })).toContain('courseId: Pilih mata kuliah')
    expect(sessionSchema.safeParse({ ...valid, dayOfWeek: '7' }).success).toBe(false)
  })

  it('format jam harus HH:mm 24 jam', () => {
    for (const bad of ['8:00', '24:00', '12:60', '12.30', 'abc']) {
      expect(sessionSchema.safeParse({ ...valid, startTime: bad }).success).toBe(false)
    }
  })

  it('tanggal akhir tidak boleh sebelum tanggal mulai; sama hari diperbolehkan; keduanya opsional', () => {
    expect(issues({ ...valid, startDate: '2026-09-01', endDate: '2026-08-31' })).toEqual(['endDate: Tanggal akhir tidak boleh sebelum tanggal mulai'])
    expect(sessionSchema.safeParse({ ...valid, startDate: '2026-09-01', endDate: '2026-09-01' }).success).toBe(true)
    expect(sessionSchema.safeParse({ ...valid, startDate: '2026-09-01' }).success).toBe(true)
    expect(sessionSchema.safeParse({ ...valid, endDate: '2026-12-20' }).success).toBe(true)
    expect(sessionSchema.safeParse({ ...valid, startDate: '01/09/2026' }).success).toBe(false)
  })

  it('batas panjang sama dengan constraint database', () => {
    expect(sessionSchema.safeParse({ ...valid, room: 'x'.repeat(201) }).success).toBe(false)
    expect(sessionSchema.safeParse({ ...valid, instructor: 'x'.repeat(201) }).success).toBe(false)
    expect(sessionSchema.safeParse({ ...valid, notes: 'x'.repeat(5001) }).success).toBe(false)
  })
})

describe('mapper sesi', () => {
  it('form → baris: angka untuk hari, NULL untuk opsional kosong, tanpa user_id', () => {
    const row = formToSessionRow(valid)
    expect(row).toEqual({
      course_id: 'c1', day_of_week: 2, start_time: '08:00', end_time: '09:40',
      room: null, instructor: null, start_date: null, end_date: null, notes: null, reminder_enabled: true,
    })
    expect(row).not.toHaveProperty('user_id')
  })

  it('hari Minggu (0) tidak hilang menjadi falsy', () => {
    expect(formToSessionRow({ ...valid, dayOfWeek: '0' }).day_of_week).toBe(0)
    const s: ClassSession = { id: 's', courseId: 'c1', dayOfWeek: 0, startTime: '10:00', endTime: '11:00', reminderEnabled: true }
    expect(sessionToForm(s).dayOfWeek).toBe('0')
  })

  it('sesi → form → baris tidak kehilangan data', () => {
    const s: ClassSession = {
      id: 's', courseId: 'c1', dayOfWeek: 3, startTime: '10:00', endTime: '11:40', room: 'B-301',
      instructor: 'Dr. X', startDate: '2026-09-01', endDate: '2026-12-20', notes: 'Bawa laptop', reminderEnabled: false,
    }
    expect(formToSessionRow(sessionToForm(s))).toEqual({
      course_id: 'c1', day_of_week: 3, start_time: '10:00', end_time: '11:40', room: 'B-301',
      instructor: 'Dr. X', start_date: '2026-09-01', end_date: '2026-12-20', notes: 'Bawa laptop', reminder_enabled: false,
    })
  })
})
