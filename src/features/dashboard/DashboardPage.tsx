import { CalendarOff, CalendarPlus, ClipboardList, Plus, Radio, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'

import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState, ErrorState, OfflineUnavailable } from '@/components/shared/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCourses } from '@/features/courses/hooks'
import { SessionDialogs } from '@/features/schedule/components/SessionDialogs'
import { SessionFormDialog } from '@/features/schedule/components/SessionFormDialog'
import { SessionRow } from '@/features/schedule/components/SessionRow'
import { useSessions } from '@/features/schedule/hooks'
import { TaskFormDialog } from '@/features/tasks/components/TaskFormDialog'
import { TaskListSkeleton } from '@/features/tasks/components/TaskListSkeleton'
import { TaskRow } from '@/features/tasks/components/TaskRow'
import { useTasks } from '@/features/tasks/hooks'
import { useNow } from '@/hooks/useNow'
import { SyncStatus } from '@/features/dashboard/components/SyncStatus'
import { RemindersStrip } from '@/features/reminders/components/RemindersStrip'
import { useActiveReminders } from '@/features/reminders/useReminders'
import { isActiveTask, isOverdue, pickHighlights, sessionStates, sessionsOnDay } from '@/lib/utils/agenda'
import { formatCountdown, formatLongDate, timeToMinutes, minutesOfDay } from '@/lib/utils/dates'
import { toUserMessage } from '@/lib/errors'
import { queryGate } from '@/lib/query/gate'
import type { ClassSession, Course, DayOfWeek } from '@/types'

/** Berapa tugas terlambat yang ditampilkan di Beranda; sisanya lewat tautan ke halaman Tugas. */
const OVERDUE_LIMIT = 3

function StatTile({ label, value, loading, failed }: { label: string; value: number; loading: boolean; failed: boolean }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      {failed ? (
        <p className="mt-1 text-3xl font-bold text-muted">
          –<span className="sr-only">Data belum bisa dimuat</span>
        </p>
      ) : loading ? (
        <Skeleton className="mt-2 h-8 w-10" />
      ) : (
        <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
      )}
    </Card>
  )
}

/**
 * Kartu sorotan: kelas yang sedang berlangsung atau berikutnya. Seluruh kartu adalah tombol yang membuka detail
 * (prd.md §9.2). Saat kelas berlangsung, kelas berikutnya tetap disebut di baris bawah.
 */
function NextClassCard({
  session,
  course,
  ongoing,
  now,
  following,
  followingCourse,
  onSelect,
}: {
  session: ClassSession
  course?: Course
  ongoing: boolean
  now: Date
  following?: ClassSession
  followingCourse?: Course
  onSelect: (s: ClassSession) => void
}) {
  const minutesLeft = timeToMinutes(session.startTime) - minutesOfDay(now)
  const instructor = session.instructor ?? course?.instructor
  return (
    <button
      type="button"
      onClick={() => onSelect(session)}
      aria-label={`${ongoing ? 'Kelas sedang berlangsung' : 'Kelas berikutnya'}: ${course?.name ?? 'Mata kuliah'}. Buka detail`}
      className="block w-full rounded-card bg-primary p-5 text-left text-primary-foreground shadow-card transition-colors hover:bg-primary-hover"
    >
      <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/85">
        {ongoing && <Radio aria-hidden="true" className="size-3.5" />}
        {ongoing ? 'Sedang berlangsung' : `Kelas berikutnya · ${formatCountdown(minutesLeft)}`}
      </span>
      <span className="mt-2 block text-xl font-bold leading-snug">{course?.name ?? 'Mata kuliah'}</span>
      <span className="mt-1 block text-sm text-white/90">
        {session.startTime} – {session.endTime} · {session.room ?? 'Ruangan belum ditentukan'}
      </span>
      {instructor && <span className="mt-0.5 block text-sm text-white/90">{instructor}</span>}
      {following && (
        <span className="mt-3 block border-t border-white/25 pt-2 text-sm text-white/90">
          Berikutnya: <strong>{followingCourse?.name ?? 'Mata kuliah'}</strong> pukul {following.startTime} (
          {formatCountdown(timeToMinutes(following.startTime) - minutesOfDay(now))})
        </span>
      )}
    </button>
  )
}

