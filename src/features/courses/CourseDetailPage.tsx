import { ArrowLeft, CalendarClock, FileQuestion, MapPin, Pencil, Plus, Trash2, User } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'

import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState, ErrorState, OfflineUnavailable } from '@/components/shared/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CourseFormDialog } from '@/features/courses/components/CourseFormDialog'
import { DeleteCourseDialog } from '@/features/courses/components/DeleteCourseDialog'
import { useCourses } from '@/features/courses/hooks'
import { SessionDialogs } from '@/features/schedule/components/SessionDialogs'
import { SessionFormDialog } from '@/features/schedule/components/SessionFormDialog'
import { useSessions } from '@/features/schedule/hooks'
import { TaskFormDialog } from '@/features/tasks/components/TaskFormDialog'
import { TaskRow } from '@/features/tasks/components/TaskRow'
import { useTasks } from '@/features/tasks/hooks'
import { useNow } from '@/hooks/useNow'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { COURSE_COLORS } from '@/lib/constants/course-colors'
import { toUserMessage } from '@/lib/errors'
import { queryGate } from '@/lib/query/gate'
import { isActiveTask } from '@/lib/utils/agenda'
import type { ClassSession } from '@/types'
import { DAY_NAMES } from '@/lib/utils/dates'

export function CourseDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const now = useNow()
  const online = useOnlineStatus()
  const courses = useCourses()
  const sessions = useSessions()
  const tasks = useTasks()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [sessionFormOpen, setSessionFormOpen] = useState(false)
  const [taskFormOpen, setTaskFormOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null)

  const course = courses.data?.find((c) => c.id === id)
  const coursesGate = queryGate(courses)
  const sessionsGate = queryGate(sessions)
  const tasksGate = queryGate(tasks)
  const mySessions = useMemo(
    () =>
      (sessions.data ?? [])
        .filter((s) => s.courseId === id)
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)),
    [sessions.data, id],
  )
  const myTasks = useMemo(
    () =>
      (tasks.data ?? [])
        .filter((t) => t.courseId === id)
        .sort((a, b) => Number(!isActiveTask(a)) - Number(!isActiveTask(b))),
    [tasks.data, id],
  )

  const backLink = (
    <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3">
      <Link to="/courses">
        <ArrowLeft aria-hidden="true" />
        Kembali ke Mata Kuliah
      </Link>
    </Button>
  )

  if (coursesGate.state === 'error') {
    return (
      <>
        {backLink}
        <ErrorState message={toUserMessage(coursesGate.error)} retrying={courses.isFetching} onRetry={() => void courses.refetch()} />
      </>
    )
  }
  if (coursesGate.state === 'offline') {
    return (
      <>
        {backLink}
        <OfflineUnavailable />
      </>
    )
  }
  if (coursesGate.state === 'loading') {
    return (
      <>
        {backLink}
        <div role="status" aria-label="Memuat mata kuliah" className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-40 w-full" />
        </div>
      </>
    )
  }
  if (!course) {
    return (
      <>
        {backLink}
        <EmptyState
          icon={FileQuestion}
          title="Mata kuliah tidak ditemukan"
          description="Mata kuliah ini mungkin sudah dihapus atau tautannya keliru."
          action={
            <Button asChild>
              <Link to="/courses">Lihat semua mata kuliah</Link>
            </Button>
          }
        />
      </>
    )
  }

  const colorName = COURSE_COLORS.find((c) => c.hex === course.color)?.name ?? 'Kustom'
  const offlineHint = online ? undefined : 'Perlu koneksi internet'

  return (
    <>
      {backLink}
      <PageHeader
        title={course.name}
        description={[course.code, course.semester].filter(Boolean).join(' · ') || undefined}
        actions={
          <>
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

      <div className="space-y-5">
        <Card>
          <CardContent className="space-y-4">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-semibold">Warna identitas</dt>
                <dd className="mt-1 flex items-center gap-2 text-muted">
                  <span aria-hidden="true" className="size-4 rounded-full" style={{ backgroundColor: course.color }} />
                  {colorName}
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Dosen</dt>
                <dd className="mt-1 flex items-center gap-2 text-muted">
                  <User aria-hidden="true" className="size-4" />
                  {course.instructor ?? 'Belum diisi'}
                </dd>
              </div>
            </dl>
            <div className="text-sm">
              <p className="font-semibold">Catatan</p>
              <p className="mt-1 whitespace-pre-line text-muted">{course.notes ?? 'Belum ada catatan.'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Jadwal kuliah</CardTitle>
            <Button size="sm" variant="secondary" onClick={() => setSessionFormOpen(true)} disabled={!online} title={offlineHint}>
              <Plus aria-hidden="true" />
              Tambah jadwal
            </Button>
          </CardHeader>
          <CardContent>
            {sessionsGate.state === 'error' ? (
              <ErrorState message={toUserMessage(sessionsGate.error)} retrying={sessions.isFetching} onRetry={() => void sessions.refetch()} />
            ) : sessionsGate.state === 'offline' ? (
              <OfflineUnavailable className="py-6" />
            ) : sessionsGate.state === 'loading' ? (
              <Skeleton className="h-16 w-full" />
            ) : mySessions.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="Belum ada jadwal"
                description="Jadwal untuk mata kuliah ini belum ditambahkan."
                className="py-6"
              />
            ) : (
              <ul className="divide-y divide-border">
                {mySessions.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedSession(s)}
                      className="flex min-h-12 w-full flex-wrap items-center gap-x-4 gap-y-1 rounded-lg py-3 text-left text-sm hover:bg-surface-muted"
                    >
                      <span className="w-20 font-semibold">{DAY_NAMES[s.dayOfWeek]}</span>
                      <span className="tabular-nums">
                        {s.startTime} – {s.endTime}
                      </span>
                      <span className="flex items-center gap-1.5 text-muted">
                        <MapPin aria-hidden="true" className="size-3.5" />
                        {s.room ?? 'Ruangan belum ditentukan'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <section aria-labelledby="tugas-matkul">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="tugas-matkul" className="text-base font-semibold">
              Tugas
            </h2>
            <Button size="sm" variant="secondary" onClick={() => setTaskFormOpen(true)} disabled={!online} title={offlineHint}>
              <Plus aria-hidden="true" />
              Tambah tugas
            </Button>
          </div>
          {tasksGate.state === 'error' ? (
            <ErrorState message={toUserMessage(tasksGate.error)} retrying={tasks.isFetching} onRetry={() => void tasks.refetch()} />
          ) : tasksGate.state === 'offline' ? (
            <OfflineUnavailable className="py-6" />
          ) : tasksGate.state === 'loading' ? (
            <Skeleton className="h-24 w-full" />
          ) : myTasks.length === 0 ? (
            <p className="rounded-card border border-dashed border-border bg-surface px-4 py-6 text-center text-sm text-muted">
              Belum ada tugas untuk mata kuliah ini.
            </p>
          ) : (
            <ul className="space-y-3">
              {myTasks.map((t) => (
                <li key={t.id}>
                  <TaskRow task={t} course={course} now={now} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <CourseFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        course={course}
        usedColors={(courses.data ?? []).filter((c) => c.id !== course.id).map((c) => c.color)}
      />
      <TaskFormDialog open={taskFormOpen} onOpenChange={setTaskFormOpen} defaultCourseId={course.id} />
      <SessionFormDialog open={sessionFormOpen} onOpenChange={setSessionFormOpen} defaultCourseId={course.id} />
      <SessionDialogs session={selectedSession} onClose={() => setSelectedSession(null)} />
      <DeleteCourseDialog
        course={course}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => {
          setDeleteOpen(false)
          toast.success('Mata kuliah dihapus', { description: course.name })
          navigate('/courses', { replace: true })
        }}
      />
    </>
  )
}
