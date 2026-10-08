export interface SyncInput {
  online: boolean
  /** Ada permintaan data yang sedang berjalan. */
  fetching: boolean
  /** Ada permintaan data yang gagal (baik pemuatan awal maupun pemuatan ulang). */
  refreshFailed: boolean
  /** Waktu (ms epoch) data tertua yang sedang ditampilkan berhasil dimuat; `null` jika belum ada. */
  updatedAt: number | null
}

export type SyncTone = 'ok' | 'busy' | 'offline' | 'error'

const pad = (n: number) => String(n).padStart(2, '0')
const clock = (ms: number) => {
  const d = new Date(ms)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Teks status koneksi/sinkronisasi (prd.md §9.2, §9.9). Jujur: hanya menyebut waktu data *dimuat dari server*,
 * dan saat offline menyatakan bahwa yang tampil adalah data terakhir (bukan data terbaru).
 */
export function describeSync({ online, fetching, refreshFailed, updatedAt }: SyncInput): { tone: SyncTone; label: string } {
  const at = updatedAt === null ? '' : clock(updatedAt)
  if (!online) return { tone: 'offline', label: at ? `Offline · menampilkan data terakhir (dimuat ${at})` : 'Offline · data belum bisa dimuat' }
  if (fetching) return { tone: 'busy', label: 'Memperbarui data…' }
  if (refreshFailed) return { tone: 'error', label: at ? `Gagal memperbarui · data terakhir dimuat ${at}` : 'Gagal memuat data' }
  return { tone: 'ok', label: at ? `Online · diperbarui ${at}` : 'Online' }
}
