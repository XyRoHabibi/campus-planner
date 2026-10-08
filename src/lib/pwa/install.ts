/**
 * Instalasi PWA (prd.md §9.9–9.10): tombol "Instal" hanya muncul jika browser mendukung dan menawarkannya.
 * Event `beforeinstallprompt` bisa terjadi SEBELUM React dimuat, jadi ditangkap sejak awal di modul ini.
 * Dibuat sebagai factory agar bisa diuji dengan EventTarget palsu.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export interface InstallSnapshot {
  /** Browser menawarkan instalasi dan pengguna belum memasangnya. */
  canInstall: boolean
  /** Aplikasi sedang berjalan sebagai aplikasi terpasang (jendela mandiri). */
  standalone: boolean
}

export type InstallResult = 'accepted' | 'dismissed' | 'unavailable'

export function createInstallStore(target: Pick<EventTarget, 'addEventListener'>, detectStandalone: () => boolean) {
  let deferred: BeforeInstallPromptEvent | null = null
  let snapshot: InstallSnapshot = { canInstall: false, standalone: detectStandalone() }
  const listeners = new Set<() => void>()

  const update = (patch: Partial<InstallSnapshot>) => {
    snapshot = { ...snapshot, ...patch }
    listeners.forEach((l) => l())
  }

  return {
    init() {
      target.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault() // tahan prompt bawaan; kita tampilkan lewat tombol di Pengaturan
        deferred = e as BeforeInstallPromptEvent
        update({ canInstall: true })
      })
      target.addEventListener('appinstalled', () => {
        deferred = null
        update({ canInstall: false, standalone: true })
      })
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
    getSnapshot: () => snapshot,
    async prompt(): Promise<InstallResult> {
      if (!deferred) return 'unavailable'
      const event = deferred
      deferred = null // prompt hanya bisa dipakai sekali
      update({ canInstall: false })
      await event.prompt()
      const { outcome } = await event.userChoice
      return outcome
    },
  }
}

const detectStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches === true || (navigator as Navigator & { standalone?: boolean }).standalone === true)

export const installStore = createInstallStore(typeof window === 'undefined' ? { addEventListener() {} } : window, detectStandalone)