export function DashboardPage() {
  const now = useNow()
  const courses = useCourses()
  const sessions = useSessions()
  const tasks = useTasks()
  const reminders = useActiveReminders()
  const [sessionFormOpen, setSessionFormOpen] = useState(false)
  const [taskFormOpen, setTaskFormOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null)

  const courseById = useMemo(() => new Map((courses.data ?? []).map((c) => [c.id, c])), [courses.data])

  const todays = useMemo(() => sessionsOnDay(sessions.data ?? [], now), [sessions.data, now])
  const states = useMemo(() => sessionStates(todays, now), [todays, now])
  const { current, next } = useMemo(() => pickHighlights(todays, states), [todays, states])
  const highlighted = current ?? next

  const activeTasks = useMemo(() => (tasks.data ?? []).filter(isActiveTask), [tasks.data])
  const overdue = useMemo(
    () =>
      activeTasks
        .filter((t) => isOverdue(t, now))
        .sort((a, b) => new Date(a.dueAt ?? 0).getTime() - new Date(b.dueAt ?? 0).getTime()),
    [activeTasks, now],
  )
  const overdueShown = overdue.slice(0, OVERDUE_LIMIT)
  const upcoming = useMemo(
    () =>
      activeTasks
        .filter((t) => t.dueAt !== null && !isOverdue(t, now))
        .sort((a, b) => new Date(a.dueAt ?? 0).getTime() - new Date(b.dueAt ?? 0).getTime())
        .slice(0, 4),
    [activeTasks, now],
  )

  const scheduleGate = queryGate(sessions, courses)
  const tasksGate = queryGate(tasks, courses)
  const scheduleError = scheduleGate.state === 'error' ? scheduleGate.error : null
  const tasksError = tasksGate.state === 'error' ? tasksGate.error : null
  const scheduleOffline = scheduleGate.state === 'offline'
  const tasksOffline = tasksGate.state === 'offline'
  const scheduleLoading = scheduleGate.state === 'loading'
  const tasksLoading = tasksGate.state === 'loading'

  return (
    <>
      <PageHeader
        title="Beranda"
        description={formatLongDate(now)}
        actions={
          <>
            <Button onClick={() => setTaskFormOpen(true)}>
              <Plus aria-hidden="true" />
              Tambah Tugas
            </Button>
            <Button variant="secondary" onClick={() => setSessionFormOpen(true)}>
              <CalendarPlus aria-hidden="true" />
              Tambah Jadwal
            </Button>
          </>
        }
      />

      <SyncStatus
        queries={[courses, sessions, tasks]}
        onRefresh={() => {
          void courses.refetch()
          void sessions.refetch()
          void tasks.refetch()
        }}
      />

      <RemindersStrip reminders={reminders} />

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Kelas hari ini" value={todays.length} loading={scheduleLoading} failed={!!scheduleError || scheduleOffline} />
        <StatTile label="Tugas aktif" value={activeTasks.length} loading={tasksLoading} failed={!!tasksError || tasksOffline} />
        <StatTile label="Terlambat" value={overdue.length} loading={tasksLoading} failed={!!tasksError || tasksOffline} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        {/* Agenda hari ini */}
        <div className="space-y-5 lg:col-span-3">
          {!scheduleLoading && !scheduleOffline && !scheduleError && todays.length > 0 && (
            highlighted ? (
              <NextClassCard
                session={highlighted}
                course={courseById.get(highlighted.courseId)}
                ongoing={current !== undefined}
                now={now}
                following={current ? next : undefined}
                followingCourse={current && next ? courseById.get(next.courseId) : undefined}
                onSelect={setSelectedSession}
              />
            ) : (
              <p className="rounded-card border border-border bg-surface px-4 py-3 text-sm text-muted shadow-card">
                Tidak ada kelas lagi hari ini.
              </p>
            )
          )}

          <Card>
            <CardHeader>
              <CardTitle>Jadwal hari ini</CardTitle>
              <Link to="/schedule" className="text-sm font-semibold text-primary hover:underline">
                Lihat jadwal
              </Link>
            </CardHeader>
            <CardContent>
              {scheduleError ? (
                <ErrorState
                  message={toUserMessage(scheduleError)}
                  retrying={sessions.isFetching || courses.isFetching}
                  onRetry={() => {
                    void sessions.refetch()
                    void courses.refetch()
                  }}
                />
              ) : scheduleOffline ? (
                <OfflineUnavailable />
              ) : scheduleLoading ? (
                <div role="status" aria-label="Memuat jadwal" className="space-y-3">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : (sessions.data ?? []).length === 0 ? (
                <EmptyState
                  icon={CalendarOff}
                  title="Belum ada jadwal kuliah"
                  description="Tambahkan jadwal kuliah agar agenda harianmu muncul di sini."
                  action={
                    <Button asChild>
                      <Link to="/schedule">Buka halaman Jadwal</Link>
                    </Button>
                  }
                />
              ) : todays.length === 0 ? (
                <EmptyState icon={CalendarOff} title="Tidak ada kuliah hari ini" description="Nikmati harimu, atau cicil tugas yang mendekati tenggat." />
              ) : (
                <ul className="space-y-3">
                  {todays.map((s) => (
                    <li key={s.id}>
                      <SessionRow session={s} course={courseById.get(s.courseId)} state={states.get(s.id)} onSelect={setSelectedSession} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tugas */}
        <div className="space-y-5 lg:col-span-2">
          {!tasksLoading && !tasksOffline && !tasksError && overdue.length > 0 && (
            <Card className="border-danger/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-danger-fg">
                  <TriangleAlert aria-hidden="true" className="size-4" />
                  Tugas terlambat ({overdue.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {overdueShown.map((t) => (
                    <li key={t.id}>
                      <TaskRow task={t} course={t.courseId ? courseById.get(t.courseId) : undefined} now={now} compact />
                    </li>
                  ))}
                </ul>
                {overdue.length > overdueShown.length && (
                  <Link to="/tasks?status=overdue" className="mt-3 block text-sm font-semibold text-primary hover:underline">
                    Lihat {overdue.length - overdueShown.length} tugas terlambat lainnya
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Tenggat terdekat</CardTitle>
              <Link to="/tasks" className="text-sm font-semibold text-primary hover:underline">
                Semua tugas
              </Link>
            </CardHeader>
            <CardContent>
              {tasksError ? (
                <ErrorState
                  message={toUserMessage(tasksError)}
                  retrying={tasks.isFetching || courses.isFetching}
                  onRetry={() => {
                    void tasks.refetch()
                    void courses.refetch()
                  }}
                />
              ) : tasksOffline ? (
                <OfflineUnavailable />
              ) : tasksLoading ? (
                <TaskListSkeleton rows={3} />
              ) : (tasks.data ?? []).length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="Belum ada tugas"
                  description="Catat tugas beserta tenggatnya supaya tidak ada yang terlewat."
                  action={
                    <Button onClick={() => setTaskFormOpen(true)}>
                      <Plus aria-hidden="true" />
                      Tambah Tugas
                    </Button>
                  }
                />
              ) : upcoming.length === 0 ? (
                <EmptyState icon={ClipboardList} title="Tidak ada tenggat dalam waktu dekat" description="Semua tugas aktif tidak punya tenggat, atau sudah selesai." />
              ) : (
                <ul className="space-y-3">
                  {upcoming.map((t) => (
                    <li key={t.id}>
                      <TaskRow task={t} course={t.courseId ? courseById.get(t.courseId) : undefined} now={now} compact />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <TaskFormDialog open={taskFormOpen} onOpenChange={setTaskFormOpen} />
      <SessionFormDialog open={sessionFormOpen} onOpenChange={setSessionFormOpen} defaultDay={now.getDay() as DayOfWeek} />
      <SessionDialogs session={selectedSession} onClose={() => setSelectedSession(null)} />
    </>
  )
}
