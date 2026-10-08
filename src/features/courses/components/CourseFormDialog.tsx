import { zodResolver } from '@hookform/resolvers/zod'
import { CircleAlert, LoaderCircle, WifiOff } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/dialog'
import { TextAreaField, TextField } from '@/components/ui/field'
import { ColorPicker } from '@/features/courses/components/ColorPicker'
import { useCreateCourse, useUpdateCourse } from '@/features/courses/hooks'
import { courseToForm } from '@/features/courses/mappers'
import { courseSchema, emptyCourseForm, type CourseFormValues } from '@/features/courses/schema'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { COURSE_COLORS, COURSE_COLOR_HEXES } from '@/lib/constants/course-colors'
import { toUserMessage } from '@/lib/errors'
import type { Course } from '@/types'

interface CourseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Jika ada → mode ubah; jika tidak → mode tambah. */
  course?: Course
  /** Dipakai untuk memilih warna awal yang belum dipakai mata kuliah lain. */
  usedColors?: string[]
  onSaved?: (course: Course) => void
}

export function CourseFormDialog({ open, onOpenChange, course, usedColors = [], onSaved }: CourseFormDialogProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={course ? 'Ubah Mata Kuliah' : 'Tambah Mata Kuliah'}
      description="Nama dan warna wajib diisi; lainnya opsional."
    >
      {/* Form dimuat ulang tiap dialog dibuka, sehingga isian selalu segar (atau terisi data yang diubah). */}
      <CourseForm course={course} usedColors={usedColors} onClose={() => onOpenChange(false)} onSaved={onSaved} />
    </Modal>
  )
}

function CourseForm({
  course,
  usedColors,
  onClose,
  onSaved,
}: {
  course?: Course
  usedColors: string[]
  onClose: () => void
  onSaved?: (course: Course) => void
}) {
  const online = useOnlineStatus()
  const create = useCreateCourse()
  const update = useUpdateCourse(course?.id ?? '')
  const [serverError, setServerError] = useState<string | null>(null)

  const firstFree = COURSE_COLOR_HEXES.find((hex) => !usedColors.includes(hex)) ?? COURSE_COLORS[0].hex
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: course ? courseToForm(course) : emptyCourseForm(firstFree),
  })

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    try {
      const saved = course ? await update.mutateAsync(values) : await create.mutateAsync(values)
      toast.success(course ? 'Perubahan disimpan' : 'Mata kuliah ditambahkan', { description: saved.name })
      onSaved?.(saved)
      onClose()
    } catch (error) {
      // Isian dipertahankan; pengguna bisa langsung mencoba lagi.
      setServerError(toUserMessage(error))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {!online && (
        <p role="status" className="flex gap-2 rounded-lg bg-warning-soft p-3 text-sm text-warning-fg">
          <WifiOff aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Anda sedang offline. Menyimpan memerlukan koneksi internet; isian tidak hilang.
        </p>
      )}
      {serverError && (
        <div role="alert" className="flex gap-2 rounded-lg bg-danger-soft p-3 text-sm text-danger-fg">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>{serverError} Isian Anda belum tersimpan.</p>
        </div>
      )}
      <TextField label="Nama mata kuliah" autoFocus autoComplete="off" error={errors.name?.message} {...register('name')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Kode (opsional)" autoComplete="off" error={errors.code?.message} {...register('code')} />
        <TextField label="Semester (opsional)" autoComplete="off" error={errors.semester?.message} {...register('semester')} />
      </div>
      <TextField label="Dosen (opsional)" autoComplete="off" error={errors.instructor?.message} {...register('instructor')} />
      <Controller
        control={control}
        name="color"
        render={({ field }) => <ColorPicker value={field.value} onChange={field.onChange} error={errors.color?.message} />}
      />
      <TextAreaField label="Catatan (opsional)" rows={3} error={errors.notes?.message} {...register('notes')} />
      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Batal
        </Button>
        <Button type="submit" disabled={isSubmitting || !online}>
          {isSubmitting && <LoaderCircle aria-hidden="true" className="animate-spin" />}
          {isSubmitting ? 'Menyimpan…' : 'Simpan'}
        </Button>
      </div>
    </form>
  )
}
