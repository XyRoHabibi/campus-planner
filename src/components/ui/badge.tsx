import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils/cn'

/** Badge selalu berisi teks (dan idealnya ikon) — status tidak boleh hanya mengandalkan warna. */
const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold [&_svg]:size-3.5 [&_svg]:shrink-0',
  {
    variants: {
      tone: {
        neutral: 'bg-surface-muted text-muted',
        primary: 'bg-primary-soft text-primary',
        danger: 'bg-danger-soft text-danger-fg',
        warning: 'bg-warning-soft text-warning-fg',
        success: 'bg-success-soft text-success-fg',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}
