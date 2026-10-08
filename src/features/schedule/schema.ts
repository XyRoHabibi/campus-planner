import { z } from 'zod'

import { timeToMinutes } from '@/lib/utils/dates'

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Nilai form berupa string (select/time/date native). Konversi ke tipe database dilakukan di mapper.
 * Aturan sama dengan CHECK constraint di migration: jam selesai > jam mulai, tanggal akhir >= tanggal mulai.
 */
export const sessionSchema = z
  .object({
    courseId: z.string().min(1, 'Pilih mata kuliah'),
    dayOfWeek: z.enum(['0', '1', '2', '3', '4', '5', '6'], { error: 'Pilih hari' }),
    startTime: z.string().regex(TIME, 'Jam mulai wajib diisi'),
    endTime: z.string().regex(TIME, 'Jam selesai wajib diisi'),
    room: z.string().trim().max(200, 'Ruangan maksimal 200 karakter'),
    instructor: z.string().trim().max(200, 'Nama dosen maksimal 200 karakter'),
    startDate: z.string().refine((v) => v === '' || DATE.test(v), 'Tanggal tidak valid'),
    endDate: z.string().refine((v) => v === '' || DATE.test(v), 'Tanggal tidak valid'),
    notes: z.string().trim().max(5000, 'Catatan maksimal 5000 karakter'),
    reminderEnabled: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (TIME.test(v.startTime) && TIME.test(v.endTime) && timeToMinutes(v.endTime) <= timeToMinutes(v.startTime)) {
      ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'Jam selesai harus setelah jam mulai' })
    }
    if (v.startDate && v.endDate && v.endDate < v.startDate) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'Tanggal akhir tidak boleh sebelum tanggal mulai' })
    }
  })

export type SessionFormValues = z.infer<typeof sessionSchema>

export const emptySessionForm = (courseId = '', dayOfWeek: SessionFormValues['dayOfWeek'] = '1'): SessionFormValues => ({
  courseId,
  dayOfWeek,
  startTime: '',
  endTime: '',
  room: '',
  instructor: '',
  startDate: '',
  endDate: '',
  notes: '',
  reminderEnabled: true,
})
