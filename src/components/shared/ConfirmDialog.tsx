import * as AlertDialog from '@radix-ui/react-alert-dialog'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  confirmLabel: string
  onConfirm: () => void
  pending?: boolean
  /** Menonaktifkan tombol konfirmasi (mis. selagi dampak aksi belum selesai dihitung). */
  confirmDisabled?: boolean
  destructive?: boolean
}

/**
 * Konfirmasi aksi (terutama hapus; prd.md §9.3/§9.5). Dipakai untuk hapus mata kuliah (Tahap 4)
 * dan nanti hapus tugas (Tahap 6).
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  pending,
  confirmDisabled,
  destructive = true,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-card border border-border bg-surface p-5 shadow-xl">
          <AlertDialog.Title className="text-lg font-semibold">{title}</AlertDialog.Title>
          <AlertDialog.Description asChild>
            <div className="mt-2 text-sm text-muted">{description}</div>
          </AlertDialog.Description>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary" disabled={pending}>
                Batal
              </Button>
            </AlertDialog.Cancel>
            <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm} disabled={pending || confirmDisabled}>
              {pending ? 'Memproses…' : confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
