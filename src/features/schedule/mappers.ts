import type { SessionFormValues } from '@/features/schedule/schema'
import type { ClassSession, DayOfWeek } from '@/types'

export interface SessionRow {
  id: string
  course_id: string
  day_of_week: number
  start_time: string // 'HH:MM:SS' dari tipe `time` PostgreSQL
  end_time: string
  room: string | null
  instructor: string | null
  start_date: string | null
  end_date: string | null
  notes: string | null
  reminder_enabled: boolean
}

/** `08:00:00` → `08:00`. */
export const toHHmm = (time: string) => time.slice(0, 5)

export function rowToSession(row: SessionRow): ClassSession {
  return {
    id: row.id,
    courseId: row.course_id,
    dayOfWeek: row.day_of_week as DayOfWeek,
    startTime: toHHmm(row.start_time),
    endTime: toHHmm(row.end_time),
    room: row.room ?? undefined,
    instructor: row.instructor ?? undefined,
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    notes: row.notes ?? undefined,
    reminderEnabled: row.reminder_enabled ?? true,
  }
}

/** Isian opsional kosong → NULL. `user_id` TIDAK dikirim: diisi server dari sesi. */
export function formToSessionRow(values: SessionFormValues) {
  const orNull = (v: string) => (v === '' ? null : v)
  return {
    course_id: values.courseId,
    day_of_week: Number(values.dayOfWeek),
    start_time: values.startTime,
    end_time: values.endTime,
    room: orNull(values.room),
    instructor: orNull(values.instructor),
    start_date: orNull(values.startDate),
    end_date: orNull(values.endDate),
    notes: orNull(values.notes),
    reminder_enabled: values.reminderEnabled,
  }
}

export function sessionToForm(session: ClassSession): SessionFormValues {
  return {
    courseId: session.courseId,
    dayOfWeek: String(session.dayOfWeek) as SessionFormValues['dayOfWeek'],
    startTime: session.startTime,
    endTime: session.endTime,
    room: session.room ?? '',
    instructor: session.instructor ?? '',
    startDate: session.startDate ?? '',
    endDate: session.endDate ?? '',
    notes: session.notes ?? '',
    reminderEnabled: session.reminderEnabled,
  }
}
