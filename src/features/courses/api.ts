import { formToCourseRow, rowToCourse, type CourseRow } from '@/features/courses/mappers'
import type { CourseFormValues } from '@/features/courses/schema'
import { AppError } from '@/lib/errors'
import { getSupabase } from '@/lib/supabase/client'
import { QUERY_MESSAGES, unwrap } from '@/lib/supabase/query'
import type { Course } from '@/types'

const COLUMNS = 'id, name, code, instructor, color, semester, notes'

export async function fetchCourses(): Promise<Course[]> {
  const rows = unwrap<CourseRow[]>(await getSupabase().from('courses').select(COLUMNS).order('name', { ascending: true }))
  return rows.map(rowToCourse)
}

export async function createCourse(values: CourseFormValues): Promise<Course> {
  const row = unwrap<CourseRow>(await getSupabase().from('courses').insert(formToCourseRow(values)).select(COLUMNS).single())
  return rowToCourse(row)
}

export async function updateCourse(id: string, values: CourseFormValues): Promise<Course> {
  const row = unwrap<CourseRow>(
    await getSupabase().from('courses').update(formToCourseRow(values)).eq('id', id).select(COLUMNS).single(),
  )
  return rowToCourse(row)
}

export interface CourseImpact {
  sessions: number
  tasks: number
}

/** Jumlah jadwal & tugas yang terhubung, dihitung langsung di server untuk dialog konfirmasi hapus. */
export async function fetchCourseImpact(id: string): Promise<CourseImpact> {
  const supabase = getSupabase()
  const [sessions, tasks] = await Promise.all([
    supabase.from('class_sessions').select('id', { count: 'exact', head: true }).eq('course_id', id),
    supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('course_id', id),
  ])
  unwrap<true>({ data: true, error: sessions.error })
  unwrap<true>({ data: true, error: tasks.error })
  return { sessions: sessions.count ?? 0, tasks: tasks.count ?? 0 }
}

/**
 * Hapus mata kuliah. Di database: jadwalnya ikut terhapus (cascade), tugasnya dilepas (course_id → null).
 * Pemanggil WAJIB menampilkan konfirmasi dampak lebih dulu.
 */
export async function deleteCourse(id: string): Promise<void> {
  const rows = unwrap<{ id: string }[]>(await getSupabase().from('courses').delete().eq('id', id).select('id'))
  if (rows.length === 0) throw new AppError(QUERY_MESSAGES.notFound)
}
