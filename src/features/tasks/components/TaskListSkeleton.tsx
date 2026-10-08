import { Skeleton } from '@/components/ui/skeleton'

export function TaskListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Memuat tugas" className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="rounded-card border border-border bg-surface p-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-3 h-3 w-1/3" />
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-28 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}
