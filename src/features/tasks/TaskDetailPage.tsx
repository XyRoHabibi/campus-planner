import { ArrowLeft, CircleCheck, FileQuestion, LoaderCircle, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'

import { CourseTag } from '@/components/shared/CourseTag'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState, ErrorState, OfflineUnavailable } from '@/components/shared/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AttachmentSection } from '@/features/attachments/components/AttachmentSection'
import { useCourses } from '@/features/courses/hooks'
import { DeleteTaskDialog } from '@/features/tasks/components/DeleteTaskDialog'
import { DueBadge, PriorityBadge, StatusBadge } from '@/features/tasks/components/TaskBadges'
import { TaskFormDialog } from '@/features/tasks/components/TaskFormDialog'
import { useSetTaskStatus, useTask } from '@/features/tasks/hooks'
import { useNow } from '@/hooks/useNow'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { toUserMessage } from '@/lib/errors'
import { queryGate } from '@/lib/query/gate'

/** Detail tugas: ubah, hapus, tandai selesai / buka kembali, dan kelola lampiran. */
export function TaskDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const now = useNow()
  const online = useOnlineStatus()
  const task = useTask(id)
  const courses = useCourses()
  const setStatus = useSetTaskStatus()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const backLink = (
    <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3">
      <Link to="/tasks">
        <ArrowLeft aria-hidden="true" />
        Kembali ke Tugas
      </Link>
    </Button>
  )

  // Data tugas/mata kuliah belum ada: jelaskan keadaannya (error, offline tanpa cache, atau memuat).
  // Jika datanya ADA (mis. dari cache offline) halaman tetap tampil walau pemuatan ulang gagal.
  if (task.data === undefined || courses.data === undefined) {
    const gate = queryGate(task, courses)
    return (
      <>
        {backLink}
        {gate.state === 'error' ? (
          <ErrorState
            message={toUserMessage(gate.error)}
            retrying={task.isFetching || courses.isFetching}
            onRetry={() => {
              void task.refetch()
              void courses.refetch()
            }}
          />
        ) : gate.state === 'offline' ? (
          <OfflineUnavailable />
        ) : (
          <div role="status" aria-label="Memuat detail tugas" className="space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}
      </>
    )
  }

  if (task.data === null) {
    return (
      <>
        {backLink}
        <EmptyState
          icon={FileQuestion}
          title="Tugas tidak ditemukan"
          description="Tugas ini mungkin sudah dihapus atau tautannya keliru."
          action={
            <Button asChild>
              <Link to="/tasks">Lihat semua tugas</Link>
            </Button>
          }
        />
      </>
    )
  }

  const t = task.data
  const done = t.status === 'done'
  const course = t.courseId ? courses.data.find((c) => c.id === t.courseId) : undefined
  const offlineHint = online ? undefined : 'Perlu koneksi internet'

  const toggleDone = () =>
    setStatus.mutate(
      { id: t.id, status: done ? 'todo' : 'done' },
      {
        onSuccess: () => toast.success(done ? 'Tugas dibuka kembali' : 'Tugas ditandai selesai', { description: t.title }),
        onError: (error) => toast.error('Belum bisa mengubah status', { description: toUserMessage(error) }),
      },
    )

  return (
    <>
      {backLink}
      <PageHeader
        title={t.title}
        actions={
          <>
            <Button onClick={toggleDone} disabled={setStatus.isPending || !online} title={offlineHint}>
              {setStatus.isPending ? (
                <LoaderCircle aria-hidden="true" className="animate-spin" />
              ) : done ? (
                <RotateCcw aria-hidden="true" />
              ) : (
                <CircleCheck aria-hidden="true" />
              )}
              {done ? 'Buka kembali' : 'Tandai selesai'}
            </Button>
            <Button variant="secondary" onClick={() => setEditOpen(true)} disabled={!online} title={offlineHint}>
              <Pencil aria-hidden="true" />
              Ubah
            </Button>
            <Button variant="secondary" onClick={() => setDeleteOpen(true)} disabled={!online} title={offlineHint}>
              <Trash2 aria-hidden="true" />
              Hapus
            </Button>
          </>
        }
      />
      <div className="-mt-3 mb-5 space-y-3">
        <CourseTag course={course} />
        <div className="flex flex-wrap items-center gap-2">
          <DueBadge task={t} now={now} />
          <PriorityBadge priority={t.priority} />
          <StatusBadge status={t.status} />
        </div>
      </div>

      <Card>
        <CardContent className="space-y-5">
          <section>
            <h2 className="text-sm font-semibold">Deskripsi</h2>
            <p className="mt-1 whitespace-pre-line text-sm text-muted">{t.description ?? 'Belum ada deskripsi.'}</p>
          </section>
        </CardContent>
      </Card>

      <div className="mt-5">
        <AttachmentSection task={t} />
      </div>

      <TaskFormDialog open={editOpen} onOpenChange={setEditOpen} task={t} />
      <DeleteTaskDialog
        task={t}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => {
          setDeleteOpen(false)
          toast.success('Tugas dihapus', { description: t.title })
          navigate('/tasks', { replace: true })
        }}
      />
    </>
  )
}
