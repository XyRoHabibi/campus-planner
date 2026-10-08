import { format } from 'date-fns'

import type { TaskFormValues } from '@/features/tasks/schema'
import type { Priority, Task, TaskStatus } from '@/types'

export interface TaskRow {
  id: string
  course_id: string | null
  title: string
  description: string | null
  due_at: string | null
  due_has_time: boolean
  priority: Priority
  status: TaskStatus
  reminder_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  reminder_enabled: boolean
  /** Hasil embed `task_attachments(count)` yang difilter ke lampiran terunggah. */
  task_attachments?: { count: number }[]
}

export function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    description: row.description ?? undefined,
    dueAt: row.due_at,
    dueHasTime: row.due_has_time,
    priority: row.priority,
    status: row.status,
    reminderAt: row.reminder_at ?? undefined,
    completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    attachmentCount: row.task_attachments?.[0]?.count ?? 0,
    reminderEnabled: row.reminder_enabled ?? true,
  }
}

/**
 * Tanggal + jam (zona waktu perangkat) → timestamp UTC untuk `due_at`.
 * Tanpa jam, tenggat dianggap akhir hari (23:59) dan `due_has_time = false` agar UI tidak menampilkan jam palsu.
 */
export function combineDue(date: string, time: string): { due_at: string | null; due_has_time: boolean } {
  if (date === '') return { due_at: null, due_has_time: false }
  return { due_at: new Date(`${date}T${time || '23:59'}:00`).toISOString(), due_has_time: time !== '' }
}

/** Kebalikan `combineDue`: timestamp → nilai input date/time lokal. */
export function splitDue(dueAt: string | null, hasTime: boolean) {
  if (dueAt === null) return { date: '', time: '' }
  const d = new Date(dueAt)
  return { date: format(d, 'yyyy-MM-dd'), time: hasTime ? format(d, 'HH:mm') : '' }
}

/** Kolom yang boleh ditulis dari form. `user_id`, `completed_at`, dan timestamp diurus server (trigger). */
export function formToTaskRow(values: TaskFormValues) {
  return {
    title: values.title,
    description: values.description === '' ? null : values.description,
    course_id: values.courseId === '' ? null : values.courseId,
    ...combineDue(values.dueDate, values.dueTime),
    priority: values.priority,
    status: values.status,
    reminder_enabled: values.reminderEnabled,
  }
}

export function taskToForm(task: Task): TaskFormValues {
  const { date, time } = splitDue(task.dueAt, task.dueHasTime)
  return {
    title: task.title,
    description: task.description ?? '',
    courseId: task.courseId ?? '',
    dueDate: date,
    dueTime: time,
    priority: task.priority,
    status: task.status,
    reminderEnabled: task.reminderEnabled,
  }
}
