import { cn } from '@/lib/utils/cn'

interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  /** ID elemen yang berisi label terlihat (disarankan). */
  labelledBy?: string
  describedBy?: string
  id?: string
}

/**
 * Saklar aksesibel (role="switch"). Keadaan ditandai posisi tombol DAN teks "Aktif"/"Mati" di sampingnya,
 * bukan warna saja (prd.md §6).
 */
export function Switch({ checked, onCheckedChange, disabled, labelledBy, describedBy, id }: SwitchProps) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2">
      <span aria-hidden="true" className="w-9 text-right text-xs font-semibold text-muted">
        {checked ? 'Aktif' : 'Mati'}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50',
          // Area sentuh ≥ 44px tanpa menambah ukuran visual.
          'before:absolute before:-inset-2 before:content-[""]',
          checked ? 'border-primary bg-primary' : 'border-border bg-surface-muted',
        )}
      >
        <span
          aria-hidden="true"
          className={cn('inline-block size-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-6' : 'translate-x-1')}
        />
      </button>
    </span>
  )
}
