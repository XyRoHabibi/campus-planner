import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { Toaster } from 'sonner'

import { AuthProvider } from '@/features/auth/AuthProvider'
import { OfflineCache } from '@/features/offline/OfflineCache'
import { SettingsProvider } from '@/features/settings/SettingsProvider'
import { CACHE_MAX_AGE_MS } from '@/lib/offline/cache'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            retryDelay: 400,
            refetchOnWindowFocus: false,
            staleTime: 30_000,
            // gcTime ≥ umur cache offline; jika lebih pendek, query dibuang dari memori sebelum sempat dipulihkan/disimpan.
            gcTime: CACHE_MAX_AGE_MS,
          },
          // Mutasi TIDAK ditahan saat offline lalu dijalankan diam-diam nanti (tidak ada antrean tulis offline di MVP):
          // dicoba langsung dan gagal dengan jujur, sehingga UI tidak pernah mengklaim tersimpan.
          mutations: { networkMode: 'always' },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OfflineCache />
        <SettingsProvider>{children}</SettingsProvider>
      </AuthProvider>
      <Toaster position="top-center" richColors closeButton />
    </QueryClientProvider>
  )
}
