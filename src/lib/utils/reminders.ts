import { formatCountdown, formatDue, timeToMinutes } from '@/lib/utils/dates'
import { isSessionActiveOn, toISODate } from '@/lib/utils/schedule'
import type { Settings } from '@/lib/settings/settings'
import type { ClassSession, Task } from '@/types'

export interface Reminder {
  /** Stabil per kejadian: sesi per tanggal, tugas per nilai tenggat — dipakai agar tiap pengingat hanya muncul sekali. */
  key: string
  kind: 'class' | 'task'
  title: string
  body: string
  /** Saat pengingat mulai aktif (= waktu kejadian − jeda). */
  at: Date
  /** Waktu kejadian: mulai kelas / tenggat. */
  target: Date
  href: string
}

type ReminderSettings = Pick<Settings, 'remindersEnabled' | 'classLeadMinutes' | 'taskLeadMinutes'>

const MIN = 60_000

/** Sisa menit sampai `target` (pembulatan ke atas), minimal 1. */
const minutesUntil = (target: Date, now: Date) => Math.max(1, Math.ceil((target.getTime() - now.getTime()) / MIN))

/** Tenggat tanpa jam dianggap jatuh tempo pada akhir hari, tetapi pengingatnya dihitung dari pukul 09.00 hari itu. */
const DATE_ONLY_ANCHOR_HOUR = 9

/**
 * Pengingat yang AKTIF pada `now` (berbasis keadaan, bukan pemicu sekali): kelas yang mulai dalam jeda yang dipilih,
 * dan tugas yang tenggatnya masuk jeda tetapi belum lewat. Item yang dimatikan per item, tugas selesai, dan sesi di luar
 * periode semester tidak muncul. Hanya berjalan saat aplikasi terbuka (prd.md §9.8) — tidak menjanjikan notifikasi saat tertutup.
 */
export function computeReminders(
  now: Date,
  settings: ReminderSettings,
  sessions: ClassSession[],
  tasks: Task[],
  courseNames: Map<string, string>,
): Reminder[] {
  if (!settings.remindersEnabled) return []
  const out: Reminder[] = []

  for (const s of sessions) {
    if (!s.reminderEnabled || !isSessionActiveOn(s, now)) continue
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, timeToMinutes(s.startTime))
    const at = new Date(start.getTime() - settings.classLeadMinutes * MIN)
    if (now < at || now >= start) continue
    out.push({
      key: `s:${s.id}:${toISODate(now)}`,
      kind: 'class',
      title: `${courseNames.get(s.courseId) ?? 'Kelas'} mulai pukul ${s.startTime}`,
      body: `${formatCountdown(minutesUntil(start, now))} · ${s.room ?? 'Ruangan belum ditentukan'}`,
      at,
      target: start,
      href: '/schedule',
    })
  }

  for (const t of tasks) {
    if (!t.reminderEnabled || t.status === 'done' || t.dueAt === null) continue
    const due = new Date(t.dueAt)
    const anchor = t.dueHasTime ? due : new Date(due.getFullYear(), due.getMonth(), due.getDate(), DATE_ONLY_ANCHOR_HOUR)
    const at = new Date(anchor.getTime() - settings.taskLeadMinutes * MIN)
    if (now < at || now >= due) continue
    out.push({
      key: `t:${t.id}:${t.dueAt}`,
      kind: 'task',
      title: t.title,
      body: `Tenggat ${formatDue(t.dueAt, t.dueHasTime, now).toLowerCase()}`,
      at,
      target: due,
      href: `/tasks/${t.id}`,
    })
  }

  return out.sort((a, b) => a.target.getTime() - b.target.getTime())
}

/**
 * "Baru" = pengingat baru saja aktif (≤ `windowMinutes`). Hanya yang baru memunculkan toast/notifikasi; yang sudah lama
 * aktif tetap terlihat di daftar Beranda tetapi tidak membanjiri pengguna saat aplikasi baru dibuka.
 */
export function isFresh(reminder: Pick<Reminder, 'at'>, now: Date, windowMinutes = 15) {
  const age = now.getTime() - reminder.at.getTime()
  return age >= 0 && age <= windowMinutes * MIN
}
