import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { useCourses } from '@/features/courses/hooks'
import { useSessions } from '@/features/schedule/hooks'
import { useSettings } from '@/features/settings/settings-context'
import { useTasks } from '@/features/tasks/hooks'
import { useNow } from '@/hooks/useNow'
import { notificationPermission, showBrowserNotification } from '@/lib/notifications'
import { computeReminders, isFresh, type Reminder } from '@/lib/utils/reminders'

const FIRED_KEY = 'campus-planner:reminders-fired'
const FIRED_LIMIT = 200

function loadFired(): Set<string> {
  try {
    const raw = sessionStorage.getItem(FIRED_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

function saveFired(set: Set<string>) {
  try {
    sessionStorage.setItem(FIRED_KEY, JSON.stringify([...set].slice(-FIRED_LIMIT)))
  } catch {
    /* tanpa sessionStorage: pengingat mungkin muncul lagi setelah muat ulang — dapat diterima */
  }
}

/** Pengingat yang sedang aktif (hanya menghitung; tanpa efek samping). Dipakai Beranda untuk daftar pengingat. */
export function useActiveReminders(): Reminder[] {
  const { settings } = useSettings()
  const sessions = useSessions()
  const tasks = useTasks()
  const courses = useCourses()
  const now = useNow(30_000)

  const names = useMemo(() => new Map((courses.data ?? []).map((c) => [c.id, c.name])), [courses.data])
  return useMemo(
    () => computeReminders(now, settings, sessions.data ?? [], tasks.data ?? [], names),
    [now, settings, sessions.data, tasks.data, names],
  )
}

/**
 * Memunculkan pengingat BARU sekali per kejadian: toast di dalam aplikasi, plus notifikasi browser bila diaktifkan,
 * diizinkan, dan tab sedang tidak terlihat. Dipasang SEKALI di layout; hanya berjalan saat aplikasi terbuka (prd.md §9.8).
 */
export function useReminderNotifier() {
  const { settings } = useSettings()
  const reminders = useActiveReminders()
  const now = useNow(30_000)
  const navigate = useNavigate()

  useEffect(() => {
    const fired = loadFired()
    let changed = false
    for (const r of reminders) {
      if (fired.has(r.key) || !isFresh(r, now)) continue
      fired.add(r.key) // tandai dulu agar tidak dobel (mis. React StrictMode)
      changed = true
      toast.info(r.title, {
        description: r.body,
        duration: 15_000,
        action: { label: 'Lihat', onClick: () => navigate(r.href) },
      })
      if (settings.browserNotifications && notificationPermission() === 'granted' && document.hidden) {
        void showBrowserNotification(r.title, r.body, r.key)
      }
    }
    if (changed) saveFired(fired)
  }, [reminders, now, settings.browserNotifications, navigate])
}
