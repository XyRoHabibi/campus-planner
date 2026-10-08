import { X } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils/cn'

interface BottomSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
}

/** Lembar dari bawah layar untuk HP (dipakai menu "Lainnya"). Fokus & Esc ditangani Radix. */
export function BottomSheet({ open, onOpenChange, title, children }: BottomSheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border border-border bg-surface p-4 shadow-xl',
            'pb-[calc(1rem+env(safe-area-inset-bottom))]',
          )}
        >
          <div className="mb-2 flex items-center justify-between">
            <Dialog.Title className="text-base font-semibold">{title}</Dialog.Title>
            <Dialog.Close
              aria-label="Tutup"
              className="inline-flex size-11 items-center justify-center rounded-lg text-muted hover:bg-surface-muted"
            >
              <X aria-hidden="true" className="size-5" />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
