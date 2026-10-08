import { LoaderCircle } from 'lucide-react'

/** Tampil hanya sesaat saat kode halaman dimuat pertama kali (setelah itu dilayani dari cache service worker). */
export function RouteLoading() {
  return (
    <div role="status" className="flex min-h-dvh items-center justify-center gap-2 text-sm text-muted">
      <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
      Memuat…
    </div>
  )
}
