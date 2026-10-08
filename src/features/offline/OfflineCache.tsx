import { useQueryClient } from '@tanstack/react-query'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import { useEffect } from 'react'

import { useAuth } from '@/features/auth/auth-context'
import { CACHE_BUSTER, CACHE_MAX_AGE_MS, clearOfflineCaches, createUserPersister, dehydrateOptions } from '@/lib/offline/cache'

/**
 * Menyambungkan cache TanStack Query ke IndexedDB PER PENGGUNA (prd.md §9.9, §16):
 *  - saat pengguna masuk: pulihkan cache miliknya (data terakhir yang berhasil dimuat) lalu simpan perubahan berikutnya;
 *  - saat TIDAK ada sesi (logout, sesi berakhir, atau dimuat tanpa login): hentikan penulisan dan HAPUS semua cache offline
 *    di perangkat ini, sehingga data satu akun tidak pernah tersisa untuk akun lain di perangkat bersama.
 */
export function OfflineCache() {
  const { status, user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id

  useEffect(() => {
    if (!userId) return
    // Cache milik pengguna LAIN yang mungkin tertinggal (mis. sesi berganti akun tanpa logout) dibuang lebih dulu.
    void clearOfflineCaches(userId)
    const persister = createUserPersister(userId)
    const [unsubscribe] = persistQueryClient({
      queryClient,
      persister,
      maxAge: CACHE_MAX_AGE_MS,
      buster: CACHE_BUSTER,
      dehydrateOptions,
    })
    return () => {
      unsubscribe()
      persister.cancel() // tidak ada penulisan tertunda yang boleh menimpa pembersihan di bawah
    }
  }, [userId, queryClient])

  useEffect(() => {
    // Efek di atas sudah dibersihkan (React menjalankan semua cleanup lebih dulu) sebelum penghapusan ini.
    if (status === 'unauthenticated') void clearOfflineCaches()
  }, [status])

  return null
}
