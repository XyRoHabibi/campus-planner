import { Check, type LucideIcon } from 'lucide-react'
import { useId } from 'react'

import { cn } from '@/lib/utils/cn'

interface Option<T extends string> {
  value: T
  label: string
  icon?: LucideIcon
}

interface OptionCardsProps<T extends string> {
  legend: string
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
}

/**
 * Pilihan tunggal berupa kartu. Memakai radio native (navigasi panah, dibaca screen reader sebagai grup);
 * pilihan ditandai ikon centang + garis tebal, bukan warna saja.
 */
export function OptionCards<T extends string>({ legend, options, value, onChange }: OptionCardsProps<T>) {
  const name = useId()
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map(({ value: v, label, icon: Icon }) => {
          const selected = v === value
          return (
            <label key={v} className="relative block cursor-pointer">
              <input type="radio" name={name} value={v} checked={selected} onChange={() => onChange(v)} className="peer sr-only" />
              <span
                className={cn(
                  'flex min-h-12 items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors',
                  'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring',
                  selected ? 'border-primary bg-primary-soft text-primary ring-1 ring-primary' : 'border-border bg-surface hover:bg-surface-muted',
                )}
              >
                {Icon && <Icon aria-hidden="true" className="size-4 shrink-0" />}
                <span className="flex-1">{label}</span>
                {selected && <Check aria-hidden="true" className="size-4 shrink-0" strokeWidth={3} />}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
