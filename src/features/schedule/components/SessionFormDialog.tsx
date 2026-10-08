import { zodResolver } from '@hookform/resolvers/zod'
import { CircleAlert, LoaderCircle, TriangleAlert, WifiOff } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { ErrorState, OfflineUnavailable } from '@/components/shared/states'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/dialog'
import { CheckboxField, FormSelect, TextAreaField, TextField } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { useCourses } from '@/features/courses/hooks'
import { sessionToForm } from '@/features/schedule/mappers'
import { emptySessionForm, sessionSchema, type SessionFormValues } from '@/features/schedule/schema'
import { useCreateSession, useSessions, useUpdateSession } from '@/features/schedule/hooks'
import { useSettings } from '@/features/settings/settings-context'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { toUserMessage } from '@/lib/errors'
import { queryGate } from '@/lib/query/gate'
import { DAY_NAMES } from '@/lib/utils/dates'
import { findConflicts } from '@/lib/utils/schedule'
import type { ClassSession, DayOfWeek } from '@/types'

const DAY_ORDER_MON: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0]
const DAY_ORDER_SUN: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6]

const slotKeyOf = (...parts: string[]) => parts.join('|')

interface SessionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Jika ada → mode ubah. */
  session?: ClassSession
  /** Nilai awal saat menambah. */
  defaultCourseId?: string
  defaultDay?: DayOfWeek
}

export function SessionFormDialog({ open, onOpenChange, session, defaultCourseId, defaultDay }: SessionFormDialogProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={session ? 'Ubah Jadwal' : 'Tambah Jadwal'}
      description="Satu mata kuliah bisa punya beberapa sesi — tambahkan satu per satu."
    >
      {/* Dimuat ulang tiap dialog dibuka agar isian selalu segar. */}
      <SessionFormLoader session={session} defaultCourseId={defaultCourseId} defaultDay={defaultDay} onClose={() => onOpenChange(false)} />
    </Modal>
  )
}

function SessionFormLoader(props: { session?: ClassSession; defaultCourseId?: string; defaultDay?: DayOfWeek; onClose: () => void }) {
  const courses = useCourses()
  const sessions = useSessions()

  if (courses.data === undefined || sessions.data === undefined) {
    const gate = queryGate(courses, sessions)
    if (gate.state === 'error') {
      return (
        <ErrorState
          message={toUserMessage(gate.error)}
          retrying={courses.isFetching || sessions.isFetching}
          onRetry={() => {
            void courses.refetch()
            void sessions.refetch()
          }}
        />
      )
    }
    if (gate.state === 'offline') return <OfflineUnavailable className="py-6" />
    return (
      <div role="status" aria-label="Memuat formulir" className="space-y-4">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    )
  }
  if (courses.data.length === 0) {
    return (
      <div className="space-y-3 text-sm">
        <p>Tambahkan mata kuliah dulu sebelum menyusun jadwal.</p>
        <Button asChild>
          <Link to="/courses">Ke halaman Mata Kuliah</Link>
        </Button>
      </div>
    )
  }
  return <SessionForm {...props} courses={courses.data} existing={sessions.data} />
}

