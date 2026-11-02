import { ChevronRight, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

interface ListRowProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  leading?: React.ReactNode
  trailing?: React.ReactNode
  onClick?: () => void
  className?: string
}

/** Ligne cliquable avec icône et chevron (écran Ressources de la maquette). */
export function ListRow({ title, subtitle, icon: Icon, leading, trailing, onClick, className }: ListRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-canvas', className)}
    >
      {leading ??
        (Icon && (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cobalt/10 text-cobalt">
            <Icon className="size-5" aria-hidden />
          </span>
        ))}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{title}</span>
        {subtitle && <span className="block truncate text-xs text-ink-muted">{subtitle}</span>}
      </span>
      {trailing ?? <ChevronRight className="size-5 shrink-0 text-ink-muted" aria-hidden />}
    </button>
  )
}
