import { CircleAlert, LoaderCircle } from 'lucide-react'

import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { useCourseImpact, useDeleteCourse } from '@/features/courses/hooks'
import { toUserMessage } from '@/lib/errors'
import type { Course } from '@/types'

interface DeleteCourseDialogProps {
  course: Course
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}

/**
 * Konfirmasi hapus mata kuliah. Dampaknya dihitung dari server saat dialog dibuka (bukan dari cache)
 * dan dijelaskan sebelum pengguna menyetujui — tidak ada penghapusan diam-diam (prd.md §9.3).
 */
export function DeleteCourseDialog({ course, open, onOpenChange, onDeleted }: DeleteCourseDialogProps) {
  const impact = useCourseImpact(course.id, open)
  const del = useDeleteCourse()

  const confirm = () => {
    del.mutate(course.id, { onSuccess: onDeleted })
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!del.isPending) {
          del.reset()
          onOpenChange(next)
        }
      }}
      title={`Hapus “${course.name}”?`}
      confirmLabel="Hapus mata kuliah"
      pending={del.isPending}
      confirmDisabled={!impact.isSuccess}
      onConfirm={confirm}
      description={
        <div className="space-y-3">
          {impact.isPending && (
            <p role="status" className="flex items-center gap-2">
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              Memeriksa jadwal dan tugas yang terhubung…
            </p>
          )}
          {impact.isError && (
            <div role="alert" className="space-y-2 rounded-lg bg-danger-soft p-3 text-danger-fg">
              <p>{toUserMessage(impact.error)} Dampak penghapusan belum bisa dipastikan.</p>
              <Button size="sm" variant="secondary" onClick={() => void impact.refetch()} disabled={impact.isFetching}>
                Coba lagi
              </Button>
            </div>
          )}
          {impact.isSuccess &&
            (impact.data.sessions === 0 && impact.data.tasks === 0 ? (
              <p>Mata kuliah ini belum dipakai oleh jadwal maupun tugas.</p>
            ) : (
              <ul className="list-disc space-y-1.5 pl-5 text-foreground">
                {impact.data.sessions > 0 && (
                  <li>
                    <strong>{impact.data.sessions} jadwal kuliah</strong> akan ikut dihapus.
                  </li>
                )}
                {impact.data.tasks > 0 && (
                  <li>
                    <strong>{impact.data.tasks} tugas tidak dihapus</strong>, tetapi dilepas dari mata kuliah ini dan
                    tampil sebagai “Tanpa mata kuliah”.
                  </li>
                )}
              </ul>
            ))}
          <p>Tindakan ini tidak dapat dibatalkan.</p>
          {del.isError && (
            <p role="alert" className="flex gap-2 rounded-lg bg-danger-soft p-3 text-danger-fg">
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>{toUserMessage(del.error)} Mata kuliah belum dihapus.</span>
            </p>
          )}
        </div>
      }
    />
  )
}
