import { CircleAlert, CircleCheck, LoaderCircle, RotateCcw, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { FileTypeIcon } from '@/features/attachments/components/FileTypeIcon'
import { formatBytes } from '@/features/attachments/validation'
import type { UploadItem } from '@/features/attachments/useUploadQueue'
import { cn } from '@/lib/utils/cn'

interface UploadQueueListProps {
  items: UploadItem[]
  onRetry: (id: string) => void
  onCancel: (id: string) => void
  /** Sembunyikan yang sudah berhasil (sudah muncul di daftar lampiran). */
  hideDone?: boolean
  online: boolean
}

function statusText(i: UploadItem) {
  switch (i.status) {
    case 'registering':
      return 'Menyiapkan…'
    case 'uploading':
      return `Mengunggah… ${i.progress}%`
    case 'confirming':
      return 'Menunggu konfirmasi server…'
    case 'done':
      return 'Berhasil tersimpan'
    case 'failed':
      return 'Gagal diunggah'
  }
}

/** Progres per file. "Berhasil" hanya muncul setelah server mengonfirmasi penyimpanan. */
export function UploadQueueList({ items, onRetry, onCancel, hideDone, online }: UploadQueueListProps) {
  const visible = hideDone ? items.filter((i) => i.status !== 'done') : items
  if (visible.length === 0) return null

  return (
    <ul aria-label="Status unggahan" className="space-y-2">
      {visible.map((i) => {
        const active = i.status === 'registering' || i.status === 'uploading' || i.status === 'confirming'
        return (
          <li key={i.id} className={cn('rounded-lg border p-3 text-sm', i.status === 'failed' ? 'border-danger/40 bg-danger-soft' : 'border-border bg-surface')}>
            <div className="flex items-start gap-3">
              <FileTypeIcon name={i.name} className="mt-0.5 size-5 shrink-0 text-muted" />
              <div className="min-w-0 flex-1">
                <p className="break-words font-medium">{i.name}</p>
                <p className="text-xs text-muted">{formatBytes(i.file.size)}</p>
                <p
                  className={cn(
                    'mt-1 flex items-start gap-1 text-xs font-medium',
                    i.status === 'failed' ? 'text-danger-fg' : i.status === 'done' ? 'text-success-fg' : 'text-primary',
                  )}
                  role={i.status === 'failed' ? 'alert' : 'status'}
                >
                  {active && <LoaderCircle aria-hidden="true" className="mt-px size-3.5 shrink-0 animate-spin" />}
                  {i.status === 'done' && <CircleCheck aria-hidden="true" className="mt-px size-3.5 shrink-0" />}
                  {i.status === 'failed' && <CircleAlert aria-hidden="true" className="mt-px size-3.5 shrink-0" />}
                  <span>{i.status === 'failed' && i.error ? `${statusText(i)}: ${i.error}` : statusText(i)}</span>
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                {i.status === 'failed' && (
                  <Button size="sm" variant="secondary" onClick={() => onRetry(i.id)} disabled={!online} title={online ? undefined : 'Perlu koneksi internet'}>
                    <RotateCcw aria-hidden="true" />
                    Coba lagi
                  </Button>
                )}
                {(active || i.status === 'failed') && i.status !== 'confirming' && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-10"
                    onClick={() => onCancel(i.id)}
                    aria-label={`${active ? 'Batalkan unggahan' : 'Buang file'} ${i.name}`}
                    title={active ? 'Batalkan unggahan' : 'Buang file (tidak diunggah)'}
                  >
                    <X aria-hidden="true" />
                  </Button>
                )}
              </div>
            </div>
            {(active || i.status === 'done') && (
              <div
                role="progressbar"
                aria-label={`Progres unggah ${i.name}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={i.status === 'registering' ? undefined : i.progress}
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted"
              >
                <div
                  className={cn('h-full rounded-full transition-[width]', i.status === 'done' ? 'bg-success' : 'bg-primary')}
                  style={{ width: `${i.status === 'registering' ? 0 : i.progress}%` }}
                />
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
