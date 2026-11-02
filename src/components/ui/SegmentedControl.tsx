import { cn } from '@/lib/cn'

interface SegmentedControlProps<T extends string> {
  value: T
  options: ReadonlyArray<{ value: T; label: string }>
  onChange: (value: T) => void
  label: string
  className?: string
}

/** Onglets en pilule, comme « Actives / Projets » sur la maquette. */
export function SegmentedControl<T extends string>({ value, options, onChange, label, className }: SegmentedControlProps<T>) {
  return (
    <div role="tablist" aria-label={label} className={cn('flex rounded-full bg-line p-1', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            'min-h-9 flex-1 rounded-full px-3 text-sm font-semibold transition',
            option.value === value ? 'bg-cobalt text-white shadow-sm' : 'text-ink-muted hover:text-ink',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
