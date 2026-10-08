import { Bell, ClipboardList, GraduationCap } from 'lucide-react'
import { Link } from 'react-router'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Reminder } from '@/lib/utils/reminders'

const MAX_SHOWN = 3

/**
 * Pengingat aktif di dalam aplikasi (prd.md §9.8): kelas yang segera mulai dan tenggat yang mendekat.
 * Tidak tampil jika tidak ada. Tiap baris menyebut jenisnya dengan ikon dan teks.
 */
export function RemindersStrip({ reminders }: { reminders: Reminder[] }) {
  if (reminders.length === 0) return null
  const shown = reminders.slice(0, MAX_SHOWN)
  const rest = reminders.length - shown.length
  return (
    <Card className="mb-4 border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Bell aria-hidden="true" className="size-4" />
          Pengingat ({reminders.length})
        </CardTitle>
        <Link to="/settings" className="text-sm font-semibold text-primary hover:underline">
          Atur
        </Link>
      </CardHeader>
      <CardContent className="pt-3 sm:pt-3">
        <ul className="divide-y divide-border">
          {shown.map((r) => {
            const Icon = r.kind === 'class' ? GraduationCap : ClipboardList
            return (
              <li key={r.key}>
                <Link to={r.href} className="flex min-h-12 items-start gap-3 py-2.5 hover:bg-surface-muted">
                  <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      <span className="sr-only">{r.kind === 'class' ? 'Kelas: ' : 'Tugas: '}</span>
                      {r.title}
                    </span>
                    <span className="block text-xs text-muted">{r.body}</span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
        {rest > 0 && <p className="mt-2 text-xs text-muted">+{rest} pengingat lainnya</p>}
      </CardContent>
    </Card>
  )
}
