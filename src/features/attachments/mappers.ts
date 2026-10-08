import type { Attachment, AttachmentStatus } from '@/types'

export interface AttachmentRow {
  id: string
  task_id: string
  original_file_name: string
  storage_key: string
  content_type: string
  size_bytes: number
  upload_status: AttachmentStatus
  created_at: string
  uploaded_at: string | null
}

export function rowToAttachment(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    taskId: row.task_id,
    name: row.original_file_name,
    storageKey: row.storage_key,
    contentType: row.content_type,
    sizeBytes: Number(row.size_bytes), // bigint dari PostgREST bisa berupa string
    status: row.upload_status,
    createdAt: row.created_at,
    uploadedAt: row.uploaded_at ?? undefined,
  }
}
