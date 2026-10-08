import { RefreshCw, TriangleAlert, Wifi, WifiOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { cn } from '@/lib/utils/cn'
import { describeSync, type SyncTone } from '@/lib/utils/sync'

interface QueryLike {
  isFetching: boolean
  isError: boolean
  dataUpdatedAt: number
}

const toneStyle: Record<SyncTone, string> = {
  ok: 'text-muted',
  busy: 'text-primary',
  offline: 'text-warning-fg',
  error: 'text-danger-fg',
}

/**
 * Status koneksi + waktu data terakhir dimuat + tombol Perbarui (prd.md §9.2). Status dinyatakan dengan ikon DAN teks.
 * `updatedAt` memakai data TERTUA di antara query agar tidak mengklaim lebih segar dari kenyataan.
 */
export function SyncStatus({ queries, onRefresh }: { queries: QueryLike[]; onRefresh: () => void }) {
  const online = useOnlineStatus()
  const loaded = queries.filter((q) => q.dataUpdatedAt > 0)
  const status = describeSync({
    online,
    fetching: queries.some((q) => q.isFetching),
    refreshFailed: queries.some((q) => q.isError), // juga untuk pemuatan awal yang gagal (belum ada data)
    updatedAt: loaded.length === queries.length && loaded.length > 0 ? Math.min(...loaded.map((q) => q.dataUpdatedAt)) : null,
  })
  const Icon = status.tone === 'offline' ? WifiOff : status.tone === 'error' ? TriangleAlert : status.tone === 'busy' ? RefreshCw : Wifi

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-1.5">
      <p role="status" className={cn('flex min-w-0 items-start gap-2 py-1 text-xs font-medium', toneStyle[status.tone])}>
        <Icon aria-hidden="true" className={cn('mt-px size-4 shrink-0', status.tone === 'busy' && 'animate-spin')} />
        <span>{status.label}</span>
      </p>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        disabled={!online || status.tone === 'busy'}
        title={online ? undefined : 'Perlu koneksi internet'}
      >
        <RefreshCw aria-hidden="true" />
        Perbarui
      </Button>
    </div>
  )
}
