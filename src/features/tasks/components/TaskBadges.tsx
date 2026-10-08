import { ChevronDown, ChevronUp, ChevronsUp, CircleCheck, CircleDashed, Clock, LoaderCircle, TriangleAlert } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { isOverdue } from '@/lib/utils/agenda'
import { formatDue, formatOverdue } from '@/lib/utils/dates'
import type { Priority, Task, TaskStatus } from '@/types'

const priorityConfig = {
  high: { label: 'Prioritas tinggi', tone: 'danger', icon: ChevronsUp },
  medium: { label: 'Prioritas sedang', tone: 'warning', icon: ChevronUp },
  low: { label: 'Prioritas rendah', tone: 'success', icon: ChevronDown },
} as const

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { label, tone, icon: Icon } = priorityConfig[priority]
  return (
    <Badge tone={tone}>
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  )
}

const statusConfig = {
  todo: { label: 'Belum dikerjakan', tone: 'neutral', icon: CircleDashed },
  in_progress: { label: 'Sedang dikerjakan', tone: 'primary', icon: LoaderCircle },
  done: { label: 'Selesai', tone: 'success', icon: CircleCheck },
} as const

export function StatusBadge({ status }: { status: TaskStatus }) {
  const { label, tone, icon: Icon } = statusConfig[status]
  return (
    <Badge tone={tone}>
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  )
}

/** Tenggat: terlambat tampil beda (ikon + teks "Terlambat …"); tanpa tenggat tidak pernah terlambat. */
export function DueBadge({ task, now }: { task: Task; now: Date }) {
  if (task.dueAt === null) return <Badge>Tanpa tenggat</Badge>
  if (isOverdue(task, now)) {
    return (
      <Badge tone="danger">
        <TriangleAlert aria-hidden="true" />
        {formatOverdue(task.dueAt, now)}
      </Badge>
    )
  }
  return (
    <Badge tone={task.status === 'done' ? 'neutral' : 'primary'}>
      <Clock aria-hidden="true" />
      {formatDue(task.dueAt, task.dueHasTime, now)}
    </Badge>
  )
}
