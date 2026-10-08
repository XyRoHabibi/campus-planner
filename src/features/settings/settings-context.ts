import { createContext, useContext } from 'react'

import type { Settings, ThemePref } from '@/lib/settings/settings'

export interface SettingsContextValue {
  settings: Settings
  /** Memperbarui sebagian pengaturan dan menyimpannya (per pengguna). */
  update: (patch: Partial<Settings>) => void
  theme: ThemePref
  setTheme: (theme: ThemePref) => void
  /** `false` jika peramban tidak mengizinkan penyimpanan: pengaturan hanya berlaku sampai halaman ditutup. */
  persisted: boolean
}

export const SettingsContext = createContext<SettingsContextValue | null>(null)

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings harus dipakai di dalam <SettingsProvider>')
  return ctx
}
