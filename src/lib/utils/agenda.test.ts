import { describe, expect, it } from 'vitest'

import { isActiveTask, isOverdue, matchesDuePeriod, pickHighlights, sessionStates, sessionsOnDay } from '@/lib/utils/agenda'
import type { ClassSession, Task } from '@/types'

const NOW = new Date(2026, 9, 5, 10, 0) // Senin 5 Okt 2026 10:00 waktu lokal

const task = (over: Partial<Task>): Task => ({
  id: 't',
  courseId: null,
  title: 'T',
  dueAt: null,
  dueHasTime: false,
  priority: 'medium',
  status: 'todo',
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
  attachmentCount: 0,
  reminderEnabled: true,
  ...over,
})

describe('isOverdue (prd.md §9.5)', () => {
  const past = new Date(2026, 9, 4, 12, 0).toISOString()
  const future = new Date(2026, 9, 6, 12, 0).toISOString()

  it('tugas aktif dengan tenggat lewat = terlambat', () => {
    expect(isOverdue(task({ dueAt: past }), NOW)).toBe(true)
    expect(isOverdue(task({ dueAt: past, status: 'in_progress' }), NOW)).toBe(true)
  })
  it('tugas tanpa tenggat tidak pernah terlambat', () => {
    expect(isOverdue(task({ dueAt: null }), NOW)).toBe(false)
  })
  it('tugas selesai tidak terlambat dan tidak aktif', () => {
    expect(isOverdue(task({ dueAt: past, status: 'done' }), NOW)).toBe(false)
    expect(isActiveTask(task({ status: 'done' }))).toBe(false)
  })
  it('tenggat di masa depan tidak terlambat; tepat saat tenggat belum terlambat', () => {
    expect(isOverdue(task({ dueAt: future }), NOW)).toBe(false)
    expect(isOverdue(task({ dueAt: NOW.toISOString() }), NOW)).toBe(false)
  })
})

describe('jadwal harian', () => {
  const s = (id: string, day: ClassSession['dayOfWeek'], startTime: string, endTime: string): ClassSession => ({
    id,
    courseId: 'c',
    dayOfWeek: day,
    startTime,
    endTime,
    reminderEnabled: true,
  })
  const sessions = [s('b', 1, '13:00', '14:00'), s('a', 1, '08:00', '09:00'), s('c', 1, '10:00', '11:00'), s('x', 2, '08:00', '09:00')]

  it('hanya hari yang sesuai dan terurut menurut jam mulai', () => {
    expect(sessionsOnDay(sessions, NOW).map((x) => x.id)).toEqual(['a', 'c', 'b'])
  })
  it('menentukan selesai / berlangsung / berikutnya', () => {
    const st = sessionStates(sessionsOnDay(sessions, NOW), NOW) // sekarang 10:00
    expect(st.get('a')).toBe('finished')
    expect(st.get('c')).toBe('ongoing') // mulai tepat 10:00
    expect(st.get('b')).toBe('next')
  })
  it('hanya satu sesi bertanda berikutnya', () => {
    const todays = sessionsOnDay([s('p', 1, '11:00', '12:00'), s('q', 1, '13:00', '14:00')], NOW)
    const states = [...sessionStates(todays, NOW).values()]
    expect(states.filter((v) => v === 'next')).toHaveLength(1)
    expect(states).toContain('upcoming')
  })
  it('selesai tepat saat jam selesai', () => {
    expect(sessionStates([s('e', 1, '09:00', '10:00')], NOW).get('e')).toBe('finished')
  })
})

describe('matchesDuePeriod', () => {
  const at = (y: number, m: number, d: number, h = 12) => ({ dueAt: new Date(y, m, d, h).toISOString() })

  it('all tidak menyaring; none hanya tugas tanpa tenggat', () => {
    expect(matchesDuePeriod({ dueAt: null }, 'all', NOW)).toBe(true)
    expect(matchesDuePeriod({ dueAt: null }, 'none', NOW)).toBe(true)
    expect(matchesDuePeriod(at(2026, 9, 5), 'none', NOW)).toBe(false)
  })
  it('tugas tanpa tenggat tidak cocok dengan periode bertanggal', () => {
    for (const p of ['today', 'week', 'month'] as const) expect(matchesDuePeriod({ dueAt: null }, p, NOW)).toBe(false)
  })
  it('today: hanya hari yang sama (termasuk 23:59 hari ini, tidak termasuk besok 00:00)', () => {
    expect(matchesDuePeriod(at(2026, 9, 5, 23), 'today', NOW)).toBe(true)
    expect(matchesDuePeriod(at(2026, 9, 6, 0), 'today', NOW)).toBe(false)
    expect(matchesDuePeriod(at(2026, 9, 4, 23), 'today', NOW)).toBe(false)
  })
  it('week: hari ini s.d. +6 hari; kemarin dan +7 hari tidak', () => {
    expect(matchesDuePeriod(at(2026, 9, 5, 1), 'week', NOW)).toBe(true)
    expect(matchesDuePeriod(at(2026, 9, 11, 23), 'week', NOW)).toBe(true)
    expect(matchesDuePeriod(at(2026, 9, 12, 0), 'week', NOW)).toBe(false)
    expect(matchesDuePeriod(at(2026, 9, 4, 23), 'week', NOW)).toBe(false)
  })
  it('month: bulan dan tahun yang sama saja', () => {
    expect(matchesDuePeriod(at(2026, 9, 31), 'month', NOW)).toBe(true)
    expect(matchesDuePeriod(at(2026, 10, 1), 'month', NOW)).toBe(false)
    expect(matchesDuePeriod(at(2025, 9, 15), 'month', NOW)).toBe(false)
  })
})

describe('pickHighlights', () => {
  const s = (id: string, startTime: string, endTime: string): ClassSession => ({ id, courseId: 'c', dayOfWeek: 1, startTime, endTime, reminderEnabled: true })

  it('saat ada kelas berlangsung, kelas berikutnya tetap ditemukan', () => {
    const todays = [s('a', '08:00', '09:00'), s('b', '09:30', '10:30'), s('c', '13:00', '14:00')]
    const r = pickHighlights(todays, sessionStates(todays, NOW)) // sekarang 10:00
    expect(r.current?.id).toBe('b')
    expect(r.next?.id).toBe('c')
  })
  it('tanpa kelas berlangsung: hanya berikutnya', () => {
    const todays = [s('a', '11:00', '12:00')]
    const r = pickHighlights(todays, sessionStates(todays, NOW))
    expect(r.current).toBeUndefined()
    expect(r.next?.id).toBe('a')
  })
  it('semua kelas selesai: tidak ada keduanya', () => {
    const todays = [s('a', '07:00', '08:00')]
    expect(pickHighlights(todays, sessionStates(todays, NOW))).toEqual({ current: undefined, next: undefined })
  })
})
