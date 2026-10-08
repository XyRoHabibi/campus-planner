import { useQueryClient } from '@tanstack/react-query'
import type { Session, User } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { AuthContext, type AuthContextValue, type AuthStatus } from '@/features/auth/auth-context'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client'

/**
 * Sumber kebenaran sesi. Saat sesi hilang/berakhir atau pengguna berganti, seluruh cache TanStack Query
 * dibersihkan agar data satu akun tidak pernah terlihat oleh akun lain di perangkat yang sama (prd.md §9.9).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<AuthStatus>(isSupabaseConfigured ? 'loading' : 'unauthenticated')
  const [user, setUser] = useState<User | null>(null)
  const userIdRef = useRef<string | null>(null)
  const signingOutRef = useRef(false)

  const applySession = useCallback(
    (session: Session | null) => {
      const nextId = session?.user.id ?? null
      // Pengguna berubah (logout, sesi habis, atau akun lain login): buang cache milik pengguna sebelumnya.
      if (userIdRef.current !== nextId) {
        if (userIdRef.current !== null) queryClient.clear()
        userIdRef.current = nextId
      }
      setUser(session?.user ?? null)
      setStatus(session ? 'authenticated' : 'unauthenticated')
    },
    [queryClient],
  )

  useEffect(() => {
    if (!isSupabaseConfigured) return
    const supabase = getSupabase()
    let active = true

    supabase.auth
      .getSession()
      .then(({ data }) => active && applySession(data.session))
      .catch(() => active && applySession(null))

    // Callback sengaja sinkron & ringan (jangan memanggil API Supabase lain di sini).
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return // ditangani getSession di atas
      if (event === 'SIGNED_OUT' && !signingOutRef.current && userIdRef.current !== null) {
        toast.info('Sesi Anda telah berakhir', { description: 'Silakan masuk lagi untuk melanjutkan.' })
      }
      applySession(session)
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [applySession])

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await getSupabase().auth.signInWithPassword({ email, password })
      if (error) throw error
      applySession(data.session)
    },
    [applySession],
  )

  const signOut = useCallback(async () => {
    signingOutRef.current = true
    try {
      const supabase = getSupabase()
      const { error } = await supabase.auth.signOut()
      // Jika server tak terjangkau, tetap hapus sesi di perangkat ini.
      if (error) await supabase.auth.signOut({ scope: 'local' })
      applySession(null)
      queryClient.clear()
    } finally {
      signingOutRef.current = false
    }
  }, [applySession, queryClient])

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, configured: isSupabaseConfigured, signIn, signOut }),
    [status, user, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
