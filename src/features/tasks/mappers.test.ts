import { describe, expect, it } from 'vitest'

import { rowToSession, toHHmm } from '@/features/schedule/mappers'
import { rowToTask, type TaskRow } from '@/features/tasks/mappers'

describe('rowToSession', () => {
  it('memotong detik dari tipe time PostgreSQL dan memetakan NULL', () => {
    expect(toHHmm('08:00:00')).toBe('08:00')
    const s = rowToSession({
      id: 's1', course_id: 'c1', day_of_week: 3, start_time: '10:00:00', end_time: '11:40:00',
      room: null, instructor: null, start_date: null, end_date: '2026-12-20', notes: null, reminder_enabled: true,
    })
    expect(s).toMatchObject({ courseId: 'c1', dayOfWeek: 3, startTime: '10:00', endTime: '11:40', endDate: '2026-12-20' })
    expect(s.room).toBeUndefined()
  })
})

describe('rowToTask', () => {
  const base: TaskRow = {
    id: 't1', course_id: null, title: 'Tugas', description: null, due_at: null, due_has_time: false,
    priority: 'medium', status: 'todo', reminder_at: null, completed_at: null,
    created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z', reminder_enabled: true,
  }

  it('tugas tanpa tenggat tetap dueAt null (tidak pernah dianggap terlambat)', () => {
    const t = rowToTask(base)
    expect(t.dueAt).toBeNull()
    expect(t.courseId).toBeNull()
    expect(t.attachmentCount).toBe(0)
  })

  it('membaca jumlah lampiran dari embed count', () => {
    expect(rowToTask({ ...base, task_attachments: [{ count: 3 }] }).attachmentCount).toBe(3)
    expect(rowToTask({ ...base, task_attachments: [] }).attachmentCount).toBe(0)
  })
})
