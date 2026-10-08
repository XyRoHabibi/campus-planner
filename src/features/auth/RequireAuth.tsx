import { LoaderCircle } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router'

import { useAuth } from '@/features/auth/auth-context'

/** Semua halaman selain /login memerlukan sesi (prd.md §8). Tujuan semula diingat untuk setelah login. */
export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div role="status" className="flex min-h-dvh items-center justify-center gap-2 text-sm text-muted">
        <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
        Memeriksa sesi…
      </div>
    )
  }
  if (status === 'unauthenticated') {
    const from = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to="/login" replace state={{ from }} />
  }
  return <Outlet />
}
