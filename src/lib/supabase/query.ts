import { AppError } from '@/lib/errors'

interface ErrorLike {
  message?: string
  code?: string
  status?: number
}

export const QUERY_MESSAGES = {
  network: 'Tidak dapat terhubung ke server. Periksa koneksi internet, lalu coba lagi.',
  session: 'Sesi Anda mungkin telah berakhir. Muat ulang halaman atau masuk kembali.',
  notFound: 'Data tidak ditemukan. Mungkin sudah dihapus.',
  invalid: 'Data yang dikirim tidak valid. Periksa isian lalu coba lagi.',
  generic: 'Terjadi masalah di server. Silakan coba lagi.',
} as const

/** Ubah error Supabase/PostgREST jadi AppError dengan pesan ramah — detail teknis tidak ikut tampil. */
export function toAppError(error: unknown, online = typeof navigator === 'undefined' || navigator.onLine): AppError {
  if (error instanceof AppError) return error
  const e = (typeof error === 'object' && error !== null ? error : {}) as ErrorLike
  if (!online || /failed to fetch|networkerror|load failed/i.test(e.message ?? '')) {
    return new AppError(QUERY_MESSAGES.network)
  }
  if (e.code === 'PGRST116') return new AppError(QUERY_MESSAGES.notFound)
  if (e.code === 'PGRST301' || e.code === 'PGRST303' || e.code === '42501' || e.status === 401 || e.status === 403) {
    return new AppError(QUERY_MESSAGES.session)
  }
  if (e.code === '23514' || e.code === '23502' || e.code === '22001' || e.code === '22P02') {
    return new AppError(QUERY_MESSAGES.invalid)
  }
  return new AppError(QUERY_MESSAGES.generic)
}

/** Ambil `data` dari hasil query Supabase atau lempar AppError ramah. */
export function unwrap<T>(result: { data: unknown; error: unknown }): T {
  if (result.error) throw toAppError(result.error)
  return result.data as T
}
