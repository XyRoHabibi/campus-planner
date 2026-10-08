import { BookOpen, CalendarClock, CalendarDays, House, ListChecks, Settings, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

/** Urutan & label mengikuti prd.md §8. */
export const primaryNav: NavItem[] = [
  { to: '/', label: 'Beranda', icon: House },
  { to: '/schedule', label: 'Jadwal', icon: CalendarClock },
  { to: '/tasks', label: 'Tugas', icon: ListChecks },
  { to: '/calendar', label: 'Kalender', icon: CalendarDays },
]

/** Di mobile masuk menu "Lainnya". */
export const secondaryNav: NavItem[] = [
  { to: '/courses', label: 'Mata Kuliah', icon: BookOpen },
  { to: '/settings', label: 'Pengaturan', icon: Settings },
]

export const desktopNav: NavItem[] = [...primaryNav, ...secondaryNav]