function SessionForm({
  session,
  defaultCourseId,
  defaultDay,
  courses,
  existing,
  onClose,
}: {
  session?: ClassSession
  defaultCourseId?: string
  defaultDay?: DayOfWeek
  courses: { id: string; name: string }[]
  existing: ClassSession[]
  onClose: () => void
}) {
  const online = useOnlineStatus()
  const { settings } = useSettings()
  const dayOrder = settings.weekStart === 0 ? DAY_ORDER_SUN : DAY_ORDER_MON
  const create = useCreateSession()
  const update = useUpdateSession(session?.id ?? '')
  const [serverError, setServerError] = useState<string | null>(null)
  // Peringatan bentrok dikaitkan ke "kunci" hari+jam+periode saat dihitung. Jika isian berubah, kuncinya
  // berbeda sehingga peringatan dan persetujuan lama otomatis tidak berlaku (tanpa effect/ref).
  const [conflictState, setConflictState] = useState<{ key: string; items: ClassSession[] } | null>(null)
  const [acknowledgedKey, setAcknowledgedKey] = useState<string | null>(null)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SessionFormValues>({
    resolver: zodResolver(sessionSchema),
    defaultValues: session
      ? sessionToForm(session)
      : emptySessionForm(defaultCourseId ?? (courses.length === 1 ? courses[0]?.id : ''), String(defaultDay ?? 1) as SessionFormValues['dayOfWeek']),
  })

  const [dayOfWeek, startTime, endTime, startDate, endDate] = useWatch({
    control,
    name: ['dayOfWeek', 'startTime', 'endTime', 'startDate', 'endDate'],
  })
  const currentKey = slotKeyOf(dayOfWeek, startTime, endTime, startDate, endDate)
  const conflicts = conflictState?.key === currentKey ? conflictState.items : null

  const courseName = useMemo(() => new Map(courses.map((c) => [c.id, c.name])), [courses])

  const persist = async (values: SessionFormValues) => {
    setServerError(null)
    try {
      const saved = session ? await update.mutateAsync(values) : await create.mutateAsync(values)
      toast.success(session ? 'Perubahan disimpan' : 'Jadwal ditambahkan', { description: courseName.get(saved.courseId) })
      onClose()
    } catch (error) {
      setServerError(toUserMessage(error))
    }
  }

  // Simpan biasa: periksa bentrok dulu; jika ada, tampilkan peringatan dan JANGAN simpan (prd.md §9.4).
  const save = handleSubmit(async (values) => {
    const key = slotKeyOf(values.dayOfWeek, values.startTime, values.endTime, values.startDate, values.endDate)
    if (acknowledgedKey !== key) {
      const found = findConflicts(
        {
          dayOfWeek: Number(values.dayOfWeek) as DayOfWeek,
          startTime: values.startTime,
          endTime: values.endTime,
          startDate: values.startDate || undefined,
          endDate: values.endDate || undefined,
        },
        existing,
        session?.id,
      )
      if (found.length > 0) {
        setConflictState({ key, items: found })
        return
      }
    }
    await persist(values)
  })

  // "Tetap simpan": pengguna sudah melihat peringatan, lanjutkan tanpa memeriksa ulang.
  const saveAnyway = handleSubmit(async (values) => {
    setAcknowledgedKey(slotKeyOf(values.dayOfWeek, values.startTime, values.endTime, values.startDate, values.endDate))
    await persist(values)
  })

  return (
    <form onSubmit={save} noValidate className="space-y-4">
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

      <FormSelect label="Mata kuliah" error={errors.courseId?.message} {...register('courseId')}>
        <option value="">Pilih mata kuliah…</option>
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </FormSelect>
      <FormSelect label="Hari" error={errors.dayOfWeek?.message} {...register('dayOfWeek')}>
        {dayOrder.map((d) => (
          <option key={d} value={d}>
            {DAY_NAMES[d]}
          </option>
        ))}
      </FormSelect>
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Jam mulai" type="time" error={errors.startTime?.message} {...register('startTime')} />
        <TextField label="Jam selesai" type="time" error={errors.endTime?.message} {...register('endTime')} />
      </div>
      <TextField label="Ruangan / lokasi (opsional)" autoComplete="off" error={errors.room?.message} {...register('room')} />
      <TextField
        label="Dosen sesi ini (opsional)"
        autoComplete="off"
        placeholder="Kosongkan untuk memakai dosen mata kuliah"
        error={errors.instructor?.message}
        {...register('instructor')}
      />
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Periode semester (opsional)</legend>
        <p className="-mt-1 text-xs text-muted">Jika diisi, jadwal hanya tampil di antara kedua tanggal ini.</p>
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Tanggal mulai" type="date" error={errors.startDate?.message} {...register('startDate')} />
          <TextField label="Tanggal akhir" type="date" error={errors.endDate?.message} {...register('endDate')} />
        </div>
      </fieldset>
      <TextAreaField label="Catatan (opsional)" rows={3} error={errors.notes?.message} {...register('notes')} />
      <CheckboxField label="Ingatkan saya sebelum kelas ini" description="Mengikuti pengaturan Pengingat (jeda & saklar utama)." {...register('reminderEnabled')} />

      {conflicts ? (
        <div role="alert" className="space-y-3 rounded-lg border border-warning/50 bg-warning-soft p-3 text-sm text-warning-fg">
          <p className="flex items-start gap-2 font-semibold">
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            Jadwal ini bentrok dengan {conflicts.length} sesi lain:
          </p>
          <ul className="list-disc space-y-1 pl-9">
            {conflicts.map((c) => (
              <li key={c.id}>
                {courseName.get(c.courseId) ?? 'Mata kuliah'} · {DAY_NAMES[c.dayOfWeek]} {c.startTime}–{c.endTime}
              </li>
            ))}
          </ul>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setConflictState(null)} disabled={isSubmitting}>
              Ubah jadwal
            </Button>
            <Button onClick={() => void saveAnyway()} disabled={isSubmitting || !online}>
              {isSubmitting && <LoaderCircle aria-hidden="true" className="animate-spin" />}
              Tetap simpan
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting || !online}>
            {isSubmitting && <LoaderCircle aria-hidden="true" className="animate-spin" />}
            {isSubmitting ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </div>
      )}
    </form>
  )
}
