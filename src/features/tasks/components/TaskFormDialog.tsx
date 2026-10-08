import { zodResolver } from '@hookform/resolvers/zod'
import { CircleAlert, CircleCheck, LoaderCircle, WifiOff } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { ErrorState, OfflineUnavailable } from '@/components/shared/states'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/dialog'
import { CheckboxField, FormSelect, TextAreaField, TextField } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { FilePickerButton, StagedFileList } from '@/features/attachments/components/FilePicker'
import { UploadQueueList } from '@/features/attachments/components/UploadQueueList'
import { useStagedFiles } from '@/features/attachments/useStagedFiles'
import { useUploadQueue } from '@/features/attachments/useUploadQueue'
import { MAX_FILES, type StagedFile } from '@/features/attachments/validation'
import { useCourses } from '@/features/courses/hooks'
import { taskToForm } from '@/features/tasks/mappers'
import { emptyTaskForm, taskSchema, type TaskFormValues } from '@/features/tasks/schema'
import { useCreateTask, useUpdateTask } from '@/features/tasks/hooks'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { toUserMessage } from '@/lib/errors'
import { queryGate } from '@/lib/query/gate'
import type { Course, Task } from '@/types'

interface TaskFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Jika ada → mode ubah (tanpa lampiran; lampiran dikelola di halaman detail). */
  task?: Task
  /** Mata kuliah awal saat menambah. */
  defaultCourseId?: string
}

export function TaskFormDialog({ open, onOpenChange, task, defaultCourseId }: TaskFormDialogProps) {
  const queue = useUploadQueue()
  /** Setelah tugas baru tersimpan, dialog beralih ke tahap unggah lampiran. */
  const [created, setCreated] = useState<Task | null>(null)

  // Dialog tidak boleh ditutup selagi unggahan berjalan (agar pengguna selalu melihat statusnya).
  const requestOpenChange = (next: boolean) => {
    if (next) return onOpenChange(true)
    if (queue.busy) return
    queue.reset()
    setCreated(null)
    onOpenChange(false)
  }

  return (
    <Modal
      open={open}
      onOpenChange={requestOpenChange}
      title={created ? 'Mengunggah lampiran' : task ? 'Ubah Tugas' : 'Tambah Tugas'}
      description={created ? undefined : 'Hanya judul yang wajib diisi.'}
    >
      {created ? (
        <UploadPhase task={created} queue={queue} onDone={() => requestOpenChange(false)} />
      ) : (
        // Dimuat ulang tiap dialog dibuka agar isian selalu segar.
        <TaskFormLoader
          task={task}
          defaultCourseId={defaultCourseId}
          onClose={() => requestOpenChange(false)}
          onCreatedWithFiles={(saved, files) => {
            setCreated(saved)
            queue.start(saved.id, files)
          }}
        />
      )}
    </Modal>
  )
}

