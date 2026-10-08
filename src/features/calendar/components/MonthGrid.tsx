import { addDays, format, isSameDay, isSameMonth } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { CircleCheck, Clock, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, type KeyboardEvent } from 'react'

import { FALLBACK_COURSE_COLOR } from '@/lib/constants/course-colors'
import { cn } from '@/lib/utils/cn'
import { taskMarker, summarizeItems, type CalendarItem } from '@/lib/utils/calendar'
import { toISODate } from '@/lib/utils/schedule'
import type { Course } from '@/types'

interface MonthGridProps {
  weeks: Date[][]
  /** Tanggal terpilih; juga menentukan bulan yang ditampilkan. */
  selected: Date
  now: Date
  itemsFor: (date: Date) => CalendarItem[]
  courseById: Map<string, Course>
  onSelect: (date: Date) => void
}

const markerIcon = { overdue: TriangleAlert, open: Clock, done: CircleCheck } as const
const markerText = { overdue: 'text-danger-fg', open: 'text-primary', done: 'text-success-fg' } as const

/** Teks lengkap untuk pembaca layar: tidak bergantung pada warna/ikon kecil di sel. */
function cellLabel(date: Date, s: ReturnType<typeof summarizeItems>) {
  const parts = [
    s.sessions > 0 && `${s.sessions} kelas`,
    s.tasks > 0 && `${s.tasks} tugas`,
    s.overdue > 0 && `${s.overdue} terlambat`,
    s.done > 0 && `${s.done} selesai`,
  ].filter(Boolean)
  return `${format(date, 'EEEE, d MMMM yyyy', { locale: localeId })}: ${parts.length > 0 ? parts.join(', ') : 'tidak ada agenda'}`
}

/**
 * Grid bulan. Setiap hari adalah tombol dengan penanda berupa IKON + ANGKA (kelas: titik berwarna mata kuliah + jumlah;
 * tugas: ikon terlambat/terbuka/selesai + jumlah). Di HP sel kecil dan agenda hari terpilih tampil di bawah grid;
 * di layar lebar sel memuat judul item. Keyboard: tombol panah memindahkan hari (roving tabindex), Tab melewati grid sekali.
 */
export function MonthGrid({ weeks, selected, now, itemsFor, courseById, onSelect }: MonthGridProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const refocus = useRef(false)

  // Setelah pindah hari lewat keyboard, fokus mengikuti sel baru (termasuk saat bulan berganti).
  useEffect(() => {
    if (!refocus.current) return
    refocus.current = false
    gridRef.current?.querySelector<HTMLElement>(`[data-date="${toISODate(selected)}"]`)?.focus()
  }, [selected])

  const onKeyDown = (e: KeyboardEvent) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key]
    if (step === undefined) return
    e.preventDefault()
    refocus.current = true
    onSelect(addDays(selected, step))
  }

  const headers = weeks[0] ?? []

  return (
    <div ref={gridRef} role="grid" aria-label={`Kalender ${format(selected, 'MMMM yyyy', { locale: localeId })}`} onKeyDown={onKeyDown} className="overflow-hidden rounded-card border border-border bg-surface shadow-card">
      <div role="row" className="grid grid-cols-7 border-b border-border bg-surface-muted">
        {headers.map((d) => (
          <div key={d.getDay()} role="columnheader" aria-label={format(d, 'EEEE', { locale: localeId })} className="py-2 text-center text-xs font-semibold text-muted">
            {format(d, 'EEE', { locale: localeId })}
          </div>
        ))}
      </div>
      {weeks.map((week) => (
        <div key={toISODate(week[0]!)} role="row" className="grid grid-cols-7 border-b border-border last:border-b-0">
          {week.map((date) => {
            const items = itemsFor(date)
            const summary = summarizeItems(items, now)
            const marker = taskMarker(summary)
            const Marker = marker ? markerIcon[marker] : null
            const today = isSameDay(date, now)
            const isSelected = isSameDay(date, selected)
            const outside = !isSameMonth(date, selected)
            const firstColor = (() => {
              const first = items.find((i) => i.kind === 'session')
              return first?.kind === 'session' ? (courseById.get(first.session.courseId)?.color ?? FALLBACK_COURSE_COLOR) : FALLBACK_COURSE_COLOR
            })()
            return (
              <button
                key={toISODate(date)}
                type="button"
                role="gridcell"
                data-date={toISODate(date)}
                tabIndex={isSelected ? 0 : -1}
                aria-selected={isSelected}
                aria-current={today ? 'date' : undefined}
                aria-label={cellLabel(date, summary)}
                onClick={() => onSelect(date)}
                className={cn(
                  'flex min-h-16 flex-col items-center gap-1 border-r border-border p-1 text-left transition-colors last:border-r-0 md:min-h-28 md:items-stretch md:p-1.5',
                  isSelected ? 'bg-primary-soft' : 'hover:bg-surface-muted',
                  outside && 'text-muted',
                )}
              >
                <span
                  className={cn(
                    'flex size-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums md:self-start',
                    today && 'bg-primary text-primary-foreground',
                    !today && outside && 'opacity-60',
                  )}
                >
                  {format(date, 'd')}
                </span>

                {/* Penanda ringkas: ikon/titik + angka (terbaca tanpa warna). */}
                <span aria-hidden="true" className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-[0.6875rem] font-semibold leading-none md:justify-start">
                  {summary.sessions > 0 && (
                    <span className="inline-flex items-center gap-0.5">
                      <span className="size-2 rounded-full" style={{ backgroundColor: firstColor }} />
                      {summary.sessions}
                    </span>
                  )}
                  {Marker && marker && (
                    <span className={cn('inline-flex items-center gap-0.5', markerText[marker])}>
                      <Marker className="size-3" />
                      {summary.tasks}
                    </span>
                  )}
                </span>

                {/* Layar lebar: judul item pertama agar kalender informatif tanpa membuka hari. */}
                <span aria-hidden="true" className="hidden w-full space-y-0.5 md:block">
                  {items.slice(0, 2).map((item) => (
                    <span key={item.key} className="block truncate rounded bg-surface-muted px-1 py-0.5 text-[0.6875rem] font-medium text-foreground">
                      {item.kind === 'session'
                        ? `${item.session.startTime} ${courseById.get(item.session.courseId)?.name ?? 'Kuliah'}`
                        : `${item.task.status === 'done' ? '✓ ' : ''}${item.task.title}`}
                    </span>
                  ))}
                  {items.length > 2 && <span className="block px-1 text-[0.6875rem] text-muted">+{items.length - 2} lagi</span>}
                </span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
