import { addDays, format, startOfWeek } from 'date-fns'

import { timeToMinutes } from '@/lib/utils/dates'
import type { ClassSession } from '@/types'

/** `YYYY-MM-DD` dalam zona waktu perangkat (bukan UTC), cocok dengan kolom `date` di database. */
export const toISODate = (date: Date) => format(date, 'yyyy-MM-dd')

type Period = Pick<ClassSession, 'startDate' | 'endDate'>
type Slot = Pick<ClassSession, 'dayOfWeek' | 'startTime' | 'endTime'> & Period

/** Sesi berlaku pada tanggal tertentu: hari sesuai dan tanggal berada dalam periode semester (jika diisi). */
export function isSessionActiveOn(session: Pick<ClassSession, 'dayOfWeek'> & Period, date: Date) {
  if (session.dayOfWeek !== date.getDay()) return false
  const iso = toISODate(date)
  if (session.startDate && iso < session.startDate) return false
  if (session.endDate && iso > session.endDate) return false
  return true
}

/** Periode kosong = tanpa batas. Perbandingan string ISO aman karena formatnya terurut. */
export function periodsOverlap(a: Period, b: Period) {
  return (a.startDate ?? '0000-00-00') <= (b.endDate ?? '9999-99-99') && (b.startDate ?? '0000-00-00') <= (a.endDate ?? '9999-99-99')
}

/**
 * Sesi yang bertabrakan dengan `candidate`: hari sama, jam saling tumpang tindih, dan periode beririsan.
 * Jam yang saling menempel (selesai 09:00, mulai 09:00) bukan bentrok.
 */
export function findConflicts(candidate: Slot, existing: ClassSession[], excludeId?: string) {
  const start = timeToMinutes(candidate.startTime)
  const end = timeToMinutes(candidate.endTime)
  return existing.filter(
    (s) =>
      s.id !== excludeId &&
      s.dayOfWeek === candidate.dayOfWeek &&
      start < timeToMinutes(s.endTime) &&
      timeToMinutes(s.startTime) < end &&
      periodsOverlap(candidate, s),
  )
}

/** Tujuh tanggal dalam minggu yang memuat `anchor` (default mulai Senin; Pengaturan hari awal minggu di Tahap 10). */
export function weekDates(anchor: Date, weekStartsOn: 0 | 1 = 1) {
  const start = startOfWeek(anchor, { weekStartsOn })
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}
