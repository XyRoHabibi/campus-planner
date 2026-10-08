import { UPLOAD_MESSAGES, uploadErrorMessage } from '@/features/attachments/errors'
import { rowToAttachment, type AttachmentRow } from '@/features/attachments/mappers'
import { sanitizeFileName } from '@/features/attachments/validation'
import { AppError } from '@/lib/errors'
import { getSupabase, getSupabaseConfig } from '@/lib/supabase/client'
import { QUERY_MESSAGES, toAppError, unwrap } from '@/lib/supabase/query'
import type { Attachment } from '@/types'

const BUCKET = 'task-attachments'
const COLUMNS = 'id, task_id, original_file_name, storage_key, content_type, size_bytes, upload_status, created_at, uploaded_at'
/** Masa berlaku signed URL untuk preview/unduh (prd.md §14: terbatas, singkat). */
export const SIGNED_URL_SECONDS = 60

export async function fetchAttachments(taskId: string): Promise<Attachment[]> {
  const rows = unwrap<AttachmentRow[]>(
    await getSupabase().from('task_attachments').select(COLUMNS).eq('task_id', taskId).order('created_at', { ascending: true }),
  )
  return rows.map(rowToAttachment)
}

interface RegisterInput {
  id: string
  taskId: string
  name: string
  storageKey: string
  contentType: string
  sizeBytes: number
}

/** Langkah 1: daftarkan metadata sebagai "pending". `user_id` diisi server; batas 5 file ditegakkan trigger. */
export async function registerAttachment(input: RegisterInput): Promise<void> {
  const res = await getSupabase().from('task_attachments').insert({
    id: input.id,
    task_id: input.taskId,
    original_file_name: sanitizeFileName(input.name),
    storage_key: input.storageKey,
    content_type: input.contentType,
    size_bytes: input.sizeBytes,
  })
  if (res.error) {
    // Trigger batas jumlah memakai kode 23514 dan teks khusus.
    if (res.error.code === '23514' && /5 lampiran/i.test(res.error.message)) {
      throw new AppError('Satu tugas maksimal memiliki 5 lampiran.')
    }
    throw toAppError(res.error)
  }
}

export async function accessToken(): Promise<string> {
  const { data } = await getSupabase().auth.getSession()
  if (!data.session) throw new AppError(UPLOAD_MESSAGES.session)
  return data.session.access_token
}

export class UploadAbortedError extends Error {
  constructor() {
    super('Unggahan dibatalkan')
    this.name = 'UploadAbortedError'
  }
}

export interface UploadHandle {
  promise: Promise<void>
  abort: () => void
}

/**
 * Langkah 2: unggah objek lewat XMLHttpRequest agar ada progres per file (fetch tidak punya progres upload).
 * Meniru persis permintaan supabase-js (multipart: cacheControl + file) ke endpoint Storage resmi, dengan token
 * pengguna — bukan service-role. Content-Type objek = tipe kanonis dari ekstensi (bukan `file.type` browser).
 */
export function uploadObject(
  storageKey: string,
  file: Blob,
  mime: string,
  token: string,
  onProgress: (percent: number) => void,
): UploadHandle {
  const { url, anonKey } = getSupabaseConfig()
  const xhr = new XMLHttpRequest()
  const promise = new Promise<void>((resolve, reject) => {
    const path = storageKey.split('/').map(encodeURIComponent).join('/')
    xhr.open('POST', `${url}/storage/v1/object/${BUCKET}/${path}`)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.setRequestHeader('apikey', anonKey)
    xhr.setRequestHeader('x-upsert', 'false') // tidak boleh menimpa objek yang sudah ada

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100))) // 100% hanya setelah server konfirmasi
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new AppError(uploadErrorMessage(xhr.status, xhr.responseText)))
    }
    xhr.onerror = () => reject(new AppError(UPLOAD_MESSAGES.network))
    xhr.ontimeout = () => reject(new AppError(UPLOAD_MESSAGES.network))
    xhr.onabort = () => reject(new UploadAbortedError())

    const body = new FormData()
    body.append('cacheControl', '3600')
    body.append('', file.slice(0, file.size, mime))
    xhr.send(body)
  })
  return { promise, abort: () => xhr.abort() }
}

