import { CircleAlert, LoaderCircle } from 'lucide-react'

import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { useDeleteTask, useTaskAttachmentTotal } from '@/features/tasks/hooks'
import { toUserMessage } from '@/lib/errors'
import type { Task } from '@/types'

interface DeleteTaskDialogProps {
  task: Task
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}

/**
 * Konfirmasi hapus tugas. Jumlah lampiran dihitung dari server saat dibuka; penghapusan baru boleh dikonfirmasi
 * setelah angkanya diketahui. File di Storage dibersihkan lebih dulu — bila gagal, tugas tidak dihapus (prd.md §9.5, §17).
 */
export function DeleteTaskDialog({ task, open, onOpenChange, onDeleted }: DeleteTaskDialogProps) {
  const total = useTaskAttachmentTotal(task.id, open)
  const del = useDeleteTask()

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!del.isPending) {
          del.reset()
          onOpenChange(next)
        }
      }}
      title={`Hapus “${task.title}”?`}
      confirmLabel="Hapus tugas"
      pending={del.isPending}
      confirmDisabled={!total.isSuccess}
      onConfirm={() => del.mutate(task.id, { onSuccess: onDeleted })}
      description={
        <div className="space-y-3">
          {total.isPending && (
            <p role="status" className="flex items-center gap-2">
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              Memeriksa lampiran…
            </p>
          )}
          {total.isError && (
            <div role="alert" className="space-y-2 rounded-lg bg-danger-soft p-3 text-danger-fg">
              <p>{toUserMessage(total.error)} Jumlah lampiran belum bisa dipastikan.</p>
              <Button size="sm" variant="secondary" onClick={() => void total.refetch()} disabled={total.isFetching}>
                Coba lagi
              </Button>
            </div>
          )}
          {total.isSuccess &&
            (total.data > 0 ? (
              <p className="text-foreground">
                <strong>{total.data} lampiran</strong> pada tugas ini akan ikut dihapus permanen dari penyimpanan. Jika ada
                file yang gagal dihapus, tugas tidak akan dihapus.
              </p>
            ) : (
              <p>Tugas ini tidak memiliki lampiran.</p>
            ))}
          <p>Tindakan ini tidak dapat dibatalkan.</p>
          {del.isError && (
            <p role="alert" className="flex gap-2 rounded-lg bg-danger-soft p-3 text-danger-fg">
              <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>{toUserMessage(del.error)}</span>
            </p>
          )}
        </div>
      }
    />
  )
}
