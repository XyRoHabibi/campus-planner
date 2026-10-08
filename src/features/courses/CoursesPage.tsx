import { BookOpen, ChevronRight, Plus, User } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'

import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState, ErrorState, OfflineUnavailable } from '@/components/shared/states'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CourseFormDialog } from '@/features/courses/components/CourseFormDialog'
import { useCourses } from '@/features/courses/hooks'
import { useSessions } from '@/features/schedule/hooks'
import { useTasks } from '@/features/tasks/hooks'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { toUserMessage } from '@/lib/errors'
import { queryGate } from '@/lib/query/gate'
import { isActiveTask } from '@/lib/utils/agenda'

export function CoursesPage() {
  const online = useOnlineStatus()
  const courses = useCourses()
  const sessions = useSessions()
  const tasks = useTasks()
  const [formOpen, setFormOpen] = useState(false)

  // Hitungan ringkas hanya ditampilkan bila datanya berhasil dimuat (kegagalan di sini tidak menghalangi daftar).
  const stats = useMemo(() => {
    const map = new Map<string, { sessions: number; tasks: number }>()
    const bucket = (id: string) => map.get(id) ?? map.set(id, { sessions: 0, tasks: 0 }).get(id)!
    for (const s of sessions.data ?? []) bucket(s.courseId).sessions++
    for (const t of tasks.data ?? []) if (t.courseId && isActiveTask(t)) bucket(t.courseId).tasks++
    return map
  }, [sessions.data, tasks.data])
  const showStats = sessions.isSuccess && tasks.isSuccess

  const list = courses.data ?? []
  const gate = queryGate(courses)
  const addButton = (
    <Button onClick={() => setFormOpen(true)} disabled={!online} title={online ? undefined : 'Perlu koneksi internet'}>
      <Plus aria-hidden="true" />
      Tambah Mata Kuliah
    </Button>
  )

  return (
    <>
      <PageHeader
        title="Mata Kuliah"
        description="Kelola mata kuliah, dosen, dan warna identitasnya."
        actions={list.length > 0 ? addButton : undefined}
      />

      {gate.state === 'error' ? (
        <ErrorState message={toUserMessage(gate.error)} retrying={courses.isFetching} onRetry={() => void courses.refetch()} />
      ) : gate.state === 'offline' ? (
        <OfflineUnavailable />
      ) : gate.state === 'loading' ? (
        <div role="status" aria-label="Memuat mata kuliah" className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-card border border-dashed border-border bg-surface">
          <EmptyState
            icon={BookOpen}
            title="Belum ada mata kuliah"
            description="Tambahkan mata kuliahmu dulu, lalu susun jadwal dan tugas di atasnya."
            action={addButton}
          />
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {list.map((c) => {
            const s = stats.get(c.id) ?? { sessions: 0, tasks: 0 }
            return (
              <li key={c.id}>
                <Link
                  to={`/courses/${c.id}`}
                  className="group flex h-full gap-3 rounded-card border border-border bg-surface p-4 shadow-card transition-colors hover:border-primary/40"
                >
                  <span aria-hidden="true" className="w-1.5 shrink-0 self-stretch rounded-full" style={{ backgroundColor: c.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold leading-snug">{c.name}</p>
                    {(c.code || c.semester) && (
                      <p className="mt-0.5 text-xs font-medium text-muted">{[c.code, c.semester].filter(Boolean).join(' · ')}</p>
                    )}
                    {c.instructor && (
                      <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
                        <User aria-hidden="true" className="size-3.5 shrink-0" />
                        <span className="truncate">{c.instructor}</span>
                      </p>
                    )}
                    {showStats && (
                      <p className="mt-2 text-xs text-muted">
                        {s.sessions} jadwal · {s.tasks} tugas aktif
                      </p>
                    )}
                  </div>
                  <ChevronRight aria-hidden="true" className="mt-1 size-5 shrink-0 text-muted group-hover:text-primary" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <CourseFormDialog open={formOpen} onOpenChange={setFormOpen} usedColors={list.map((c) => c.color)} />
    </>
  )
}
