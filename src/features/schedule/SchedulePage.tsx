import { addDays, format, isSameDay } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { CalendarOff, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'

import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState, ErrorState, OfflineUnavailable } from '@/components/shared/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCourses } from '@/features/courses/hooks'
import { SessionDialogs } from '@/features/schedule/components/SessionDialogs'
import { SessionFormDialog } from '@/features/schedule/components/SessionFormDialog'
import { SessionRow } from '@/features/schedule/components/SessionRow'
import { useSessions } from '@/features/schedule/hooks'
import { useSettings } from '@/features/settings/settings-context'
import { useNow } from '@/hooks/useNow'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { toUserMessage } from '@/lib/errors'
import { queryGate } from '@/lib/query/gate'
import { sessionStates, sessionsOnDay } from '@/lib/utils/agenda'
import { cn } from '@/lib/utils/cn'
import { DAY_NAMES, formatLongDate } from '@/lib/utils/dates'
import { toISODate, weekDates } from '@/lib/utils/schedule'
import type { ClassSession, DayOfWeek } from '@/types'

type View = 'day' | 'week'

export function SchedulePage() {
  const now = useNow()
  const { settings } = useSettings()
  const online = useOnlineStatus()
  const sessions = useSessions()
  const courses = useCourses()
  const [view, setView] = useState<View>('day')
  const [selected, setSelected] = useState(() => new Date())
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const week = useMemo(() => weekDates(selected, settings.weekStart), [selected, settings.weekStart])
  const courseById = useMemo(() => new Map((courses.data ?? []).map((c) => [c.id, c])), [courses.data])
  const list = sessions.data ?? []
  const first = week[0]
  const last = week[6]
  const rangeLabel =
    first && last ? `${format(first, 'd MMM', { locale: localeId })} – ${format(last, 'd MMM yyyy', { locale: localeId })}` : ''

  const gate = queryGate(sessions, courses)
  const error = gate.state === 'error' ? gate.error : null
  const offline = gate.state === 'offline'
  const loading = gate.state === 'loading'

  const agendaFor = (date: Date) => {
    const items = sessionsOnDay(list, date)
    const states = isSameDay(date, now) ? sessionStates(items, now) : undefined
    return { items, states }
  }

  const renderDay = (date: Date) => {
    const { items, states } = agendaFor(date)
    return items.length === 0 ? (
      <p className="rounded-card border border-dashed border-border bg-surface px-4 py-5 text-center text-sm text-muted">
        Tidak ada kuliah.
      </p>
    ) : (
      <ul className="space-y-3">
        {items.map((s) => (
          <li key={s.id}>
            <SessionRow session={s} course={courseById.get(s.courseId)} state={states?.get(s.id)} onSelect={setSelectedSession} />
          </li>
        ))}
      </ul>
    )
  }

  const addButton = (
    <Button onClick={() => setFormOpen(true)} disabled={!online} title={online ? undefined : 'Perlu koneksi internet'}>
      <Plus aria-hidden="true" />
      Tambah Jadwal
    </Button>
  )

  return (
    <>
      <PageHeader
        title="Jadwal"
        description="Jadwal kuliah harian dan mingguan."
        actions={<span className="hidden md:inline-flex">{addButton}</span>}
      />

      {/* Kontrol tampilan & navigasi minggu */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Pilih tampilan" className="inline-flex rounded-full border border-border bg-surface p-1">
          {(['day', 'week'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={cn(
                'h-9 rounded-full px-4 text-sm font-medium transition-colors',
                view === v ? 'bg-primary-soft font-semibold text-primary' : 'text-muted hover:text-foreground',
              )}
            >
              {v === 'day' ? 'Harian' : 'Mingguan'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Minggu sebelumnya" onClick={() => setSelected((d) => addDays(d, -7))}>
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span className="min-w-36 text-center text-sm font-medium tabular-nums" aria-live="polite">
            {rangeLabel}
          </span>
          <Button variant="ghost" size="icon" aria-label="Minggu berikutnya" onClick={() => setSelected((d) => addDays(d, 7))}>
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
          retrying={sessions.isFetching || courses.isFetching}
          onRetry={() => {
            void sessions.refetch()
            void courses.refetch()
          }}
        />
      ) : offline ? (
        <OfflineUnavailable />
      ) : loading ? (
        <div role="status" aria-label="Memuat jadwal" className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-card border border-dashed border-border bg-surface">
          <EmptyState
            icon={CalendarOff}
            title="Belum ada jadwal kuliah"
            description={
              (courses.data ?? []).length === 0
                ? 'Tambahkan mata kuliah terlebih dulu, lalu susun jadwalnya di sini.'
                : 'Tambahkan sesi kuliah pertamamu agar agenda harian muncul di Beranda.'
            }
            action={addButton}
          />
        </div>
      ) : view === 'day' ? (
        <section aria-label="Jadwal harian">
          <div role="group" aria-label="Pilih hari" className="mb-4 grid grid-cols-7 gap-1.5">
            {week.map((date) => {
              const active = isSameDay(date, selected)
              const today = isSameDay(date, now)
              return (
                <button
                  key={toISODate(date)}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setSelected(date)}
                  className={cn(
                    'flex min-h-14 flex-col items-center justify-center rounded-xl border text-xs font-medium transition-colors',
                    active ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-surface text-muted hover:text-foreground',
                    today && !active && 'border-primary/50',
                  )}
                >
                  <span>{format(date, 'EEE', { locale: localeId })}</span>
                  <span className="text-base font-bold tabular-nums">{format(date, 'd')}</span>
                  {today && <span className="sr-only">(hari ini)</span>}
                  {today && <span aria-hidden="true" className="mt-0.5 size-1 rounded-full bg-current" />}
                </button>
              )
            })}
          </div>
          <h2 className="mb-3 text-base font-semibold">
            {formatLongDate(selected)}
            {isSameDay(selected, now) && <Badge tone="primary" className="ml-2 align-middle">Hari ini</Badge>}
          </h2>
          {renderDay(selected)}
        </section>
      ) : (
        <section aria-label="Jadwal mingguan" className="grid gap-5 lg:grid-cols-2">
          {week.map((date) => (
            <div key={toISODate(date)}>
              <h2 className="mb-2 flex items-center gap-2 text-base font-semibold">
                {DAY_NAMES[date.getDay() as DayOfWeek]}
                <span className="text-sm font-normal text-muted">{format(date, 'd MMM', { locale: localeId })}</span>
                {isSameDay(date, now) && <Badge tone="primary">Hari ini</Badge>}
              </h2>
              {renderDay(date)}
            </div>
          ))}
        </section>
      )}

      {/* Aksi tambah di HP, di atas bottom nav. */}
      {!loading && !offline && !error && list.length > 0 && (
        <Button
          size="lg"
          onClick={() => setFormOpen(true)}
          disabled={!online}
          className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-20 rounded-full shadow-lg md:hidden"
        >
          <Plus aria-hidden="true" />
          Tambah Jadwal
        </Button>
      )}

      <SessionFormDialog open={formOpen} onOpenChange={setFormOpen} defaultDay={view === 'day' ? (selected.getDay() as DayOfWeek) : undefined} />
      <SessionDialogs session={selectedSession} onClose={() => setSelectedSession(null)} />
    </>
  )
}

