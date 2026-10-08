import { z } from 'zod'

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Nilai form berupa string (select/date/time native). Batas panjang sama dengan CHECK di database.
 * `courseId` kosong = tanpa mata kuliah. Tenggat waktu hanya boleh diisi bila tanggal diisi (prd.md §9.5).
 */
export const taskSchema = z
  .object({
    title: z.string().trim().min(1, 'Judul tugas wajib diisi').max(300, 'Judul maksimal 300 karakter'),
    description: z.string().trim().max(10000, 'Deskripsi maksimal 10.000 karakter'),
    courseId: z.string(),
    dueDate: z.string().refine((v) => v === '' || DATE.test(v), 'Tanggal tidak valid'),
    dueTime: z.string().refine((v) => v === '' || TIME.test(v), 'Jam tidak valid'),
    priority: z.enum(['low', 'medium', 'high'], { error: 'Pilih prioritas' }),
    status: z.enum(['todo', 'in_progress', 'done'], { error: 'Pilih status' }),
    reminderEnabled: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.dueTime !== '' && v.dueDate === '') {
      ctx.addIssue({ code: 'custom', path: ['dueTime'], message: 'Isi tanggal tenggat terlebih dulu' })
    }
  })

export type TaskFormValues = z.infer<typeof taskSchema>

export const emptyTaskForm = (courseId = ''): TaskFormValues => ({
  title: '',
  description: '',
  courseId,
  dueDate: '',
  dueTime: '',
  priority: 'medium',
  status: 'todo',
  reminderEnabled: true,
})
