import { registerSW } from 'virtual:pwa-register'
import { toast } from 'sonner'

const UPDATE_CHECK_MS = 60 * 60 * 1000

/**
 * Mendaftarkan service worker (hanya build produksi). Strategi "prompt": versi baru TIDAK mengambil alih diam-diam —
 * pengguna diberi tahu dan memilih kapan memuat ulang, sehingga unggahan yang berjalan tidak terputus mendadak
 * dan versi lama tidak terus dipakai tanpa sepengetahuan (prd.md §22).
 */
export function setupServiceWorker() {
  if (!import.meta.env.PROD) return

  const updateSW = registerSW({
    onNeedRefresh() {
      toast('Versi baru tersedia', {
        description: 'Muat ulang untuk memakai versi terbaru. Jika sedang mengunggah file, tunggu sampai selesai.',
        duration: Infinity,
        action: { label: 'Muat ulang', onClick: () => void updateSW(true) },
      })
    },
    onOfflineReady() {
      toast.success('Tampilan aplikasi tersimpan di perangkat ini', {
        description: 'Setelah masuk dan memuat data, jadwal dan tugas terakhir bisa dibaca tanpa koneksi.',
      })
    },
    onRegisteredSW(_url, registration) {
      // Periksa versi baru berkala untuk aplikasi yang dibiarkan terbuka lama.
      if (registration) setInterval(() => void registration.update().catch(() => {}), UPDATE_CHECK_MS)
    },
    onRegisterError(error) {
      console.warn('Service worker gagal didaftarkan; aplikasi tetap berfungsi tanpa mode offline.', error)
    },
  })
}
