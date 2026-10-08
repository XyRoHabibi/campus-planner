import { describe, expect, it } from 'vitest'

import {
  CLASS_LEAD_OPTIONS,
  DEFAULT_SETTINGS,
  TASK_LEAD_OPTIONS,
  applyTheme,
  loadSettings,
  loadTheme,
  sanitizeSettings,
  sanitizeTheme,
  saveSettings,
  saveTheme,
  settingsKey,
  type KeyValueStorage,
} from '@/lib/settings/settings'

const memory = (): KeyValueStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>()
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) }
}
const broken: KeyValueStorage = {
  getItem: () => { throw new Error('SecurityError') },
  setItem: () => { throw new Error('QuotaExceededError') },
}

describe('default (prd.md §9.8: izin notifikasi tidak diminta otomatis)', () => {
  it('notifikasi browser nonaktif secara default; pengingat dalam aplikasi aktif; minggu mulai Senin', () => {
    expect(DEFAULT_SETTINGS).toEqual({ weekStart: 1, remindersEnabled: true, classLeadMinutes: 15, taskLeadMinutes: 1440, browserNotifications: false })
    expect(CLASS_LEAD_OPTIONS).toContain(DEFAULT_SETTINGS.classLeadMinutes)
    expect(TASK_LEAD_OPTIONS).toContain(DEFAULT_SETTINGS.taskLeadMinutes)
  })
})

describe('sanitizeSettings', () => {
  it('menerima nilai valid apa adanya', () => {
    const s = { weekStart: 0, remindersEnabled: false, classLeadMinutes: 30, taskLeadMinutes: 180, browserNotifications: true }
    expect(sanitizeSettings(s)).toEqual(s)
  })

  it('nilai tak valid jatuh ke default per kolom, kolom valid dipertahankan', () => {
    const r = sanitizeSettings({ weekStart: 3, remindersEnabled: 'ya', classLeadMinutes: 7, taskLeadMinutes: '60', browserNotifications: true })
    expect(r).toEqual({ ...DEFAULT_SETTINGS, browserNotifications: true })
  })

  it('bukan objek / null / array → default penuh, tanpa melempar', () => {
    for (const raw of [null, undefined, 'x', 42, [], true]) expect(sanitizeSettings(raw)).toEqual(DEFAULT_SETTINGS)
  })

  it('kolom tak dikenal dibuang (tidak ikut tersimpan ulang)', () => {
    expect(sanitizeSettings({ ...DEFAULT_SETTINGS, evil: '<script>' })).not.toHaveProperty('evil')
  })
})

describe('sanitizeTheme', () => {
  it('hanya light/dark yang dikenali; lainnya = system', () => {
    expect(sanitizeTheme('light')).toBe('light')
    expect(sanitizeTheme('dark')).toBe('dark')
    for (const raw of ['system', 'blue', '', null, 1, undefined]) expect(sanitizeTheme(raw)).toBe('system')
  })
})

describe('penyimpanan', () => {
  it('pengaturan disimpan PER PENGGUNA (akun lain di perangkat yang sama tidak tercampur)', () => {
    const st = memory()
    saveSettings('user-a', { ...DEFAULT_SETTINGS, weekStart: 0 }, st)
    saveSettings('user-b', { ...DEFAULT_SETTINGS, classLeadMinutes: 60 }, st)
    expect(loadSettings('user-a', st).weekStart).toBe(0)
    expect(loadSettings('user-a', st).classLeadMinutes).toBe(15)
    expect(loadSettings('user-b', st).classLeadMinutes).toBe(60)
    expect(loadSettings('user-b', st).weekStart).toBe(1)
    expect(loadSettings('user-c', st)).toEqual(DEFAULT_SETTINGS)
    expect(st.data.has(settingsKey('user-a'))).toBe(true)
  })

  it('tema disimpan global per perangkat', () => {
    const st = memory()
    expect(loadTheme(st)).toBe('system')
    saveTheme('dark', st)
    expect(loadTheme(st)).toBe('dark')
  })

  it('JSON rusak di storage → default, tidak melempar', () => {
    const st = memory()
    st.data.set(settingsKey('u'), '{bukan json')
    expect(loadSettings('u', st)).toEqual(DEFAULT_SETTINGS)
  })

  it('storage tidak tersedia/melempar → tetap berfungsi dengan default; saveSettings melapor gagal', () => {
    expect(loadSettings('u', broken)).toEqual(DEFAULT_SETTINGS)
    expect(loadSettings('u', null)).toEqual(DEFAULT_SETTINGS)
    expect(saveSettings('u', DEFAULT_SETTINGS, broken)).toBe(false)
    expect(saveSettings('u', DEFAULT_SETTINGS, null)).toBe(false)
    expect(loadTheme(broken)).toBe('system')
    expect(saveTheme('dark', broken)).toBe(false)
  })
})

describe('applyTheme', () => {
  it('light/dark memasang atribut; system menghapusnya', () => {
    const root = { attrs: new Map<string, string>(), setAttribute(k: string, v: string) { this.attrs.set(k, v) }, removeAttribute(k: string) { this.attrs.delete(k) } }
    applyTheme('dark', root as unknown as HTMLElement)
    expect(root.attrs.get('data-theme')).toBe('dark')
    applyTheme('light', root as unknown as HTMLElement)
    expect(root.attrs.get('data-theme')).toBe('light')
    applyTheme('system', root as unknown as HTMLElement)
    expect(root.attrs.has('data-theme')).toBe(false)
  })
})
