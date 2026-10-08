import { Circle, CircleCheck, LoaderCircle, Paperclip } from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { CourseTag } from '@/components/shared/CourseTag'
import { DueBadge, PriorityBadge, StatusBadge } from '@/features/tasks/components/TaskBadges'
import { useSetTaskStatus } from '@/features/tasks/hooks'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { toUserMessage } from '@/lib/errors'
import { isOverdue } from '@/lib/utils/agenda'
import { cn } from '@/lib/utils/cn'
import type { Course, Task } from '@/types'

interface TaskRowProps {
  task: Task
  course?: Course
  now: Date
  /** Versi ringkas untuk dashboard: tanpa badge status/prioritas. */
  compact?: boolean
}

/**
 * Kartu tugas. Judul adalah tautan ke detail (area klik seluruh kartu lewat ::after); tombol selesai/buka kembali
 * berada di atasnya (z-10) sehingga tidak ada elemen interaktif bersarang.
 */
export function TaskRow({ task, course, now, compact }: TaskRowProps) {
  const online = useOnlineStatus()
  const setStatus = useSetTaskStatus()
  const overdue = isOverdue(task, now)
  const done = task.status === 'done'

  const toggle = () =>
    setStatus.mutate(
      { id: task.id, status: done ? 'todo' : 'done' },
      {
        onSuccess: () => toast.success(done ? 'Tugas dibuka kembali' : 'Tugas ditandai selesai', { description: task.title }),
        onError: (error) => toast.error('Belum bisa mengubah status', { description: toUserMessage(error) }),
      },
    )

  return (
    <div
      className={cn(
        'relative rounded-card border bg-surface p-4 shadow-card transition-colors hover:border-primary/40',
        overdue ? 'border-danger/50 border-l-4 border-l-danger' : 'border-border',
      )}
    >
      <div className="flex items-start gap-1">
        <button
          type="button"
          onClick={toggle}
          disabled={setStatus.isPending || !online}
          aria-pressed={done}
          aria-label={`${done ? 'Buka kembali' : 'Tandai selesai'}: ${task.title}`}
          title={online ? (done ? 'Buka kembali' : 'Tandai selesai') : 'Perlu koneksi internet'}
          className="relative z-10 -ml-2 -mt-2.5 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:text-primary disabled:opacity-60"
        >
          {setStatus.isPending ? (
            <LoaderCircle aria-hidden="true" className="size-6 animate-spin" />
          ) : done ? (
            <CircleCheck aria-hidden="true" className="size-6 text-success-fg" />
          ) : (
            <Circle aria-hidden="true" className="size-6" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <Link
              to={`/tasks/${task.id}`}
              className={cn(
                'min-w-0 text-[0.9375rem] font-semibold leading-snug after:absolute after:inset-0 after:content-[""]',
                done && 'text-muted line-through',
              )}
            >
              {task.title}
            </Link>
            {task.attachmentCount > 0 && (
              <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted">
                <Paperclip aria-hidden="true" className="size-3.5" />
                <span className="sr-only">Lampiran: </span>
                {task.attachmentCount}
              </span>
            )}
          </div>
          <CourseTag course={course} className="mt-1.5" />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <DueBadge task={task} now={now} />
            {!compact && <PriorityBadge priority={task.priority} />}
            {!compact && <StatusBadge status={task.status} />}
          </div>
        </div>
      </div>
    </div>
  )
}
