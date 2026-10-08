import { ChevronDown, Search } from 'lucide-react'
import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

import { cn } from '@/lib/utils/cn'

const controlClass =
  'h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted sm:h-10'

/** Kolom pencarian dengan label tersembunyi (tetap terbaca screen reader). */
export function SearchInput({
  className,
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={cn('relative block', className)}>
      <span className="sr-only">{label}</span>
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <input type="search" className={cn(controlClass, 'pl-9')} {...props} />
    </label>
  )
}

/** `<select>` native: nyaman di HP (picker standar perangkat) dan mudah dioperasikan keyboard. */
export function SelectField({
  className,
  label,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className={cn('relative block', className)}>
      <span className="sr-only">{label}</span>
      <select className={cn(controlClass, 'appearance-none pr-9')} {...props}>
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
    </label>
  )
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  /** Elemen tambahan di dalam kolom (mis. tombol tampilkan password), diletakkan di kanan. */
  trailing?: ReactNode
}

/** Input dengan label terlihat; error dikaitkan ke field lewat aria-describedby (prd.md §18). */
export function TextField({ label, error, trailing, id, className, ...props }: TextFieldProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const errorId = `${fieldId}-error`
  return (
    <div className={className}>
      <label htmlFor={fieldId} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(controlClass, trailing && 'pr-12', error && 'border-danger')}
          {...props}
        />
        {trailing && <div className="absolute inset-y-0 right-0 flex items-center pr-1">{trailing}</div>}
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-danger-fg">
          {error}
        </p>
      )}
    </div>
  )
}

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
}

export function TextAreaField({ label, error, id, className, ...props }: TextAreaFieldProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const errorId = `${fieldId}-error`
  return (
    <div className={className}>
      <label htmlFor={fieldId} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
      <textarea
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(controlClass, 'h-auto min-h-24 py-2.5 sm:h-auto', error && 'border-danger')}
        {...props}
      />
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-danger-fg">
          {error}
        </p>
      )}
    </div>
  )
}

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
}

/** Select native dengan label terlihat (untuk form). `SelectField` di atas memakai label tersembunyi (filter). */
export function FormSelect({ label, error, id, className, children, ...props }: FormSelectProps) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const errorId = `${fieldId}-error`
  return (
    <div className={className}>
      <label htmlFor={fieldId} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <select
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(controlClass, 'appearance-none pr-9', error && 'border-danger')}
          {...props}
        >
          {children}
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-danger-fg">
          {error}
        </p>
      )}
    </div>
  )
}

interface CheckboxFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  description?: string
}

/** Kotak centang native dengan label terlihat; seluruh baris bisa disentuh (target ≥ 44px). */
export function CheckboxField({ label, description, className, ...props }: CheckboxFieldProps) {
  return (
    <label className={cn('flex min-h-11 cursor-pointer items-start gap-3 rounded-lg py-1.5', className)}>
      <input type="checkbox" className="mt-0.5 size-5 shrink-0 cursor-pointer accent-[var(--primary)]" {...props} />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
    </label>
  )
}
