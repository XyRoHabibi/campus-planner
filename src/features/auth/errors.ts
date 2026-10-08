/** Pesan login yang ramah; error teknis/backend tidak pernah ditampilkan mentah (prd.md §9.1). */

interface AuthErrorLike {
  name?: string
  code?: string
  status?: number
  message?: string
}

export const LOGIN_MESSAGES = {
  invalidCredentials: 'Email atau password salah. Periksa lagi lalu coba kembali.',
  network: 'Tidak dapat terhubung ke server. Periksa koneksi internet, lalu coba lagi.',
  rateLimited: 'Terlalu banyak percobaan. Tunggu beberapa menit sebelum mencoba lagi.',
  inactive: 'Akun ini belum aktif atau tidak dapat dipakai. Hubungi pemilik aplikasi.',
  notConfigured: 'Aplikasi belum terhubung ke server. Hubungi pemilik aplikasi.',
  generic: 'Belum bisa masuk saat ini. Silakan coba lagi sebentar lagi.',
} as const

export function toLoginErrorMessage(error: unknown, online = true): string {
  if (!online) return LOGIN_MESSAGES.network
  const e = (typeof error === 'object' && error !== null ? error : {}) as AuthErrorLike

  if (e.code === 'invalid_credentials' || e.code === 'user_not_found') return LOGIN_MESSAGES.invalidCredentials
  if (e.code === 'over_request_rate_limit' || e.status === 429) return LOGIN_MESSAGES.rateLimited
  if (e.code === 'email_not_confirmed' || e.code === 'user_banned') return LOGIN_MESSAGES.inactive
  if (e.name === 'AuthRetryableFetchError' || e.status === 0 || e.name === 'TypeError') return LOGIN_MESSAGES.network
  if (e.status === 400 && /invalid login credentials/i.test(e.message ?? '')) return LOGIN_MESSAGES.invalidCredentials
  return LOGIN_MESSAGES.generic
}

/**
 * Tujuan kembali setelah login hanya boleh path internal aplikasi (cegah open redirect).
 * Menolak URL absolut, `//host`, backslash, dan halaman /login itu sendiri.
 */
export function sanitizeRedirect(target: unknown): string {
  if (typeof target !== 'string') return '/'
  if (!target.startsWith('/') || target.startsWith('//') || target.includes('\\')) return '/'
  if (/^\/login(?:[/?#]|$)/.test(target)) return '/'
  return target
}
