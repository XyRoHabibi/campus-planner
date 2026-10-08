import { FALLBACK_COURSE_COLOR } from '@/lib/constants/course-colors'
import { cn } from '@/lib/utils/cn'
import type { Course } from '@/types'

interface CourseTagProps {
  course?: Pick<Course, 'name' | 'color'> | null
  className?: string
}

/** Titik warna + nama mata kuliah: warna hanya pelengkap, teks selalu ada. */
export function CourseTag({ course, className }: CourseTagProps) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted', className)}>
      <span
        aria-hidden="true"
        className="size-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: course?.color ?? FALLBACK_COURSE_COLOR }}
      />
      <span className="truncate">{course?.name ?? 'Tanpa mata kuliah'}</span>
    </span>
  )
}
