import { CircleAlert, RefreshCw, WifiOff, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center px-4 py-10 text-center', className)}>
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <Icon aria-hidden="true" className="size-7" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

interface ErrorStateProps {
  message: string
  onRetry?: () => void
  retrying?: boolean
  className?: string
}

/** Error state: jelaskan apa yang terjadi + tindakan berikutnya; tanpa pesan teknis mentah. */
export function ErrorState({ message, onRetry, retrying, className }: ErrorStateProps) {
  return (
    <div role="alert" className={cn('flex flex-col items-center px-4 py-10 text-center', className)}>
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-danger-soft text-danger-fg">
        <CircleAlert aria-hidden="true" className="size-7" />
      </div>
      <h3 className="text-base font-semibold text-foreground">Gagal memuat data</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-4" onClick={onRetry} disabled={retrying}>
          <RefreshCw aria-hidden="true" className={retrying ? 'animate-spin' : undefined} />
          {retrying ? 'Memuat ulang…' : 'Coba lagi'}
        </Button>
      )}
    </div>
  )
}

interface OfflineUnavailableProps {
  title?: string
  description?: string
  className?: string
}

/**
 * Dipakai saat data belum pernah dimuat di perangkat ini DAN tidak ada koneksi (prd.md §9.9):
 * menjelaskan keadaannya, alih-alih skeleton tanpa akhir atau error teknis.
 */
export function OfflineUnavailable({
  title = 'Belum tersedia saat offline',
  description = 'Data ini belum pernah dimuat di perangkat ini. Hubungkan ke internet untuk memuatnya pertama kali; setelah itu bisa dibaca saat offline.',
  className,
}: OfflineUnavailableProps) {
  return (
    <div role="status" className={cn('flex flex-col items-center px-4 py-10 text-center', className)}>
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-warning-soft text-warning-fg">
        <WifiOff aria-hidden="true" className="size-7" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
    </div>
  )
}
