import { WifiOff } from 'lucide-react'
import { Outlet } from 'react-router'

import { BottomNav } from '@/components/layout/BottomNav'
import { Sidebar } from '@/components/layout/Sidebar'
import { useReminderNotifier } from '@/features/reminders/useReminders'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export function AppLayout() {
  const online = useOnlineStatus()
  useReminderNotifier() // toast/notifikasi untuk pengingat baru; hanya saat aplikasi terbuka

  return (
    <div className="min-h-dvh">
      <a
        href="#konten-utama"
        className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Lewati ke konten utama
      </a>
      <Sidebar />
      <div className="md:pl-64">
        {!online && (
          <div
            role="status"
            className="flex items-start gap-2 border-b border-warning/40 bg-warning-soft px-4 py-2.5 text-sm text-warning-fg"
          >
            <WifiOff aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p>
              <strong>Anda sedang offline.</strong> Menampilkan data terakhir yang tersimpan di perangkat ini. Perubahan dan unggah file memerlukan koneksi internet.
            </p>
          </div>
        )}
        <main id="konten-utama" tabIndex={-1} className="pb-nav mx-auto max-w-5xl px-4 py-5 outline-none sm:px-6 sm:py-8 md:pb-10">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
