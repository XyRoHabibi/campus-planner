import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
}

/**
 * Modal untuk form: lembar dari bawah di HP (nyaman dijangkau jempol), dialog di tengah pada layar lebar.
 * Isi di-scroll jika panjang. Fokus, Esc, dan aria ditangani Radix.
 */
export function Modal({ open, onOpenChange, title, description, children }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content
          {...(description ? {} : { "aria-describedby": undefined })}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-2xl border border-border bg-surface shadow-xl sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-card"
        >
          <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-0.5 text-sm text-muted">{description}</Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close
              aria-label="Tutup"
              className="-mr-2 -mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-muted sm:size-10"
            >
              <X aria-hidden="true" className="size-5" />
            </Dialog.Close>
          </div>
          <div className="overflow-y-auto px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
