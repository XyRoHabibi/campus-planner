import { describe, expect, it } from 'vitest'

import { combineDue, formToTaskRow, splitDue, taskToForm } from '@/features/tasks/mappers'
import { emptyTaskForm, taskSchema } from '@/features/tasks/schema'
import type { Task } from '@/types'

const valid = { ...emptyTaskForm(), title: 'Laporan' }
const issues = (v: unknown) => {
  const r = taskSchema.safeParse(v)
  return r.success ? [] : r.error.issues.map((i) => `${String(i.path[0])}: ${i.message}`)
}

describe('taskSchema (prd.md §9.5, §12)', () => {
  it('hanya judul yang wajib; semua lain punya nilai awal yang valid', () => {
    expect(taskSchema.safeParse(valid).success).toBe(true)
    expect(valid).toMatchObject({ courseId: '', dueDate: '', dueTime: '', priority: 'medium', status: 'todo' })
  })

  it('judul wajib divalidasi (kosong atau hanya spasi), dan di-trim', () => {
    expect(issues({ ...valid, title: '' })).toEqual(['title: Judul tugas wajib diisi'])
    expect(issues({ ...valid, title: '   ' })).toEqual(['title: Judul tugas wajib diisi'])
    const r = taskSchema.safeParse({ ...valid, title: '  Kuis  ' })
    expect(r.success && r.data.title).toBe('Kuis')
  })

  it('tenggat jam hanya boleh jika tanggal diisi', () => {
    expect(issues({ ...valid, dueTime: '10:00' })).toEqual(['dueTime: Isi tanggal tenggat terlebih dulu'])
    expect(taskSchema.safeParse({ ...valid, dueDate: '2026-10-10', dueTime: '10:00' }).success).toBe(true)
    expect(taskSchema.safeParse({ ...valid, dueDate: '2026-10-10' }).success).toBe(true) // tanpa jam
  })

  it('format tanggal/jam, prioritas, dan status divalidasi', () => {
    expect(taskSchema.safeParse({ ...valid, dueDate: '10/10/2026' }).success).toBe(false)
    expect(taskSchema.safeParse({ ...valid, dueDate: '2026-10-10', dueTime: '25:00' }).success).toBe(false)
    expect(taskSchema.safeParse({ ...valid, priority: 'urgent' }).success).toBe(false)
    expect(taskSchema.safeParse({ ...valid, status: 'archived' }).success).toBe(false)
  })

  it('batas panjang sama dengan constraint database', () => {
    expect(taskSchema.safeParse({ ...valid, title: 'x'.repeat(300) }).success).toBe(true)
    expect(taskSchema.safeParse({ ...valid, title: 'x'.repeat(301) }).success).toBe(false)
    expect(taskSchema.safeParse({ ...valid, description: 'x'.repeat(10001) }).success).toBe(false)
  })
})

describe('combineDue / splitDue', () => {
  it('tanpa tanggal = tanpa tenggat (tidak pernah terlambat)', () => {
    expect(combineDue('', '')).toEqual({ due_at: null, due_has_time: false })
  })

  it('tanggal saja → akhir hari lokal 23:59 dan due_has_time=false', () => {
    const r = combineDue('2026-10-10', '')
    expect(r.due_has_time).toBe(false)
    const d = new Date(r.due_at ?? '')
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2026, 9, 10, 23, 59])
  })

  it('tanggal + jam → jam lokal dikonversi ke UTC dan kembali tanpa bergeser', () => {
    const r = combineDue('2026-10-10', '08:30')
    expect(r.due_has_time).toBe(true)
    expect(r.due_at).toBe(new Date(2026, 9, 10, 8, 30).toISOString())
    expect(splitDue(r.due_at, true)).toEqual({ date: '2026-10-10', time: '08:30' })
  })

  it('splitDue tanpa jam tidak menampilkan jam palsu 23:59', () => {
    const { due_at } = combineDue('2026-10-10', '')
    expect(splitDue(due_at, false)).toEqual({ date: '2026-10-10', time: '' })
    expect(splitDue(null, false)).toEqual({ date: '', time: '' })
  })
})

describe('mapper tugas', () => {
  it('form → baris: NULL untuk opsional kosong; tanpa user_id/completed_at', () => {
    const row = formToTaskRow(valid)
    expect(row).toEqual({
      title: 'Laporan', description: null, course_id: null, due_at: null, due_has_time: false, priority: 'medium', status: 'todo', reminder_enabled: true,
    })
    expect(row).not.toHaveProperty('user_id')
    expect(row).not.toHaveProperty('completed_at')
  })

  it('tugas → form → baris tidak kehilangan data (termasuk status done)', () => {
    const due = new Date(2026, 9, 12, 14, 5).toISOString()
    const task: Task = {
      id: 't', courseId: 'c1', title: 'Esai', description: 'Min. 500 kata', dueAt: due, dueHasTime: true,
      priority: 'high', status: 'done', createdAt: due, updatedAt: due, attachmentCount: 0, reminderEnabled: false,
    }
    expect(taskToForm(task)).toEqual({
      title: 'Esai', description: 'Min. 500 kata', courseId: 'c1', dueDate: '2026-10-12', dueTime: '14:05', priority: 'high', status: 'done', reminderEnabled: false,
    })
    expect(formToTaskRow(taskToForm(task))).toEqual({
      title: 'Esai', description: 'Min. 500 kata', course_id: 'c1', due_at: due, due_has_time: true, priority: 'high', status: 'done', reminder_enabled: false,
    })
  })
})
