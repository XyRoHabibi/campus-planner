import { useCallback, useEffect, useState } from 'react'

import { notificationPermission, type NotificationState } from '@/lib/notifications'

/**
 * Status izin notifikasi yang tetap akurat jika pengguna mengubahnya lewat pengaturan situs browser:
 * dibaca ulang saat jendela kembali fokus/terlihat dan (bila didukung) saat Permissions API melaporkan perubahan.
 */
export function useNotificationPermission() {
  const [state, setState] = useState<NotificationState>(() => notificationPermission())
  const refresh = useCallback(() => setState(notificationPermission()), [])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisible)

    let status: PermissionStatus | null = null
    let cancelled = false
    navigator.permissions
      ?.query({ name: 'notifications' })
      .then((s) => {
        if (cancelled) return
        status = s
        s.onchange = refresh
      })
      .catch(() => {})

    return () => {
      cancelled = true
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisible)
      if (status) status.onchange = null
    }
  }, [refresh])

  return { state, refresh }
}
