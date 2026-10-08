import { addDays, endOfDay, isSameDay, isSameMonth, startOfDay } from 'date-fns'

import { minutesOfDay, timeToMinutes } from '@/lib/utils/dates'
import { isSessionActiveOn } from '@/lib/utils/schedule'
import type { ClassSession, Task } from '@/types'

/** Tugas aktif = belum selesai (prd.md §9.5). */
export function isActiveTask(task: Task) {
  return task.status !== 'done'
}

/** Terlambat hanya jika punya tenggat, sudah lewat, dan belum selesai. */
export function isOverdue(task: Task, now: Date) {
  return isActiveTask(task) && task.dueAt !== null && new Date(task.dueAt).getTime() < now.getTime()
}

export type SessionState = 'finished' | 'ongoing' | 'next' | 'upcoming'

export function sortSessionsByTime<T extends Pick<ClassSession, 'startTime'>>(sessions: T[]) {
  return [...sessions].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
}

/** Sesi yang berlaku pada tanggal tertentu (hari sesuai + dalam periode semester), terurut menurut waktu. */
export function sessionsOnDay(sessions: ClassSession[], date: Date) {
  return sortSessionsByTime(sessions.filter((s) => isSessionActiveOn(s, date)))
}

/** Status tiap sesi hari ini relatif terhadap `now`; `next` hanya untuk satu sesi terdekat. */
export function sessionStates(todays: ClassSession[], now: Date): Map<string, SessionState> {
  const nowMin = minutesOfDay(now)
  const result = new Map<string, SessionState>()
  let nextAssigned = false
  for (const s of todays) {
    if (timeToMinutes(s.endTime) <= nowMin) result.set(s.id, 'finished')
    else if (timeToMinutes(s.startTime) <= nowMin) result.set(s.id, 'ongoing')
    else if (!nextAssigned) {
      result.set(s.id, 'next')
      nextAssigned = true
    } else result.set(s.id, 'upcoming')
  }
  return result
}

/** Kelas yang sedang berlangsung dan kelas berikutnya (bisa ada keduanya sekaligus). */
export function pickHighlights(todays: ClassSession[], states: Map<string, SessionState>) {
  return {
    current: todays.find((s) => states.get(s.id) === 'ongoing'),
    next: todays.find((s) => states.get(s.id) === 'next'),
  }
}

export type DuePeriod = 'all' | 'today' | 'week' | 'month' | 'none'

/**
 * Filter periode tenggat (prd.md §9.5). "week" = hari ini sampai 6 hari ke depan; "month" = bulan berjalan.
 * Tenggat sebelum hari ini tidak masuk "week/month" (tab "Terlambat" yang menampilkannya); batas harinya
 * memakai zona waktu perangkat.
 */
export function matchesDuePeriod(task: Pick<Task, 'dueAt'>, period: DuePeriod, now: Date) {
  if (period === 'all') return true
  if (period === 'none') return task.dueAt === null
  if (task.dueAt === null) return false
  const due = new Date(task.dueAt)
  if (period === 'today') return isSameDay(due, now)
  if (period === 'week') return due >= startOfDay(now) && due <= endOfDay(addDays(now, 6))
  return isSameMonth(due, now) && due.getFullYear() === now.getFullYear()
}

export const priorityRank = { high: 3, medium: 2, low: 1 } as const
