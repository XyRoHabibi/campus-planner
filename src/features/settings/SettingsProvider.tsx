import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { useAuth } from '@/features/auth/auth-context'
import { SettingsContext, type SettingsContextValue } from '@/features/settings/settings-context'
import {
  DEFAULT_SETTINGS,
  THEME_KEY,
  applyTheme,
  loadSettings,
  loadTheme,
  saveSettings,
  saveTheme,
  settingsKey,
  type Settings,
  type ThemePref,
} from '@/lib/settings/settings'

/**
 * Sumber pengaturan. Tema berlaku per perangkat (dimuat sejak login); preferensi lain per pengguna dan dimuat ulang
 * saat pengguna berganti. Perubahan di tab lain ikut tersinkron lewat event `storage`.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [theme, setThemeState] = useState<ThemePref>(() => loadTheme())
  const [settings, setSettings] = useState<Settings>(() => (userId ? loadSettings(userId) : DEFAULT_SETTINGS))
  const [persisted, setPersisted] = useState(true)
  const [loadedFor, setLoadedFor] = useState<string | null>(userId)

  // Pengguna berubah → muat pengaturan miliknya (jangan pernah memakai milik pengguna sebelumnya).
  if (loadedFor !== userId) {
    setLoadedFor(userId)
    setSettings(userId ? loadSettings(userId) : DEFAULT_SETTINGS)
  }

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_KEY) setThemeState(loadTheme())
      if (userId && e.key === settingsKey(userId)) setSettings(loadSettings(userId))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [userId])

  const update = useCallback(
    (patch: Partial<Settings>) => {
      setSettings((current) => {
        const next = { ...current, ...patch }
        if (userId) setPersisted(saveSettings(userId, next))
        return next
      })
    },
    [userId],
  )

  const setTheme = useCallback((next: ThemePref) => {
    setThemeState(next)
    setPersisted(saveTheme(next))
  }, [])

  const value = useMemo<SettingsContextValue>(() => ({ settings, update, theme, setTheme, persisted }), [settings, update, theme, setTheme, persisted])
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
