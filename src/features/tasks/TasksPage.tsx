import { ClipboardList, Plus, SearchX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState, ErrorState, OfflineUnavailable } from '@/components/shared/states'
import { Button } from '@/components/ui/button'
import { SearchInput, SelectField } from '@/components/ui/field'
import { useCourses } from '@/features/courses/hooks'
import { TaskFormDialog } from '@/features/tasks/components/TaskFormDialog'
import { TaskListSkeleton } from '@/features/tasks/components/TaskListSkeleton'
import { TaskRow } from '@/features/tasks/components/TaskRow'
import { useTasks } from '@/features/tasks/hooks'
import { useNow } from '@/hooks/useNow'
import { toUserMessage } from '@/lib/errors'
import { queryGate } from '@/lib/query/gate'
import { isActiveTask, isOverdue, matchesDuePeriod, priorityRank, type DuePeriod } from '@/lib/utils/agenda'
import { cn } from '@/lib/utils/cn'
import type { Priority, Task } from '@/types'

type StatusFilter = 'active' | 'overdue' | 'done' | 'all'
type SortKey = 'due' | 'priority' | 'created'

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'active', label: 'Aktif' },
  { key: 'overdue', label: 'Terlambat' },
  { key: 'done', label: 'Selesai' },
  { key: 'all', label: 'Semua' },
]

const time = (iso: string | null) => (iso === null ? Number.POSITIVE_INFINITY : new Date(iso).getTime())

const sorters: Record<SortKey, (a: Task, b: Task) => number> = {
  due: (a, b) => time(a.dueAt) - time(b.dueAt),
  priority: (a, b) => priorityRank[b.priority] - priorityRank[a.priority] || time(a.dueAt) - time(b.dueAt),
  created: (a, b) => time(b.createdAt) - time(a.createdAt),
}