function UploadPhase({ task, queue, onDone }: { task: Task; queue: ReturnType<typeof useUploadQueue>; onDone: () => void }) {
  const online = useOnlineStatus()
  const failed = queue.items.filter((i) => i.status === 'failed').length
  return (
    <div className="space-y-4">
      <p role="status" className="flex gap-2 rounded-lg bg-success-soft p-3 text-sm text-success-fg">
        <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>
          Tugas <strong>{task.title}</strong> sudah tersimpan.
        </span>
      </p>
      <UploadQueueList items={queue.items} onRetry={queue.retry} onCancel={queue.cancel} online={online} />
      {queue.busy ? (
        <p className="text-sm text-muted">Mengunggah file… Jangan tutup halaman sampai selesai.</p>
      ) : failed > 0 ? (
        <p role="alert" className="text-sm text-danger-fg">
          {failed} file gagal diunggah, tetapi tugas Anda tidak hilang. Coba lagi sekarang, atau buka detail tugas untuk menghapus file yang gagal atau memilih ulang file.
        </p>
      ) : (
        <p className="text-sm text-success-fg">Semua file berhasil diunggah dan tersimpan.</p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button asChild variant="secondary" disabled={queue.busy}>
          <Link to={`/tasks/${task.id}`} onClick={queue.busy ? (e) => e.preventDefault() : onDone}>
            Buka detail tugas
          </Link>
        </Button>
        <Button onClick={onDone} disabled={queue.busy}>
          Selesai
        </Button>
      </div>
    </div>
  )
}

function TaskFormLoader(props: {
  task?: Task
  defaultCourseId?: string
  onClose: () => void
  onCreatedWithFiles: (task: Task, files: StagedFile[]) => void
}) {
  const courses = useCourses()
  if (courses.data === undefined) {
    const gate = queryGate(courses)
    if (gate.state === 'error') {
      return <ErrorState message={toUserMessage(gate.error)} retrying={courses.isFetching} onRetry={() => void courses.refetch()} />
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
  return <TaskForm {...props} courses={courses.data} />
}

function TaskForm({
  task,
  defaultCourseId,
  courses,
  onClose,
  onCreatedWithFiles,
}: {
  task?: Task
  defaultCourseId?: string
  courses: Course[]
  onClose: () => void
  onCreatedWithFiles: (task: Task, files: StagedFile[]) => void
}) {
  const online = useOnlineStatus()
  const create = useCreateTask()
  const update = useUpdateTask(task?.id ?? '')
  const staged = useStagedFiles(MAX_FILES)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: task ? taskToForm(task) : emptyTaskForm(defaultCourseId ?? ''),
  })

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    try {
      const saved = task ? await update.mutateAsync(values) : await create.mutateAsync(values)
      const files = staged.staged.filter((s) => s.check.ok)
      if (!task && files.length > 0) {
        toast.success('Tugas ditambahkan', { description: saved.title })
        onCreatedWithFiles(saved, files) // lanjut ke tahap unggah; tugas sudah tersimpan
        return
      }
      toast.success(task ? 'Perubahan disimpan' : 'Tugas ditambahkan', { description: saved.title })
      onClose()
    } catch (error) {
      // Isian dan file pilihan dipertahankan; pengguna bisa langsung mencoba lagi.
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

      <TextField label="Judul tugas" autoFocus autoComplete="off" error={errors.title?.message} {...register('title')} />
      <FormSelect label="Mata kuliah (opsional)" error={errors.courseId?.message} {...register('courseId')}>
        <option value="">Tanpa mata kuliah</option>
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </FormSelect>
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Tenggat tanggal (opsional)" type="date" error={errors.dueDate?.message} {...register('dueDate')} />
        <TextField label="Tenggat jam (opsional)" type="time" error={errors.dueTime?.message} {...register('dueTime')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormSelect label="Prioritas" error={errors.priority?.message} {...register('priority')}>
          <option value="low">Rendah</option>
          <option value="medium">Sedang</option>
          <option value="high">Tinggi</option>
        </FormSelect>
        <FormSelect label="Status" error={errors.status?.message} {...register('status')}>
          <option value="todo">Belum dikerjakan</option>
          <option value="in_progress">Sedang dikerjakan</option>
          <option value="done">Selesai</option>
        </FormSelect>
      </div>
      <TextAreaField label="Deskripsi (opsional)" rows={3} error={errors.description?.message} {...register('description')} />
      <CheckboxField label="Ingatkan saya menjelang tenggat" description="Hanya berlaku jika tugas punya tenggat. Mengikuti pengaturan Pengingat." {...register('reminderEnabled')} />

      {!task && (
        <fieldset className="space-y-3 rounded-lg border border-border p-3">
          <legend className="px-1 text-sm font-medium">Lampiran (opsional)</legend>
          <StagedFileList staged={staged.staged} onRemove={staged.remove} />
          <FilePickerButton onFiles={(f) => void staged.add(f)} slotsAvailable={staged.slotsAvailable} checking={staged.checking} online={online} label="Pilih file lampiran" />
          {staged.validCount > 0 && <p className="text-xs text-muted">File diunggah setelah tugas tersimpan. Hasil unggahan tiap file akan ditampilkan.</p>}
        </fieldset>
      )}

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Batal
        </Button>
        <Button type="submit" disabled={isSubmitting || !online}>
          {isSubmitting && <LoaderCircle aria-hidden="true" className="animate-spin" />}
          {isSubmitting ? 'Menyimpan…' : !task && staged.validCount > 0 ? `Simpan & unggah ${staged.validCount} file` : 'Simpan'}
        </Button>
      </div>
    </form>
  )
}
