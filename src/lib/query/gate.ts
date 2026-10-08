interface QueryLike {
  isPending: boolean
  isError: boolean
  error: unknown
  data: unknown
  fetchStatus: 'fetching' | 'paused' | 'idle'
}

export type Gate = { state: 'error'; error: unknown } | { state: 'offline' } | { state: 'loading' } | { state: 'ready' }

/**
 * Menentukan apa yang harus ditampilkan halaman untuk satu atau beberapa query (prd.md §9.9):
 *  - error     : ada query gagal DAN belum punya data apa pun. Query gagal yang masih punya data (mis. dari cache offline
 *                atau pemuatan ulang yang gagal) TIDAK memblokir tampilan — datanya tetap ditampilkan.
 *  - offline   : belum ada data dan permintaan tertahan karena tidak ada koneksi → jelaskan, jangan skeleton selamanya.
 *  - loading   : sedang memuat pertama kali.
 *  - ready     : data tersedia (bisa dari cache; status koneksi ditampilkan terpisah).
 */
export function queryGate(...queries: QueryLike[]): Gate {
  const failed = queries.find((q) => q.isError && q.data === undefined)
  if (failed) return { state: 'error', error: failed.error }
  if (queries.some((q) => q.data === undefined && q.fetchStatus === 'paused')) return { state: 'offline' }
  if (queries.some((q) => q.isPending)) return { state: 'loading' }
  return { state: 'ready' }
}
