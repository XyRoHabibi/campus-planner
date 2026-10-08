import { describe, expect, it } from 'vitest'

import { computeReminders, isFresh } from '@/lib/utils/reminders'
import type { ClassSession, Task } from '@/types'

const courses = new Map([['c', 'Basis Data']])
const settings = { remindersEnabled: true, classLeadMinutes: 15, taskLeadMinutes: 60 }
const at = (h: number, m = 0, day = 5) => new Date(2026, 9, day, h, m) // Senin 5 Okt 2026

const sess = (over: Partial<ClassSession> = {}): ClassSession => ({
  id: 's1', courseId: 'c', dayOfWeek: 1, startTime: '09:00', endTime: '10:40', reminderEnabled: true, ...over,
})
const task = (over: Partial<Task> = {}): Task => ({
  id: 't1', courseId: null, title: 'Kuis', dueAt: at(12).toISOString(), dueHasTime: true, priority: 'high', status: 'todo',
  createdAt: at(8).toISOString(), updatedAt: at(8).toISOString(), attachmentCount: 0, reminderEnabled: true, ...over,
})
const run = (now: Date, s: ClassSession[] = [], t: Task[] = [], cfg = settings) => computeReminders(now, cfg, s, t, courses)

describe('pengingat kelas', () => {
  it('aktif tepat dalam jeda sebelum mulai, tidak sebelum dan tidak setelah mulai', () => {
    expect(run(at(8, 44), [sess()])).toHaveLength(0)
    expect(run(at(8, 45), [sess()])).toHaveLength(1) // tepat 15 menit sebelum
    expect(run(at(8, 59), [sess()])).toHaveLength(1)
    expect(run(at(9, 0), [sess()])).toHaveLength(0) // sudah mulai
    expect(run(at(9, 30), [sess()])).toHaveLength(0)
  })

  it('isi pengingat: nama mata kuliah, jam, sisa waktu, ruangan (atau "belum ditentukan")', () => {
    const [r] = run(at(8, 50), [sess({ room: 'Lab 3.2' })])
    expect(r).toMatchObject({ kind: 'class', title: 'Basis Data mulai pukul 09:00', body: 'dalam 10 menit · Lab 3.2', href: '/schedule' })
    expect(run(at(8, 50), [sess()])[0]?.body).toBe('dalam 10 menit · Ruangan belum ditentukan')
  })

  it('dimatikan per item, di luar periode semester, atau hari lain → tidak muncul', () => {
    expect(run(at(8, 50), [sess({ reminderEnabled: false })])).toHaveLength(0)
    expect(run(at(8, 50), [sess({ endDate: '2026-06-30' })])).toHaveLength(0)
    expect(run(at(8, 50), [sess({ dayOfWeek: 2 })])).toHaveLength(0)
  })

  it('jeda mengikuti pengaturan', () => {
    expect(run(at(8, 25), [sess()], [], { ...settings, classLeadMinutes: 60 })).toHaveLength(1)
    expect(run(at(8, 25), [sess()], [], { ...settings, classLeadMinutes: 5 })).toHaveLength(0)
  })

  it('kunci stabil per tanggal: kelas minggu depan punya kunci berbeda (muncul lagi)', () => {
    const a = run(at(8, 50), [sess()])[0]?.key
    const b = run(at(8, 50, 12), [sess()])[0]?.key
    expect(a).toBe('s:s1:2026-10-05')
    expect(b).not.toBe(a)
  })
})

