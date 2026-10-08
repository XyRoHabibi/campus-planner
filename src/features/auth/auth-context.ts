import type { User } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export interface AuthContextValue {
  status: AuthStatus
  user: User | null
  /** Env Supabase belum diisi → login tidak mungkin; UI menjelaskannya dengan ramah. */
  configured: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus dipakai di dalam <AuthProvider>')
  return ctx
}