/** Langkah 3: HANYA setelah objek terunggah. Trigger database memverifikasi objeknya benar-benar ada di Storage. */
export async function markUploaded(id: string): Promise<void> {
  unwrap({ data: true, error: (await getSupabase().from('task_attachments').update({ upload_status: 'uploaded' }).eq('id', id)).error })
}

/** Penandaan gagal bersifat upaya terbaik; kegagalannya sendiri tidak boleh menutupi error upload aslinya. */
export async function markFailed(id: string): Promise<void> {
  try {
    await getSupabase().from('task_attachments').update({ upload_status: 'failed' }).eq('id', id)
  } catch {
    /* diabaikan */
  }
}

/** Retry: failed → pending, tanpa membuat tugas atau baris baru. */
export async function resetToPending(id: string): Promise<void> {
  unwrap({ data: true, error: (await getSupabase().from('task_attachments').update({ upload_status: 'pending' }).eq('id', id)).error })
}

/**
 * Hapus lampiran (prd.md §9.6 langkah 9, §17): tandai "deleting" → hapus objek Storage → hapus baris.
 * Jika objek gagal dihapus, baris DIPERTAHANKAN dengan status "delete_failed" (terlihat & bisa diulang)
 * dan error dilempar — kegagalan tidak disembunyikan.
 */
export async function deleteAttachment(att: Pick<Attachment, 'id' | 'storageKey'>): Promise<void> {
  const supabase = getSupabase()
  unwrap({ data: true, error: (await supabase.from('task_attachments').update({ upload_status: 'deleting' }).eq('id', att.id)).error })

  const removed = await supabase.storage.from(BUCKET).remove([att.storageKey])
  if (removed.error) {
    await supabase.from('task_attachments').update({ upload_status: 'delete_failed' }).eq('id', att.id)
    throw new AppError('File belum bisa dihapus dari penyimpanan. Lampiran tetap tercatat; coba bersihkan lagi sebentar lagi.')
  }

  const rows = unwrap<{ id: string }[]>(
    await supabase.from('task_attachments').delete().eq('id', att.id).eq('upload_status', 'deleting').select('id'),
  )
  if (rows.length === 0) throw new AppError(QUERY_MESSAGES.notFound)
}

/** Signed URL berumur singkat. `download` → header Content-Disposition: attachment dengan nama (sudah disanitasi). */
export async function signedUrl(storageKey: string, downloadName?: string): Promise<string> {
  const { data, error } = await getSupabase()
    .storage.from(BUCKET)
    .createSignedUrl(storageKey, SIGNED_URL_SECONDS, downloadName ? { download: sanitizeFileName(downloadName) } : undefined)
  if (error || !data?.signedUrl) {
    throw new AppError('Tautan file belum bisa dibuat. Periksa koneksi internet, lalu coba lagi.')
  }
  return data.signedUrl
}

export const TEXT_PREVIEW_LIMIT = 100_000

/** Teks untuk pratinjau — ditampilkan sebagai teks biasa (React meng-escape), TIDAK PERNAH sebagai HTML. */
export async function fetchTextPreview(storageKey: string): Promise<{ text: string; truncated: boolean }> {
  const url = await signedUrl(storageKey)
  let res: Response
  try {
    res = await fetch(url)
  } catch {
    throw new AppError('Isi file belum bisa dimuat. Periksa koneksi internet, lalu coba lagi.')
  }
  if (!res.ok) throw new AppError('Isi file belum bisa dimuat. Silakan coba lagi.')
  const text = await res.text()
  return text.length > TEXT_PREVIEW_LIMIT ? { text: text.slice(0, TEXT_PREVIEW_LIMIT), truncated: true } : { text, truncated: false }
}
