import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from '@radix-ui/react-slot'
import type { ButtonHTMLAttributes } from 'react'

import { cn } from '@/lib/utils/cn'

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground shadow-card hover:bg-primary-hover',
        secondary: 'border border-border bg-surface text-foreground shadow-card hover:bg-surface-muted',
        ghost: 'text-foreground hover:bg-surface-muted',
        danger: 'bg-danger-fg text-white hover:opacity-90',
      },
      size: {
        sm: 'h-9 px-3',
        md: 'h-11 px-4 sm:h-10',
        lg: 'h-12 px-5 text-base',
        icon: 'size-11 sm:size-10',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export function Button({ className, variant, size, asChild, type = 'button', ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      {...(asChild ? {} : { type })}
      {...props}
    />
  )
}
