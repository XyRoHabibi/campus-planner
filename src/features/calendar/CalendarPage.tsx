import { format, isSameDay } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { CalendarOff, ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'

import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState, ErrorState, OfflineUnavailable } from '@/components/shared/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AgendaList } from '@/features/calendar/components/AgendaList'
import { MonthGrid } from '@/features/calendar/components/MonthGrid'
import { useCourses } from '@/features/courses/hooks'
import { SessionDialogs } from '@/features/schedule/components/SessionDialogs'
import { useSessions } from '@/features/schedule/hooks'
import { useTasks } from '@/features/tasks/hooks'
import { useSettings } from '@/features/settings/settings-context'
import { useNow } from '@/hooks/useNow'
import { toUserMessage } from '@/lib/errors'
import { queryGate } from '@/lib/query/gate'
import { cn } from '@/lib/utils/cn'
import {
  buildMonthGrid,
  indexTasksByDate,
  itemsForDate,
  shiftDate,
  type CalendarView,
} from '@/lib/utils/calendar'
import { DAY_NAMES, formatLongDate } from '@/lib/utils/dates'
import { toISODate, weekDates } from '@/lib/utils/schedule'
import type { ClassSession, DayOfWeek } from '@/types'

const VIEWS: { key: CalendarView; label: string }[] = [
  { key: 'month', label: 'Bulan' },
  { key: 'week', label: 'Minggu' },
  { key: 'day', label: 'Hari' },
]
const UNIT = { month: 'Bulan', week: 'Minggu', day: 'Hari' } as const

export function CalendarPage() {
  const now = useNow()
  const { settings } = useSettings()
  const sessions = useSessions()
  const tasks = useTasks()
  const courses = useCourses()
  const [view, setView] = useState<CalendarView>('month')
  const [selected, setSelected] = useState(() => new Date())
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null)

  const courseById = useMemo(() => new Map((courses.data ?? []).map((c) => [c.id, c])), [courses.data])
  const sessionList = useMemo(() => sessions.data ?? [], [sessions.data])
  const tasksByDate = useMemo(() => indexTasksByDate(tasks.data ?? []), [tasks.data])
  const itemsFor = useMemo(() => (date: Date) => itemsForDate(date, sessionList, tasksByDate), [sessionList, tasksByDate])

  const weeks = useMemo(() => buildMonthGrid(selected, settings.weekStart), [selected, settings.weekStart])
  const week = useMemo(() => weekDates(selected, settings.weekStart), [selected, settings.weekStart])
  const first = week[0]
  const last = week[6]

  const rangeLabel =
    view === 'month'
      ? format(selected, 'MMMM yyyy', { locale: localeId })
      : view === 'week' && first && last
        ? `${format(first, 'd MMM', { locale: localeId })} – ${format(last, 'd MMM yyyy', { locale: localeId })}`
        : formatLongDate(selected)

  const gate = queryGate(sessions, tasks, courses)
  const error = gate.state === 'error' ? gate.error : null
  const offline = gate.state === 'offline'
  const loading = gate.state === 'loading'
  const hasAnything = sessionList.length > 0 || (tasks.data ?? []).some((t) => t.dueAt !== null)

  const agenda = (date: Date) => (
    <AgendaList date={date} items={itemsFor(date)} courseById={courseById} now={now} onSelectSession={setSelectedSession} />
  )

  const dayHeading = (date: Date) => (
    <h2 className="mb-3 flex flex-wrap items-center gap-2 text-base font-semibold">
      {formatLongDate(date)}
      {isSameDay(date, now) && <Badge tone="primary">Hari ini</Badge>}
    </h2>
  )

  return (
    <>
      <PageHeader title="Kalender" description="Jadwal kuliah dan tenggat tugas dalam satu kalender." />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Pilih tampilan kalender" className="inline-flex rounded-full border border-border bg-surface p-1">
          {VIEWS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={view === key}
              onClick={() => setView(key)}
              className={cn(
                'h-9 rounded-full px-4 text-sm font-medium transition-colors',
                view === key ? 'bg-primary-soft font-semibold text-primary' : 'text-muted hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label={`${UNIT[view]} sebelumnya`} onClick={() => setSelected((d) => shiftDate(d, view, -1))}>
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span className="min-w-36 text-center text-sm font-semibold capitalize" aria-live="polite">
            {rangeLabel}
          </span>
          <Button variant="ghost" size="icon" aria-label={`${UNIT[view]} berikutnya`} onClick={() => setSelected((d) => shiftDate(d, view, 1))}>
            <ChevronRight aria-hidden="true" />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setSelected(new Date())}>
            Hari ini
          </Button>
        </div>
      </div>

      {error ? (
        <ErrorState
          message={toUserMessage(error)}
          retrying={sessions.isFetching || tasks.isFetching || courses.isFetching}
          onRetry={() => {
            void sessions.refetch()
            void tasks.refetch()
            void courses.refetch()
          }}
        />
      ) : offline ? (
        <OfflineUnavailable />
      ) : loading ? (
        <div role="status" aria-label="Memuat kalender" className="space-y-3">
          <Skeleton className="h-[22rem] w-full" />
        </div>
      ) : !hasAnything ? (
        <div className="rounded-card border border-dashed border-border bg-surface">
          <EmptyState
            icon={CalendarOff}
            title="Belum ada jadwal atau tenggat"
            description="Kalender akan terisi setelah kamu menambahkan jadwal kuliah atau tugas bertenggat."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link to="/schedule">Ke Jadwal</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link to="/tasks">Ke Tugas</Link>
                </Button>
              </div>
            }
          />
        </div>
      ) : view === 'month' ? (
        <div className="space-y-5 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6 lg:space-y-0">
          <MonthGrid weeks={weeks} selected={selected} now={now} itemsFor={itemsFor} courseById={courseById} onSelect={setSelected} />
          <section aria-label="Agenda hari terpilih">
            {dayHeading(selected)}
            {agenda(selected)}
          </section>
        </div>
      ) : view === 'week' ? (
        <section aria-label="Agenda mingguan" className="grid gap-5 lg:grid-cols-2">
          {week.map((date) => (
            <div key={toISODate(date)}>
              <h2 className="mb-2 flex flex-wrap items-center gap-2 text-base font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setSelected(date)
                    setView('day')
                  }}
                  className="rounded underline-offset-4 hover:underline"
                  aria-label={`Buka tampilan hari ${formatLongDate(date)}`}
                >
                  {DAY_NAMES[date.getDay() as DayOfWeek]}
                </button>
                <span className="text-sm font-normal text-muted">{format(date, 'd MMM', { locale: localeId })}</span>
                {isSameDay(date, now) && <Badge tone="primary">Hari ini</Badge>}
              </h2>
              {agenda(date)}
            </div>
          ))}
        </section>
      ) : (
        <section aria-label="Agenda harian">
          {dayHeading(selected)}
          {agenda(selected)}
        </section>
      )}

      <SessionDialogs session={selectedSession} onClose={() => setSelectedSession(null)} />
    </>
  )
}
