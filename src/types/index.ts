/**
 * Tipe domain aplikasi (prd.md §15). Memakai camelCase di sisi aplikasi;
 * pemetaan dari/ke kolom snake_case Supabase dilakukan di lapisan `api.ts` tiap fitur (Tahap 2+).
 */

export type Priority = 'low' | 'medium' | 'high'
export type TaskStatus = 'todo' | 'in_progress' | 'done'

/** 0 = Minggu … 6 = Sabtu (sama dengan `Date#getDay`). */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface Course {
  id: string
  name: string
  code?: string
  instructor?: string
  /** Hex dari palet mata kuliah. */
  color: string
  semester?: string
  notes?: string
}

export interface ClassSession {
  id: string
  courseId: string
  dayOfWeek: DayOfWeek
  /** Jam dinding lokal, format `HH:mm`. */
  startTime: string
  endTime: string
  room?: string
  /** Dosen khusus sesi ini; jika kosong mewarisi dosen mata kuliah. */
  instructor?: string
  /** Periode semester `YYYY-MM-DD`, opsional. */
  startDate?: string
  endDate?: string
  notes?: string
  /** Pengingat untuk sesi ini (dapat dimatikan per item, prd.md §9.8). */
  reminderEnabled: boolean
}

export interface Task {
  id: string
  courseId: string | null
  title: string
  description?: string
  /** ISO timestamp; `null` = tanpa tenggat. */
  dueAt: string | null
  /** Apakah tenggat memiliki jam eksplisit (jika tidak, hanya tanggal). */
  dueHasTime: boolean
  priority: Priority
  status: TaskStatus
  reminderAt?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
  attachmentCount: number
  /** Pengingat menjelang tenggat untuk tugas ini (dapat dimatikan per item, prd.md §9.8). */
  reminderEnabled: boolean
}

export type AttachmentStatus = 'pending' | 'uploaded' | 'failed' | 'deleting' | 'delete_failed'

export interface Attachment {
  id: string
  taskId: string
  /** Label tampilan dari pengguna — TIDAK dipakai sebagai nama objek penyimpanan. */
  name: string
  storageKey: string
  contentType: string
  sizeBytes: number
  status: AttachmentStatus
  createdAt: string
  uploadedAt?: string
}
