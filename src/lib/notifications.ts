export type NotificationState = 'unsupported' | 'default' | 'granted' | 'denied'

/** Status izin notifikasi browser; `unsupported` jika API tidak ada (mis. beberapa peramban/konteks tak aman). */
export function notificationPermission(): NotificationState {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

/**
 * Meminta izin. HANYA dipanggil dari tindakan pengguna (mengaktifkan notifikasi browser di Pengaturan) —
 * tidak pernah otomatis saat aplikasi dimuat (prd.md §9.8).
 */
export async function requestNotificationPermission(): Promise<NotificationState> {
  if (typeof Notification === 'undefined') return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return notificationPermission()
  }
}

/**
 * Tampilkan notifikasi browser. `tag` mencegah duplikat. Beberapa peramban seluler tidak mengizinkan
 * `new Notification()` dan hanya menerima lewat service worker — dicoba sebagai cadangan.
 * Mengembalikan `false` jika tidak ada cara yang berhasil (pemanggil menampilkan pengingat di dalam aplikasi saja).
 */
export async function showBrowserNotification(title: string, body: string, tag: string): Promise<boolean> {
  if (notificationPermission() !== 'granted') return false
  const options: NotificationOptions = { body, tag, icon: '/favicon.svg' }
  try {
    new Notification(title, options)
    return true
  } catch {
    try {
      const reg = await navigator.serviceWorker?.getRegistration()
      if (!reg) return false
      await reg.showNotification(title, options)
      return true
    } catch {
      return false
    }
  }
}
