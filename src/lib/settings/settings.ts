import type { WeekStart } from '@/lib/utils/calendar'

/**
 * Preferensi aplikasi (prd.md §9.10), disimpan di perangkat (localStorage):
 *  - TEMA berlaku per perangkat (juga untuk halaman login, sebelum ada pengguna);
 *  - preferensi lain disimpan PER PENGGUNA agar tidak tercampur di perangkat bersama.
 * Tidak disimpan di database: PRD hanya menetapkan 4 tabel inti, dan pengingat berjalan di perangkat.
 */
export type ThemePref = 'system' | 'light' | 'dark'

export const THEME_OPTIONS: ThemePref[] = ['system', 'light', 'dark']
/** Berapa menit sebelum kelas pengingat muncul. */
export const CLASS_LEAD_OPTIONS = [5, 10, 15, 30, 60] as const
/** Berapa menit sebelum tenggat pengingat muncul (1 jam, 3 jam, 1 hari, 2 hari). */
export const TASK_LEAD_OPTIONS = [60, 180, 1440, 2880] as const

export interface Settings {
  weekStart: WeekStart
  /** Pengingat di dalam aplikasi (toast + daftar di Beranda). */
  remindersEnabled: boolean
  classLeadMinutes: number
  taskLeadMinutes: number
  /** Notifikasi browser (hanya efektif jika diizinkan browser dan aplikasi sedang terbuka). */
  browserNotifications: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  weekStart: 1,
  remindersEnabled: true,
  classLeadMinutes: 15,
  taskLeadMinutes: 1440,
  browserNotifications: false, // izin notifikasi tidak pernah diminta sampai pengguna mengaktifkannya sendiri
}

const oneOf = <T extends number>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback

/** Nilai tak valid/rusak (JSON diedit manual, versi lama) jatuh ke default per kolom — tidak pernah melempar. */
export function sanitizeSettings(raw: unknown): Settings {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  return {
    weekStart: oneOf(r.weekStart, [0, 1] as const, DEFAULT_SETTINGS.weekStart),
    remindersEnabled: typeof r.remindersEnabled === 'boolean' ? r.remindersEnabled : DEFAULT_SETTINGS.remindersEnabled,
    classLeadMinutes: oneOf(r.classLeadMinutes, CLASS_LEAD_OPTIONS, DEFAULT_SETTINGS.classLeadMinutes as 15),
    taskLeadMinutes: oneOf(r.taskLeadMinutes, TASK_LEAD_OPTIONS, DEFAULT_SETTINGS.taskLeadMinutes as 1440),
    browserNotifications:
      typeof r.browserNotifications === 'boolean' ? r.browserNotifications : DEFAULT_SETTINGS.browserNotifications,
  }
}

export function sanitizeTheme(raw: unknown): ThemePref {
  return raw === 'light' || raw === 'dark' ? raw : 'system'
}

export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'>

export const THEME_KEY = 'campus-planner:theme'
export const settingsKey = (userId: string) => `campus-planner:settings:${userId}`

/** localStorage bisa tidak tersedia/melempar (jendela privat, data situs diblokir); aplikasi tetap harus jalan. */
export function browserStorage(): KeyValueStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

function read(storage: KeyValueStorage | null, key: string): unknown {
  try {
    const text = storage?.getItem(key)
    return text ? JSON.parse(text) : null
  } catch {
    return null
  }
}

function write(storage: KeyValueStorage | null, key: string, value: unknown): boolean {
  try {
    storage?.setItem(key, JSON.stringify(value))
    return storage !== null
  } catch {
    return false
  }
}

export const loadSettings = (userId: string, storage: KeyValueStorage | null = browserStorage()) =>
  sanitizeSettings(read(storage, settingsKey(userId)))

/** `false` jika tidak bisa disimpan (pengaturan hanya berlaku sampai halaman ditutup). */
export const saveSettings = (userId: string, settings: Settings, storage: KeyValueStorage | null = browserStorage()) =>
  write(storage, settingsKey(userId), settings)

export const loadTheme = (storage: KeyValueStorage | null = browserStorage()) => sanitizeTheme(read(storage, THEME_KEY))
export const saveTheme = (theme: ThemePref, storage: KeyValueStorage | null = browserStorage()) => write(storage, THEME_KEY, theme)

/** Terapkan tema ke <html>. "system" menghapus atribut sehingga CSS mengikuti prefers-color-scheme. */
export function applyTheme(theme: ThemePref, root: HTMLElement = document.documentElement) {
  if (theme === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
}
