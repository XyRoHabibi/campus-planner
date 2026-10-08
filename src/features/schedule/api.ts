import { formToSessionRow, rowToSession, type SessionRow } from '@/features/schedule/mappers'
import type { SessionFormValues } from '@/features/schedule/schema'
import { AppError } from '@/lib/errors'
import { getSupabase } from '@/lib/supabase/client'
import { QUERY_MESSAGES, unwrap } from '@/lib/supabase/query'
import type { ClassSession } from '@/types'

const COLUMNS = 'id, course_id, day_of_week, start_time, end_time, room, instructor, start_date, end_date, notes, reminder_enabled'

export async function fetchSessions(): Promise<ClassSession[]> {
  const rows = unwrap<SessionRow[]>(
    await getSupabase()
      .from('class_sessions')
      .select(COLUMNS)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true }),
  )
  return rows.map(rowToSession)
}

export async function createSession(values: SessionFormValues): Promise<ClassSession> {
  const row = unwrap<SessionRow>(
    await getSupabase().from('class_sessions').insert(formToSessionRow(values)).select(COLUMNS).single(),
  )
  return rowToSession(row)
}

export async function updateSession(id: string, values: SessionFormValues): Promise<ClassSession> {
  const row = unwrap<SessionRow>(
    await getSupabase().from('class_sessions').update(formToSessionRow(values)).eq('id', id).select(COLUMNS).single(),
  )
  return rowToSession(row)
}

export async function deleteSession(id: string): Promise<void> {
  const rows = unwrap<{ id: string }[]>(await getSupabase().from('class_sessions').delete().eq('id', id).select('id'))
  if (rows.length === 0) throw new AppError(QUERY_MESSAGES.notFound)
}
