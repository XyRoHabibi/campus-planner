import type { DehydrateOptions, QueryKey } from '@tanstack/react-query'
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client'
import { del, delMany, get, keys, set } from 'idb-keyval'

/**
 * Cache data baca untuk mode offline (prd.md §9.9, §16), disimpan di IndexedDB.
 * Aturan privasi:
 *  1. Hanya daftar mata kuliah, jadwal, dan tugas (+ detail tugas) — TIDAK ada lampiran maupun metadata lampiran.
 *  2. Satu entri PER PENGGUNA (kunci memuat user id) sehingga akun tidak tercampur di perangkat bersama.
 *  3. Semua entri dihapus saat logout, sesi berakhir, atau aplikasi dimuat tanpa sesi (lihat OfflineCache).
 */
export const CACHE_PREFIX = 'campus-planner:rq:'
/** Naikkan jika bentuk data cache berubah; cache dengan buster berbeda dibuang saat dipulihkan. */
export const CACHE_BUSTER = 'v1'
/** Cache lebih tua dari ini tidak dipulihkan. */
export const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const THROTTLE_MS = 1000

export const cacheKeyFor = (userId: string) => `${CACHE_PREFIX}${userId}`

/**
 * Query yang boleh disimpan. Whitelist ketat (bukan blacklist) supaya query baru tidak ikut tersimpan tanpa sengaja:
 *  ['courses'], ['sessions'], ['tasks'], dan ['tasks', id] (detail). Kunci bersarang seperti ['tasks', id, 'attachments'],
 *  ['tasks', id, 'attachment-total'], dan ['courses', id, 'impact'] TIDAK disimpan.
 */
export function isPersistableQueryKey(key: QueryKey): boolean {
  const [root, second] = key
  if (root === 'courses' || root === 'sessions') return key.length === 1
  if (root === 'tasks') return key.length === 1 || (key.length === 2 && typeof second === 'string')
  return false
}

export const dehydrateOptions: DehydrateOptions = {
  shouldDehydrateQuery: (query) => query.state.status === 'success' && isPersistableQueryKey(query.queryKey),
}

export interface UserPersister extends Persister {
  /** Hentikan penulisan yang tertunda (dipanggil saat berhenti berlangganan / logout). */
  cancel: () => void
}

/** Persister IndexedDB untuk satu pengguna. Penulisan di-throttle (1 dtk) agar tidak menulis di setiap perubahan cache. */
export function createUserPersister(userId: string): UserPersister {
  const key = cacheKeyFor(userId)
  let timer: ReturnType<typeof setTimeout> | null = null
  let latest: PersistedClient | null = null

  const cancel = () => {
    if (timer) clearTimeout(timer)
    timer = null
    latest = null
  }

  return {
    persistClient: (client) => {
      latest = client
      timer ??= setTimeout(() => {
        const toWrite = latest
        timer = null
        latest = null
        if (toWrite) void set(key, toWrite).catch(() => {}) // IndexedDB bisa ditolak (mode privat); aplikasi tetap jalan
      }, THROTTLE_MS)
    },
    restoreClient: async () => (await get<PersistedClient>(key)) ?? undefined,
    removeClient: async () => {
      cancel()
      await del(key)
    },
    cancel,
  }
}

/**
 * Hapus cache offline di perangkat ini. Tanpa argumen: SEMUA pengguna. Dengan `keepUserId`: semua KECUALI milik pengguna itu
 * (dipakai saat masuk, agar cache pengguna lain yang tertinggal tidak bertahan). Aman dipanggil kapan saja; tidak pernah melempar.
 */
export async function clearOfflineCaches(keepUserId?: string): Promise<void> {
  try {
    const keep = keepUserId ? cacheKeyFor(keepUserId) : null
    const all = await keys()
    const mine = all.filter((k): k is string => typeof k === 'string' && k.startsWith(CACHE_PREFIX) && k !== keep)
    if (mine.length > 0) await delMany(mine)
  } catch {
    /* IndexedDB tidak tersedia: tidak ada yang perlu dihapus */
  }
}
