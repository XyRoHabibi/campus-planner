import { addDays, addMonths, addWeeks, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns'

import { isOverdue } from '@/lib/utils/agenda'
import { minutesOfDay, timeToMinutes } from '@/lib/utils/dates'
import { isSessionActiveOn, toISODate } from '@/lib/utils/schedule'
import type { ClassSession, Task } from '@/types'

export type CalendarView = 'month' | 'week' | 'day'
export type WeekStart = 0 | 1

/** Hari awal minggu; pilihan pengguna ditambahkan di Pengaturan (Tahap 10). */
export const DEFAULT_WEEK_START: WeekStart = 1

export type CalendarItem =
  | { kind: 'session'; key: string; sortMinutes: number; session: ClassSession }
  | { kind: 'task'; key: string; sortMinutes: number; task: Task; allDay: boolean }

/** Kelompokkan tugas bertenggat per tanggal LOKAL (`YYYY-MM-DD`). Tugas tanpa tenggat tidak masuk kalender. */
export function indexTasksByDate(tasks: Task[]) {
  const map = new Map<string, Task[]>()
  for (const task of tasks) {
    if (task.dueAt === null) continue
    const key = toISODate(new Date(task.dueAt))
    const list = map.get(key)
    if (list) list.push(task)
    else map.set(key, [task])
  }
  return map
}

/**
 * Agenda satu hari: jadwal kuliah yang berlaku (hari + periode semester) dan tenggat tugas, diurutkan menurut jam.
 * Tenggat tanpa jam ("sepanjang hari") ditaruh di akhir; saat jam sama, kelas mendahului tugas.
 */
export function itemsForDate(date: Date, sessions: ClassSession[], tasksByDate: Map<string, Task[]>): CalendarItem[] {
  const items: CalendarItem[] = []
  for (const session of sessions) {
    if (isSessionActiveOn(session, date)) {
      items.push({ kind: 'session', key: `s-${session.id}`, sortMinutes: timeToMinutes(session.startTime), session })
    }
  }
  for (const task of tasksByDate.get(toISODate(date)) ?? []) {
    const allDay = !task.dueHasTime
    items.push({
      kind: 'task',
      key: `t-${task.id}`,
      sortMinutes: allDay || task.dueAt === null ? 24 * 60 : minutesOfDay(new Date(task.dueAt)),
      task,
      allDay,
    })
  }
  return items.sort((a, b) => a.sortMinutes - b.sortMinutes || (a.kind === b.kind ? 0 : a.kind === 'session' ? -1 : 1))
}

export interface DaySummary {
  sessions: number
  /** Jumlah tugas bertenggat hari itu (termasuk yang selesai). */
  tasks: number
  /** Tugas belum selesai yang sudah lewat tenggat. */
  overdue: number
  /** Tugas yang sudah selesai. */
  done: number
}

export function summarizeItems(items: CalendarItem[], now: Date): DaySummary {
  const s: DaySummary = { sessions: 0, tasks: 0, overdue: 0, done: 0 }
  for (const item of items) {
    if (item.kind === 'session') s.sessions++
    else {
      s.tasks++
      if (item.task.status === 'done') s.done++
      else if (isOverdue(item.task, now)) s.overdue++
    }
  }
  return s
}

/** Penanda tugas pada sel: terlambat > masih terbuka > semua selesai. Selalu dipasangkan ikon & angka, bukan warna saja. */
export function taskMarker(s: DaySummary): 'overdue' | 'open' | 'done' | null {
  if (s.tasks === 0) return null
  if (s.overdue > 0) return 'overdue'
  return s.done === s.tasks ? 'done' : 'open'
}

/** Grid bulan: array minggu (masing-masing 7 tanggal), mencakup hari-hari bulan sebelum/sesudahnya agar baris penuh. */
export function buildMonthGrid(anchor: Date, weekStartsOn: WeekStart = DEFAULT_WEEK_START): Date[][] {
  const start = startOfWeek(startOfMonth(anchor), { weekStartsOn })
  const end = endOfWeek(endOfMonth(anchor), { weekStartsOn })
  const weeks: Date[][] = []
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(cursor, i)))
  }
  return weeks
}

/** Geser tanggal terpilih satu langkah sesuai tampilan (bulan/minggu/hari). */
export function shiftDate(date: Date, view: CalendarView, direction: -1 | 1) {
  if (view === 'month') return addMonths(date, direction)
  if (view === 'week') return addWeeks(date, direction)
  return addDays(date, direction)
}
