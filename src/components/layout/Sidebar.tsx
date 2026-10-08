import { CalendarCheck2 } from 'lucide-react'
import { NavLink } from 'react-router'

import { AccountMenu } from '@/components/layout/AccountMenu'
import { desktopNav } from '@/components/layout/nav'
import { cn } from '@/lib/utils/cn'

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-surface md:flex">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <CalendarCheck2 aria-hidden="true" className="size-5" />
        </div>
        <div className="leading-tight">
          <p className="text-base font-bold">Campus Planner</p>
          <p className="text-xs text-muted">Jadwal &amp; tugas kuliah</p>
        </div>
      </div>
      <nav aria-label="Navigasi utama" className="flex-1 px-3">
        <ul className="space-y-1">
          {desktopNav.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-soft font-semibold text-primary'
                      : 'text-muted hover:bg-surface-muted hover:text-foreground',
                  )
                }
              >
                <Icon aria-hidden="true" className="size-5" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-border p-4">
        <AccountMenu />
      </div>
    </aside>
  )
}
