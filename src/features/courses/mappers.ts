import type { CourseFormValues } from '@/features/courses/schema'
import type { Course } from '@/types'

/** Baris tabel `courses` (snake_case) — hanya kolom yang dipakai aplikasi. */
export interface CourseRow {
  id: string
  name: string
  code: string | null
  instructor: string | null
  color: string
  semester: string | null
  notes: string | null
}

export function rowToCourse(row: CourseRow): Course {
  return {
    id: row.id,
    name: row.name,
    code: row.code ?? undefined,
    instructor: row.instructor ?? undefined,
    color: row.color,
    semester: row.semester ?? undefined,
    notes: row.notes ?? undefined,
  }
}

/** Isian opsional yang kosong disimpan sebagai NULL. `user_id` TIDAK dikirim: diisi server dari sesi. */
export function formToCourseRow(values: CourseFormValues) {
  const orNull = (v: string) => (v === '' ? null : v)
  return {
    name: values.name,
    code: orNull(values.code),
    instructor: orNull(values.instructor),
    color: values.color,
    semester: orNull(values.semester),
    notes: orNull(values.notes),
  }
}

export function courseToForm(course: Course): CourseFormValues {
  return {
    name: course.name,
    code: course.code ?? '',
    instructor: course.instructor ?? '',
    color: course.color,
    semester: course.semester ?? '',
    notes: course.notes ?? '',
  }
}
