import { CircleCheck, MapPin, Radio, User } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { FALLBACK_COURSE_COLOR } from '@/lib/constants/course-colors'
import { cn } from '@/lib/utils/cn'
import type { SessionState } from '@/lib/utils/agenda'
import type { ClassSession, Course } from '@/types'

interface SessionRowProps {
  session: ClassSession
  course?: Course
  state?: SessionState
  /** Jika diisi, baris menjadi tombol yang membuka detail (prd.md §9.2). */
  onSelect?: (session: ClassSession) => void
}

function StateBadge({ state }: { state: SessionState }) {
  if (state === 'ongoing')
    return (
      <Badge tone="success">
        <Radio aria-hidden="true" />
        Berlangsung
      </Badge>
    )
  if (state === 'next') return <Badge tone="primary">Berikutnya</Badge>
  if (state === 'finished')
    return (
      <Badge>
        <CircleCheck aria-hidden="true" />
        Selesai
      </Badge>
    )
  return null
}

/** Baris jadwal. Isi memakai <span> agar valid di dalam <button>; warna selalu ditemani nama mata kuliah. */
export function SessionRow({ session, course, state, onSelect }: SessionRowProps) {
  const instructor = session.instructor ?? course?.instructor
  const className = cn(
    'flex w-full gap-3 rounded-card border border-border bg-surface p-3.5 text-left shadow-card',
    state === 'finished' && 'opacity-70',
    onSelect && 'transition-colors hover:border-primary/40',
  )
  const content = (
    <>
      <span className="block w-[4.25rem] shrink-0 text-sm tabular-nums">
        <span className="block font-semibold">{session.startTime}</span>
        <span className="block text-muted">{session.endTime}</span>
      </span>
      <span
        aria-hidden="true"
        className="w-1 shrink-0 rounded-full"
        style={{ backgroundColor: course?.color ?? FALLBACK_COURSE_COLOR }}
      />
      <span className="block min-w-0 flex-1">
        <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <span className="min-w-0 text-[0.9375rem] font-semibold leading-snug">{course?.name ?? 'Mata kuliah'}</span>
          {state && <StateBadge state={state} />}
        </span>
        <span className="mt-1 flex items-center gap-1.5 text-sm text-muted">
          <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="truncate">{session.room ?? 'Ruangan belum ditentukan'}</span>
        </span>
        {instructor && (
          <span className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
            <User aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate">{instructor}</span>
          </span>
        )}
      </span>
    </>
  )

  return onSelect ? (
    <button type="button" className={className} onClick={() => onSelect(session)}>
      {content}
    </button>
  ) : (
    <div className={className}>{content}</div>
  )
}
