import { z } from 'zod'

import { COURSE_COLORS, COURSE_COLOR_HEXES } from '@/lib/constants/course-colors'

/** Batas panjang sama dengan CHECK constraint di migration (prd.md §15). */
export const courseSchema = z.object({
  name: z.string().trim().min(1, 'Nama mata kuliah wajib diisi').max(200, 'Nama maksimal 200 karakter'),
  code: z.string().trim().max(50, 'Kode maksimal 50 karakter'),
  instructor: z.string().trim().max(200, 'Nama dosen maksimal 200 karakter'),
  color: z.enum(COURSE_COLOR_HEXES as [string, ...string[]], { error: 'Pilih warna identitas' }),
  semester: z.string().trim().max(50, 'Semester maksimal 50 karakter'),
  notes: z.string().trim().max(5000, 'Catatan maksimal 5000 karakter'),
})

export type CourseFormValues = z.infer<typeof courseSchema>

export const emptyCourseForm = (color: string = COURSE_COLORS[0].hex): CourseFormValues => ({
  name: '',
  code: '',
  instructor: '',
  color,
  semester: '',
  notes: '',
})
