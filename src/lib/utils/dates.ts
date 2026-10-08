import {
  addDays,
  differenceInCalendarDays,
  differenceInMinutes,
  format,
  isSameDay,
} from 'date-fns'
import { id } from 'date-fns/locale'

import type { DayOfWeek } from '@/types'

/** Waktu mengikuti zona waktu perangkat (prd.md §9.2). */
export const DAY_NAMES: Record<DayOfWeek, string> = {
  0: 'Minggu',
  1: 'Senin',
  2: 'Selasa',
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu',
}

export function formatLongDate(date: Date) {
  return format(date, 'EEEE, d MMMM yyyy', { locale: id })
}

export function formatShortDate(date: Date) {
  return format(date, 'd MMM yyyy', { locale: id })
}

export function formatClock(date: Date) {
  return format(date, 'HH:mm')
}

/** `HH:mm` → menit sejak tengah malam. */
export function timeToMinutes(time: string) {
  const [h = '0', m = '0'] = time.split(':')
  return Number(h) * 60 + Number(m)
}

export function minutesOfDay(date: Date) {
  return date.getHours() * 60 + date.getMinutes()
}

/** Contoh: "Hari ini, 23:59", "Besok", "Sen, 6 Okt". */
export function formatDue(dueAt: string, hasTime: boolean, now: Date) {
  const due = new Date(dueAt)
  let day: string
  // Relatif terhadap `now` (bukan jam sistem) agar konsisten dan bisa diuji.
  if (isSameDay(due, now)) day = 'Hari ini'
  else if (isSameDay(due, addDays(now, 1))) day = 'Besok'
  else if (isSameDay(due, addDays(now, -1))) day = 'Kemarin'
  else if (Math.abs(differenceInCalendarDays(due, now)) < 7) day = format(due, 'EEEE', { locale: id })
  else day = format(due, 'd MMM yyyy', { locale: id })
  return hasTime ? `${day}, ${formatClock(due)}` : day
}

/** Contoh: "Terlambat 2 hari", "Terlambat 3 jam". */
export function formatOverdue(dueAt: string, now: Date) {
  const due = new Date(dueAt)
  const days = differenceInCalendarDays(now, due)
  if (days >= 1) return `Terlambat ${days} hari`
  const minutes = Math.max(differenceInMinutes(now, due), 1)
  if (minutes >= 60) return `Terlambat ${Math.floor(minutes / 60)} jam`
  return `Terlambat ${minutes} menit`
}

/** Contoh: "dalam 45 menit", "dalam 2 jam 10 menit". */
export function formatCountdown(minutes: number) {
  if (minutes <= 0) return 'sekarang'
  if (minutes < 60) return `dalam ${minutes} menit`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `dalam ${h} jam` : `dalam ${h} jam ${m} menit`
}