export function TasksPage() {
  const now = useNow()
  const tasks = useTasks()
  const courses = useCourses()

  // Beranda menautkan ke /tasks?status=overdue; nilai tak dikenal jatuh ke "Aktif".
  const [params] = useSearchParams()
  const [status, setStatus] = useState<StatusFilter>(() => {
    const wanted = STATUS_TABS.find((tab) => tab.key === params.get('status'))
    return wanted?.key ?? 'active'
  })
  const [query, setQuery] = useState('')
  const [courseId, setCourseId] = useState('')
  const [priority, setPriority] = useState<'' | Priority>('')
  const [sort, setSort] = useState<SortKey>('due')
  const [duePeriod, setDuePeriod] = useState<DuePeriod>('all')
  const [formOpen, setFormOpen] = useState(false)

  const courseById = useMemo(() => new Map((courses.data ?? []).map((c) => [c.id, c])), [courses.data])
  const all = useMemo(() => tasks.data ?? [], [tasks.data])

  const counts = useMemo(
    () => ({
      active: all.filter(isActiveTask).length,
      overdue: all.filter((t) => isOverdue(t, now)).length,
      done: all.filter((t) => !isActiveTask(t)).length,
      all: all.length,
    }),
    [all, now],
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all
      .filter((t) => {
        if (status === 'active' && !isActiveTask(t)) return false
        if (status === 'overdue' && !isOverdue(t, now)) return false
        if (status === 'done' && isActiveTask(t)) return false
        if (courseId && t.courseId !== courseId) return false
        if (priority && t.priority !== priority) return false
        if (!matchesDuePeriod(t, duePeriod, now)) return false
        return q === '' || t.title.toLowerCase().includes(q)
      })
      .sort(sorters[sort])
  }, [all, now, status, query, courseId, priority, duePeriod, sort])

  const hasFilter = query !== '' || courseId !== '' || priority !== '' || duePeriod !== 'all' || status !== 'active'
  const resetFilters = () => {
    setStatus('active')
    setQuery('')
    setCourseId('')
    setPriority('')
    setDuePeriod('all')
  }

  const gate = queryGate(tasks, courses)
  const error = gate.state === 'error' ? gate.error : null
  const offline = gate.state === 'offline'
  const loading = gate.state === 'loading'
  const addTask = () => setFormOpen(true)

  return (
    <>
      <PageHeader
        title="Tugas"
        description="Pantau tenggat, prioritas, dan progres tugasmu."
        actions={
          <Button onClick={addTask} className="hidden md:inline-flex">
            <Plus aria-hidden="true" />
            Tambah Tugas
          </Button>
        }
      />

      <div className="space-y-3">
        <div role="group" aria-label="Filter status tugas" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:gap-2 sm:px-0 [&::-webkit-scrollbar]:hidden">
          {STATUS_TABS.map(({ key, label }) => {
            const selected = status === key
            return (
              <button
                key={key}
                type="button"
                aria-pressed={selected}
                onClick={() => setStatus(key)}
                className={cn(
                  'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors sm:gap-2 sm:px-4',
                  selected
                    ? 'border-primary bg-primary-soft font-semibold text-primary'
                    : 'border-border bg-surface text-muted hover:text-foreground',
                )}
              >
                {label}
                <span className="tabular-nums text-xs">{loading || offline || error ? '–' : counts[key]}</span>
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <SearchInput
            label="Cari tugas"
            placeholder="Cari judul tugas…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="col-span-2 lg:col-span-4"
          />
          <SelectField label="Filter mata kuliah" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">Semua mata kuliah</option>
            {(courses.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Filter prioritas" value={priority} onChange={(e) => setPriority(e.target.value as '' | Priority)}>
            <option value="">Semua prioritas</option>
            <option value="high">Tinggi</option>
            <option value="medium">Sedang</option>
            <option value="low">Rendah</option>
          </SelectField>
          <SelectField label="Filter periode tenggat" value={duePeriod} onChange={(e) => setDuePeriod(e.target.value as DuePeriod)}>
            <option value="all">Semua tenggat</option>
            <option value="today">Tenggat hari ini</option>
            <option value="week">Tenggat 7 hari ke depan</option>
            <option value="month">Tenggat bulan ini</option>
            <option value="none">Tanpa tenggat</option>
          </SelectField>
          <SelectField label="Urutkan tugas" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} >
            <option value="due">Urut: Tenggat</option>
            <option value="priority">Urut: Prioritas</option>
            <option value="created">Urut: Terbaru</option>
          </SelectField>
        </div>
      </div>

      <section aria-label="Daftar tugas" className="mt-5">
        {error ? (
          <ErrorState
            message={toUserMessage(error)}
            retrying={tasks.isFetching || courses.isFetching}
            onRetry={() => {
              void tasks.refetch()
              void courses.refetch()
            }}
          />
        ) : offline ? (
          <OfflineUnavailable />
        ) : loading ? (
          <TaskListSkeleton rows={5} />
        ) : all.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Belum ada tugas"
            description="Mulai dengan mencatat tugas pertamamu beserta tenggat dan prioritasnya."
            action={
              <Button onClick={addTask}>
                <Plus aria-hidden="true" />
                Tambah Tugas
              </Button>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="Tidak ada tugas yang cocok"
            description="Coba ubah kata kunci atau filter yang dipakai."
            action={
              hasFilter && (
                <Button variant="secondary" onClick={resetFilters}>
                  Reset filter
                </Button>
              )
            }
          />
        ) : (
          <>
            <p aria-live="polite" className="mb-3 text-sm text-muted">
              {visible.length} tugas
            </p>
            <ul className="space-y-3">
              {visible.map((t) => (
                <li key={t.id}>
                  <TaskRow task={t} course={t.courseId ? courseById.get(t.courseId) : undefined} now={now} />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* Aksi tambah di HP: mudah dijangkau jempol, di atas bottom nav; ruang bawah konten sudah disediakan. */}
      {!loading && !offline && !error && all.length > 0 && (
      <Button
        size="lg"
        onClick={addTask}
        className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-20 rounded-full shadow-lg md:hidden"
      >
        <Plus aria-hidden="true" />
        Tambah Tugas
      </Button>
      )}

      <TaskFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </>
  )
}
