import { describe, expect, it } from 'vitest'

import { buildMonthGrid, indexTasksByDate, itemsForDate, shiftDate, summarizeItems, taskMarker } from '@/lib/utils/calendar'
import { toISODate } from '@/lib/utils/schedule'
import type { ClassSession, Task } from '@/types'

const NOW = new Date(2026, 9, 5, 10, 0) // Senin 5 Okt 2026 10:00 lokal

const task = (id: string, due: Date | null, over: Partial<Task> = {}): Task => ({
  id, courseId: null, title: id, dueAt: due ? due.toISOString() : null, dueHasTime: true, priority: 'medium', status: 'todo',
  createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(), attachmentCount: 0, reminderEnabled: true, ...over,
})
const sess = (id: string, day: ClassSession['dayOfWeek'], startTime: string, endTime: string, over: Partial<ClassSession> = {}): ClassSession => ({
  id, courseId: 'c', dayOfWeek: day, startTime, endTime, reminderEnabled: true, ...over,
})

describe('buildMonthGrid', () => {
  it('Oktober 2026 (mulai Kamis), minggu mulai Senin: 5 baris × 7, dari 28 Sep sampai 1 Nov', () => {
    const weeks = buildMonthGrid(new Date(2026, 9, 15))
    expect(weeks).toHaveLength(5)
    expect(weeks.every((w) => w.length === 7)).toBe(true)
    expect(toISODate(weeks[0]![0]!)).toBe('2026-09-28')
    expect(toISODate(weeks[4]![6]!)).toBe('2026-11-01')
    expect(weeks.flat().map((d) => d.getDay()).slice(0, 7)).toEqual([1, 2, 3, 4, 5, 6, 0])
  })

  it('minggu mulai Minggu menggeser grid; bulan 6 baris terdeteksi (Agustus 2026)', () => {
    const sun = buildMonthGrid(new Date(2026, 9, 15), 0)
    expect(toISODate(sun[0]![0]!)).toBe('2026-09-27')
    expect(buildMonthGrid(new Date(2026, 7, 10))).toHaveLength(6) // 1 Agu = Sabtu, 31 Agu = Senin
  })

  it('Februari 2027 pas 4 baris (1 Feb = Senin, 28 hari)', () => {
    expect(buildMonthGrid(new Date(2027, 1, 10))).toHaveLength(4)
  })

  it('setiap tanggal berurutan tanpa celah atau duplikat', () => {
    const days = buildMonthGrid(new Date(2026, 11, 1)).flat().map(toISODate)
    expect(new Set(days).size).toBe(days.length)
    for (let i = 1; i < days.length; i++) expect(days[i]! > days[i - 1]!).toBe(true)
  })
})

describe('indexTasksByDate — tanggal lokal, bukan UTC', () => {
  it('tenggat 23:59 lokal tetap di tanggalnya; tanpa tenggat dilewati', () => {
    const map = indexTasksByDate([task('a', new Date(2026, 9, 5, 23, 59)), task('b', new Date(2026, 9, 6, 0, 0)), task('c', null)])
    expect(map.get('2026-10-05')?.map((t) => t.id)).toEqual(['a'])
    expect(map.get('2026-10-06')?.map((t) => t.id)).toEqual(['b'])
    expect([...map.values()].flat().some((t) => t.id === 'c')).toBe(false)
  })
})

describe('itemsForDate', () => {
  const sessions = [sess('late', 1, '13:00', '14:00'), sess('early', 1, '08:00', '09:00'), sess('tue', 2, '08:00', '09:00')]
  const byDate = indexTasksByDate([
    task('due-noon', new Date(2026, 9, 5, 12, 0)),
    task('due-allday', new Date(2026, 9, 5, 23, 59), { dueHasTime: false }),
    task('due-at-8', new Date(2026, 9, 5, 8, 0)),
  ])

  it('menggabungkan jadwal & tenggat dan mengurutkan menurut jam; "sepanjang hari" di akhir', () => {
    const keys = itemsForDate(NOW, sessions, byDate).map((i) => i.key)
    expect(keys).toEqual(['s-early', 't-due-at-8', 't-due-noon', 's-late', 't-due-allday'])
  })

  it('jam sama: kelas mendahului tugas', () => {
    const items = itemsForDate(NOW, [sess('s', 1, '08:00', '09:00')], indexTasksByDate([task('t', new Date(2026, 9, 5, 8, 0))]))
    expect(items.map((i) => i.key)).toEqual(['s-s', 't-t'])
  })

  it('hanya jadwal yang berlaku pada tanggal itu (hari + periode semester)', () => {
    const limited = [sess('old', 1, '08:00', '09:00', { endDate: '2026-06-30' }), sess('ok', 1, '10:00', '11:00', { startDate: '2026-09-01' })]
    expect(itemsForDate(NOW, limited, new Map()).map((i) => i.key)).toEqual(['s-ok'])
    expect(itemsForDate(new Date(2026, 9, 6), sessions, new Map()).map((i) => i.key)).toEqual(['s-tue'])
  })

  it('hari tanpa agenda → kosong', () => {
    expect(itemsForDate(new Date(2026, 9, 10), sessions, byDate)).toEqual([])
  })
})

describe('summarizeItems & taskMarker', () => {
  const day = new Date(2026, 9, 5)
  const make = (tasks: Task[], sessions: ClassSession[] = []) => itemsForDate(day, sessions, indexTasksByDate(tasks))

  it('menghitung kelas, tugas, terlambat, dan selesai', () => {
    const items = make(
      [
        task('overdue', new Date(2026, 9, 5, 8, 0)), // lewat dari 10:00
        task('open', new Date(2026, 9, 5, 15, 0)),
        task('done', new Date(2026, 9, 5, 7, 0), { status: 'done' }), // selesai tidak pernah terlambat
      ],
      [sess('s1', 1, '08:00', '09:00'), sess('s2', 1, '10:00', '11:00')],
    )
    expect(summarizeItems(items, NOW)).toEqual({ sessions: 2, tasks: 3, overdue: 1, done: 1 })
  })

  it('prioritas penanda: terlambat > terbuka > selesai > tidak ada', () => {
    expect(taskMarker({ sessions: 0, tasks: 2, overdue: 1, done: 0 })).toBe('overdue')
    expect(taskMarker({ sessions: 0, tasks: 2, overdue: 0, done: 1 })).toBe('open')
    expect(taskMarker({ sessions: 0, tasks: 2, overdue: 0, done: 2 })).toBe('done')
    expect(taskMarker({ sessions: 3, tasks: 0, overdue: 0, done: 0 })).toBeNull()
  })

  it('tugas masa depan tidak terlambat', () => {
    const s = summarizeItems(make([task('later', new Date(2026, 9, 5, 18, 0))]), NOW)
    expect(s.overdue).toBe(0)
  })
})

describe('shiftDate', () => {
  it('menggeser sesuai tampilan; bulan tidak "melompat" di akhir bulan', () => {
    const d = new Date(2026, 9, 31)
    expect(toISODate(shiftDate(d, 'day', 1))).toBe('2026-11-01')
    expect(toISODate(shiftDate(d, 'week', -1))).toBe('2026-10-24')
    expect(toISODate(shiftDate(d, 'month', 1))).toBe('2026-11-30') // 31 Okt + 1 bulan → 30 Nov (bukan 1 Des)
    expect(toISODate(shiftDate(new Date(2026, 0, 31), 'month', 1))).toBe('2026-02-28')
  })
})
