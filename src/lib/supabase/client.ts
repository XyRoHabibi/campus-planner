import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { AppError } from '@/lib/errors'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Key rahasia (service-role / sb_secret_) TIDAK BOLEH ada di frontend: bundle ini dibaca publik. */
function isSecretKey(key: string) {
  if (key.startsWith('sb_secret_')) return true
  const payload = key.split('.')[1]
  if (!payload) return false
  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return (JSON.parse(json) as { role?: string }).role === 'service_role'
  } catch {
    return false
  }
}

export const isSupabaseConfigured = Boolean(url && anonKey)

/** URL + anon key untuk permintaan yang tidak lewat supabase-js (mis. upload XHR dengan progres). Bukan rahasia. */
export function getSupabaseConfig() {
  if (!url || !anonKey) throw new AppError('Koneksi ke server belum dikonfigurasi. Hubungi pemilik aplikasi.')
  if (isSecretKey(anonKey)) throw new Error('VITE_SUPABASE_ANON_KEY berisi key rahasia (service-role).')
  return { url: url.replace(/\/+$/, ''), anonKey }
}

let client: SupabaseClient | null = null

/**
 * Client Supabase (anon/publishable key; akses data dibatasi RLS). Dibuat lazy agar aplikasi
 * tetap bisa dibuka (mode pratinjau) selama env belum diisi; error-nya ramah, tanpa detail teknis.
 */
export function getSupabase(): SupabaseClient {
  if (!url || !anonKey) {
    throw new AppError('Koneksi ke server belum dikonfigurasi. Hubungi pemilik aplikasi.')
  }
  if (isSecretKey(anonKey)) {
    // Gagal keras: key rahasia yang masuk bundle sudah bocor dan harus dirotasi.
    throw new Error('VITE_SUPABASE_ANON_KEY berisi key rahasia (service-role). Gunakan anon/publishable key dan rotasi key tersebut.')
  }
  client ??= createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false, // tidak ada magic link/OAuth/reset password di MVP
    },
    // Retry diatur TanStack Query (1x, jeda singkat). Retry bawaan postgrest-js (backoff 1s+2s+4s) hanya
    // membuat pengguna offline menatap skeleton belasan detik sebelum melihat pesan error.
    db: { retry: false },
  })
  return client
}
