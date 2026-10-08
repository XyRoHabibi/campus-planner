import { Check } from 'lucide-react'
import { useId } from 'react'

import { COURSE_COLORS } from '@/lib/constants/course-colors'
import { cn } from '@/lib/utils/cn'

interface ColorPickerProps {
  value: string
  onChange: (hex: string) => void
  error?: string
}

/**
 * Pemilih warna dari palet tetap. Memakai radio native: bisa dioperasikan keyboard (panah),
 * dan pilihan ditandai ikon centang + nama warna — tidak hanya mengandalkan warna.
 */
export function ColorPicker({ value, onChange, error }: ColorPickerProps) {
  const name = useId()
  const selected = COURSE_COLORS.find((c) => c.hex === value)
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-foreground">Warna identitas</legend>
      <div className="flex flex-wrap gap-2.5">
        {COURSE_COLORS.map((c) => (
          <label key={c.hex} className="relative cursor-pointer">
            <input
              type="radio"
              name={name}
              value={c.hex}
              checked={value === c.hex}
              onChange={() => onChange(c.hex)}
              className="peer sr-only"
            />
            <span className="sr-only">{c.name}</span>
            <span
              aria-hidden="true"
              style={{ backgroundColor: c.hex }}
              className={cn(
                'flex size-11 items-center justify-center rounded-full border-2 border-surface text-white shadow-card transition-shadow sm:size-9',
                'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring',
                value === c.hex && 'ring-2 ring-foreground ring-offset-2 ring-offset-surface',
              )}
            >
              {value === c.hex && <Check className="size-5 sm:size-4" strokeWidth={3} />}
            </span>
          </label>
        ))}
      </div>
      <p className="mt-2 text-sm text-muted">
        {selected ? `Warna dipilih: ${selected.name}` : 'Belum ada warna dipilih'}
      </p>
      {error && <p className="mt-1 text-sm text-danger-fg">{error}</p>}
    </fieldset>
  )
}
