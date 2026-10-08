import { formToTaskRow, rowToTask, type TaskRow } from '@/features/tasks/mappers'
import type { TaskFormValues } from '@/features/tasks/schema'
import { AppError } from '@/lib/errors'
import { getSupabase } from '@/lib/supabase/client'
import { QUERY_MESSAGES, unwrap } from '@/lib/supabase/query'
import type { Task, TaskStatus } from '@/types'

const COLUMNS =
  'id, course_id, title, description, due_at, due_has_time, priority, status, reminder_at, completed_at, created_at, updated_at, reminder_enabled, task_attachments(count)'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const BUCKET = 'task-attachments'

/** Jumlah lampiran hanya menghitung yang sudah terkonfirmasi tersimpan (`uploaded`). */
export async function fetchTasks(): Promise<Task[]> {
  const rows = unwrap<TaskRow[]>(
    await getSupabase()
      .from('tasks')
      .select(COLUMNS)
      .eq('task_attachments.upload_status', 'uploaded')
      .order('created_at', { ascending: false }),
  )
  return rows.map(rowToTask)
}

/** Mengembalikan `null` jika tugas tidak ada / bukan milik pengguna (bukan error jaringan). */
export async function fetchTask(id: string): Promise<Task | null> {
  if (!UUID.test(id)) return null // tautan keliru: jangan kirim ke database
  const row = unwrap<TaskRow | null>(
    await getSupabase()
      .from('tasks')
      .select(COLUMNS)
      .eq('id', id)
      .eq('task_attachments.upload_status', 'uploaded')
      .maybeSingle(),
  )
  return row ? rowToTask(row) : null
}

// `completed_at` diatur trigger database berdasarkan status; UI tidak pernah menulisnya.
export async function createTask(values: TaskFormValues): Promise<Task> {
  const row = unwrap<TaskRow>(await getSupabase().from('tasks').insert(formToTaskRow(values)).select(COLUMNS).single())
  return rowToTask(row)
}

export async function updateTask(id: string, values: TaskFormValues): Promise<Task> {
  const row = unwrap<TaskRow>(
    await getSupabase().from('tasks').update(formToTaskRow(values)).eq('id', id).select(COLUMNS).single(),
  )
  return rowToTask(row)
}

/** Tandai selesai / buka kembali. Hanya mengubah status; tidak ada pembaruan optimistik (menunggu konfirmasi server). */
export async function setTaskStatus(id: string, status: TaskStatus): Promise<Task> {
  const row = unwrap<TaskRow>(
    await getSupabase().from('tasks').update({ status }).eq('id', id).select(COLUMNS).single(),
  )
  return rowToTask(row)
}

/** Semua lampiran tugas (apa pun statusnya) — dasar peringatan di dialog hapus. */
export async function fetchTaskAttachmentTotal(taskId: string): Promise<number> {
  const res = await getSupabase().from('task_attachments').select('id', { count: 'exact', head: true }).eq('task_id', taskId)
  unwrap<true>({ data: true, error: res.error })
  return res.count ?? 0
}

/**
 * Hapus tugas beserta file lampirannya. Urutan sengaja begini (prd.md §17):
 *  1. tandai semua lampiran "deleting" (izin policy Storage untuk hapus objek),
 *  2. hapus objek di Storage,
 *  3. HANYA jika (2) berhasil, hapus tugas (baris lampiran ikut terhapus oleh cascade).
 * Jika (2) gagal, tugas TIDAK dihapus; lampiran ditandai "delete_failed" agar kegagalan terlihat dan bisa diulang,
 * dan tidak ada file yatim yang tersembunyi.
 */
export async function deleteTask(id: string): Promise<void> {
  const supabase = getSupabase()
  const attachments = unwrap<{ id: string; storage_key: string }[]>(
    await supabase.from('task_attachments').select('id, storage_key').eq('task_id', id),
  )

  if (attachments.length > 0) {
    const ids = attachments.map((a) => a.id)
    const marked = await supabase.from('task_attachments').update({ upload_status: 'deleting' }).in('id', ids)
    unwrap<true>({ data: true, error: marked.error })

    const removed = await supabase.storage.from(BUCKET).remove(attachments.map((a) => a.storage_key))
    if (removed.error) {
      await supabase.from('task_attachments').update({ upload_status: 'delete_failed' }).in('id', ids)
      throw new AppError('File lampiran belum bisa dihapus dari penyimpanan, jadi tugas belum dihapus. Coba lagi sebentar lagi.')
    }
  }

  const rows = unwrap<{ id: string }[]>(await supabase.from('tasks').delete().eq('id', id).select('id'))
  if (rows.length === 0) throw new AppError(QUERY_MESSAGES.notFound)
}
