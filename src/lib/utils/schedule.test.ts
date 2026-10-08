import { describe, expect, it } from 'vitest'

import { sessionsOnDay } from '@/lib/utils/agenda'
import { findConflicts, isSessionActiveOn, periodsOverlap, toISODate, weekDates } from '@/lib/utils/schedule'
import type { ClassSession } from '@/types'

const s = (id: string, over: Partial<ClassSession> = {}): ClassSession => ({
  id, courseId: 'c', dayOfWeek: 1, startTime: '08:00', endTime: '10:00', reminderEnabled: true, ...over,
})

describe('findConflicts', () => {
  const existing = [s('a'), s('b', { dayOfWeek: 2 }), s('c', { startTime: '13:00', endTime: '15:00' })]

  it('mendeteksi jam yang tumpang tindih di hari yang sama', () => {
    expect(findConflicts({ dayOfWeek: 1, startTime: '09:00', endTime: '11:00' }, existing).map((x) => x.id)).toEqual(['a'])
    expect(findConflicts({ dayOfWeek: 1, startTime: '07:00', endTime: '08:01' }, existing).map((x) => x.id)).toEqual(['a'])
    expect(findConflicts({ dayOfWeek: 1, startTime: '08:30', endTime: '09:00' }, existing).map((x) => x.id)).toEqual(['a']) // di dalam
    expect(findConflicts({ dayOfWeek: 1, startTime: '07:00', endTime: '16:00' }, existing).map((x) => x.id)).toEqual(['a', 'c']) // membungkus
  })

  it('jam yang hanya menempel bukan bentrok', () => {
    expect(findConflicts({ dayOfWeek: 1, startTime: '10:00', endTime: '11:00' }, existing)).toEqual([])
    expect(findConflicts({ dayOfWeek: 1, startTime: '06:00', endTime: '08:00' }, existing)).toEqual([])
  })

  it('hari berbeda tidak bentrok', () => {
    expect(findConflicts({ dayOfWeek: 3, startTime: '08:00', endTime: '10:00' }, existing)).toEqual([])
  })

  it('mengabaikan sesi yang sedang diubah', () => {
    expect(findConflicts({ dayOfWeek: 1, startTime: '08:00', endTime: '10:00' }, existing, 'a')).toEqual([])
  })

  it('periode semester yang tidak beririsan tidak bentrok', () => {
    const a = s('a', { startDate: '2026-02-01', endDate: '2026-06-30' })
    expect(findConflicts({ dayOfWeek: 1, startTime: '08:00', endTime: '10:00', startDate: '2026-08-01', endDate: '2026-12-20' }, [a])).toEqual([])
    expect(findConflicts({ dayOfWeek: 1, startTime: '08:00', endTime: '10:00', startDate: '2026-06-30', endDate: '2026-12-20' }, [a])).toHaveLength(1) // beririsan 1 hari
  })

  it('tanpa periode = tanpa batas, jadi bentrok dengan periode mana pun', () => {
    const a = s('a', { startDate: '2026-02-01', endDate: '2026-06-30' })
    expect(findConflicts({ dayOfWeek: 1, startTime: '09:00', endTime: '09:30' }, [a])).toHaveLength(1)
  })
})

describe('periodsOverlap', () => {
  it('menangani batas terbuka di salah satu sisi', () => {
    expect(periodsOverlap({}, {})).toBe(true)
    expect(periodsOverlap({ startDate: '2026-09-01' }, { endDate: '2026-08-31' })).toBe(false)
    expect(periodsOverlap({ startDate: '2026-09-01' }, { endDate: '2026-09-01' })).toBe(true)
  })
})

describe('isSessionActiveOn & sessionsOnDay (periode semester)', () => {
  const monday = new Date(2026, 9, 5) // Senin 5 Okt 2026
  it('hari harus sesuai', () => {
    expect(isSessionActiveOn(s('a'), monday)).toBe(true)
    expect(isSessionActiveOn(s('a', { dayOfWeek: 2 }), monday)).toBe(false)
  })
  it('sesi di luar periode tidak tampil; batas awal & akhir termasuk', () => {
    expect(isSessionActiveOn(s('a', { startDate: '2026-10-06' }), monday)).toBe(false)
    expect(isSessionActiveOn(s('a', { endDate: '2026-10-04' }), monday)).toBe(false)
    expect(isSessionActiveOn(s('a', { startDate: '2026-10-05', endDate: '2026-10-05' }), monday)).toBe(true)
  })
  it('sessionsOnDay menerapkan periode', () => {
    const list = [s('in', { startDate: '2026-09-01', endDate: '2026-12-31' }), s('out', { endDate: '2026-06-30' }), s('open')]
    expect(sessionsOnDay(list, monday).map((x) => x.id).sort()).toEqual(['in', 'open'])
  })
})

describe('weekDates & toISODate', () => {
  it('minggu mulai Senin, 7 hari berurutan', () => {
    const days = weekDates(new Date(2026, 9, 4)) // Minggu 4 Okt → minggu Senin 28 Sep
    expect(days.map(toISODate)).toEqual(['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'])
    expect(days.map((d) => d.getDay())).toEqual([1, 2, 3, 4, 5, 6, 0])
  })
  it('mendukung minggu mulai Minggu', () => {
    expect(weekDates(new Date(2026, 9, 7), 0).map((d) => d.getDay())).toEqual([0, 1, 2, 3, 4, 5, 6])
  })
  it('toISODate memakai zona waktu lokal, bukan UTC', () => {
    expect(toISODate(new Date(2026, 0, 1, 0, 30))).toBe('2026-01-01')
    expect(toISODate(new Date(2026, 11, 31, 23, 30))).toBe('2026-12-31')
  })
})
