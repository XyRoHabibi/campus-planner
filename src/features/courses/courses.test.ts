import { describe, expect, it } from 'vitest'

import { courseToForm, formToCourseRow, rowToCourse } from '@/features/courses/mappers'
import { courseSchema, emptyCourseForm } from '@/features/courses/schema'
import { COURSE_COLORS } from '@/lib/constants/course-colors'

const valid = { ...emptyCourseForm(), name: 'Basis Data' }

describe('courseSchema', () => {
  it('menerima isian minimal (nama + warna) dan men-trim spasi', () => {
    const r = courseSchema.safeParse({ ...valid, name: '  Basis Data  ' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.name).toBe('Basis Data')
  })

  it('nama wajib; hanya spasi dianggap kosong', () => {
    for (const name of ['', '   ']) {
      const r = courseSchema.safeParse({ ...valid, name })
      expect(r.success).toBe(false)
      if (!r.success) expect(r.error.issues[0]?.message).toBe('Nama mata kuliah wajib diisi')
    }
  })

  it('warna harus dari palet', () => {
    expect(courseSchema.safeParse({ ...valid, color: '#123456' }).success).toBe(false)
    expect(courseSchema.safeParse({ ...valid, color: 'merah' }).success).toBe(false)
    for (const c of COURSE_COLORS) expect(courseSchema.safeParse({ ...valid, color: c.hex }).success).toBe(true)
  })

  it('menolak isian melebihi batas yang sama dengan constraint database', () => {
    expect(courseSchema.safeParse({ ...valid, name: 'x'.repeat(201) }).success).toBe(false)
    expect(courseSchema.safeParse({ ...valid, name: 'x'.repeat(200) }).success).toBe(true)
    expect(courseSchema.safeParse({ ...valid, code: 'x'.repeat(51) }).success).toBe(false)
    expect(courseSchema.safeParse({ ...valid, instructor: 'x'.repeat(201) }).success).toBe(false)
    expect(courseSchema.safeParse({ ...valid, semester: 'x'.repeat(51) }).success).toBe(false)
    expect(courseSchema.safeParse({ ...valid, notes: 'x'.repeat(5001) }).success).toBe(false)
  })
})

describe('mapper mata kuliah', () => {
  it('isian opsional kosong disimpan sebagai NULL dan user_id tidak pernah dikirim', () => {
    const row = formToCourseRow({ ...valid })
    expect(row).toEqual({ name: 'Basis Data', code: null, instructor: null, color: COURSE_COLORS[0].hex, semester: null, notes: null })
    expect(row).not.toHaveProperty('user_id')
  })

  it('baris database → Course (NULL jadi undefined) dan kembali ke form tanpa kehilangan data', () => {
    const course = rowToCourse({ id: 'c1', name: 'Statistika', code: null, instructor: 'Dr. Sari', color: '#14B8A6', semester: null, notes: 'Bawa kalkulator' })
    expect(course.code).toBeUndefined()
    expect(course.instructor).toBe('Dr. Sari')
    expect(courseToForm(course)).toEqual({ name: 'Statistika', code: '', instructor: 'Dr. Sari', color: '#14B8A6', semester: '', notes: 'Bawa kalkulator' })
    expect(formToCourseRow(courseToForm(course))).toMatchObject({ code: null, semester: null, notes: 'Bawa kalkulator' })
  })
})