describe('pengingat tugas', () => {
  it('aktif dalam jeda sebelum tenggat berjam, berhenti saat tenggat lewat (terlambat bukan pengingat)', () => {
    expect(run(at(10, 59), [], [task()])).toHaveLength(0)
    expect(run(at(11, 0), [], [task()])).toHaveLength(1)
    expect(run(at(11, 59), [], [task()])).toHaveLength(1)
    expect(run(at(12, 0), [], [task()])).toHaveLength(0)
  })

  it('isi pengingat: judul, tenggat, tautan ke detail', () => {
    expect(run(at(11, 30), [], [task()])[0]).toMatchObject({ kind: 'task', title: 'Kuis', body: 'Tenggat hari ini, 12:00', href: '/tasks/t1' })
  })

  it('tugas selesai, dimatikan per item, atau tanpa tenggat → tidak ada pengingat', () => {
    expect(run(at(11, 30), [], [task({ status: 'done' })])).toHaveLength(0)
    expect(run(at(11, 30), [], [task({ reminderEnabled: false })])).toHaveLength(0)
    expect(run(at(11, 30), [], [task({ dueAt: null })])).toHaveLength(0)
  })

  it('tenggat tanpa jam: dihitung dari 09.00 hari itu (jeda 1 hari = mulai 09.00 hari sebelumnya) hingga 23.59', () => {
    const dateOnly = task({ dueAt: at(23, 59).toISOString(), dueHasTime: false })
    const day = { ...settings, taskLeadMinutes: 1440 }
    expect(run(at(8, 59, 4), [], [dateOnly], day)).toHaveLength(0) // sebelum 09.00 hari sebelumnya
    expect(run(at(9, 0, 4), [], [dateOnly], day)).toHaveLength(1)
    expect(run(at(15, 0, 5), [], [dateOnly], day)).toHaveLength(1) // sepanjang hari tenggat tetap terlihat
    expect(run(at(23, 59, 5), [], [dateOnly], day)).toHaveLength(0) // lewat → terlambat
  })

  it('kunci tugas ikut berubah jika tenggat diubah (pengingat baru)', () => {
    const k1 = run(at(11, 30), [], [task()])[0]?.key
    const k2 = run(at(11, 30), [], [task({ dueAt: at(12, 15).toISOString() })])[0]?.key
    expect(k1).not.toBe(k2)
  })
})

describe('umum', () => {
  it('pengingat dimatikan di pengaturan → kosong', () => {
    expect(run(at(8, 50), [sess()], [task({ dueAt: at(9, 30).toISOString() })], { ...settings, remindersEnabled: false })).toEqual([])
  })

  it('kelas dan tugas diurutkan menurut waktu kejadian', () => {
    const list = run(at(8, 50), [sess()], [task({ id: 't-early', dueAt: at(8, 55).toISOString() })], { ...settings, taskLeadMinutes: 180 })
    expect(list.map((r) => r.kind)).toEqual(['task', 'class'])
  })
})

describe('isFresh', () => {
  const r = { at: at(8, 45) }
  it('hanya pengingat yang baru aktif (≤ 15 menit) yang memunculkan toast/notifikasi', () => {
    expect(isFresh(r, at(8, 45))).toBe(true)
    expect(isFresh(r, at(8, 59))).toBe(true)
    expect(isFresh(r, at(9, 0))).toBe(true) // tepat 15 menit
    expect(isFresh(r, at(9, 1))).toBe(false)
    expect(isFresh(r, at(8, 44))).toBe(false) // belum aktif
  })
})

describe('formatDue relatif terhadap `now` (bukan jam sistem)', () => {
  it('hari ini / besok / kemarin dihitung dari now yang diberikan', async () => {
    const { formatDue } = await import('@/lib/utils/dates')
    const now = new Date(2026, 9, 5, 10, 0)
    expect(formatDue(new Date(2026, 9, 5, 12, 0).toISOString(), true, now)).toBe('Hari ini, 12:00')
    expect(formatDue(new Date(2026, 9, 6, 8, 30).toISOString(), true, now)).toBe('Besok, 08:30')
    expect(formatDue(new Date(2026, 9, 4, 8, 30).toISOString(), true, now)).toBe('Kemarin, 08:30')
    expect(formatDue(new Date(2026, 9, 5, 23, 59).toISOString(), false, now)).toBe('Hari ini')
  })
})
