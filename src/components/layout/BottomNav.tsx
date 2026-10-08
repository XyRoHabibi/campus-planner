import { Ellipsis } from 'lucide-react'
import { useState } from 'react'
import { NavLink, useLocation } from 'react-router'

import { AccountMenu } from '@/components/layout/AccountMenu'
import { primaryNav, secondaryNav } from '@/components/layout/nav'
import { BottomSheet } from '@/components/ui/sheet'
import { cn } from '@/lib/utils/cn'

const itemClass =
  'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[0.6875rem] font-medium transition-colors'

export function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const { pathname } = useLocation()
  const moreActive = secondaryNav.some((item) => pathname.startsWith(item.to))

  return (
    <>
      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {primaryNav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => cn(itemClass, isActive ? 'text-primary' : 'text-muted')}
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                    isActive && 'bg-primary-soft',
                  )}
                >
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className={isActive ? 'font-semibold' : undefined}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-haspopup="dialog"
          className={cn(itemClass, moreActive ? 'text-primary' : 'text-muted')}
        >
          <span className={cn('flex h-7 w-12 items-center justify-center rounded-full', moreActive && 'bg-primary-soft')}>
            <Ellipsis aria-hidden="true" className="size-5" />
          </span>
          <span className={moreActive ? 'font-semibold' : undefined}>Lainnya</span>
        </button>
      </nav>

      <BottomSheet open={moreOpen} onOpenChange={setMoreOpen} title="Lainnya">
        <ul className="space-y-1">
          {secondaryNav.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                onClick={() => setMoreOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium',
                    isActive ? 'bg-primary-soft text-primary' : 'text-foreground hover:bg-surface-muted',
                  )
                }
              >
                <Icon aria-hidden="true" className="size-5" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="mt-3 border-t border-border pt-3">
          <AccountMenu />
        </div>
      </BottomSheet>
    </>
  )
}
