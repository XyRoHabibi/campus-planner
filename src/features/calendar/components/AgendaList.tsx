import { isSameDay } from 'date-fns'
import { useMemo } from 'react'

import { SessionRow } from '@/features/schedule/components/SessionRow'
import { TaskRow } from '@/features/tasks/components/TaskRow'
import { sessionStates, sortSessionsByTime } from '@/lib/utils/agenda'
import type { CalendarItem } from '@/lib/utils/calendar'
import type { ClassSession, Course } from '@/types'

interface AgendaListProps {
  date: Date
  items: CalendarItem[]
  courseById: Map<string, Course>
  now: Date
  onSelectSession: (session: ClassSession) => void
}

/**
 * Agenda satu hari sebagai daftar vertikal: kelas (ketuk → detail jadwal) dan tenggat tugas (ketuk → detail tugas),
 * urut menurut jam. Tugas terlambat dan selesai memakai tampilan TaskRow (ikon + teks, bukan warna saja).
 */
export function AgendaList({ date, items, courseById, now, onSelectSession }: AgendaListProps) {
  const states = useMemo(() => {
    if (!isSameDay(date, now)) return undefined
    const todays = sortSessionsByTime(items.flatMap((i) => (i.kind === 'session' ? [i.session] : [])))
    return sessionStates(todays, now)
  }, [date, items, now])

  if (items.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-border bg-surface px-4 py-5 text-center text-sm text-muted">
        Tidak ada kuliah atau tenggat.
      </p>
    )
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.key}>
          {item.kind === 'session' ? (
            <SessionRow
              session={item.session}
              course={courseById.get(item.session.courseId)}
              state={states?.get(item.session.id)}
              onSelect={onSelectSession}
            />
          ) : (
            <TaskRow task={item.task} course={item.task.courseId ? courseById.get(item.task.courseId) : undefined} now={now} compact />
          )}
        </li>
      ))}
    </ul>
  )
}
