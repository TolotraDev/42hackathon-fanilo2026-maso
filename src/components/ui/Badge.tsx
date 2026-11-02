import type { Tone } from '@/types/domain'
import { cn } from '@/lib/cn'

const TONES: Record<Tone, string> = {
  neutral: 'bg-line text-ink-muted',
  info: 'bg-cobalt/12 text-cobalt',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/20 text-ink',
  danger: 'bg-danger/15 text-danger',
}

const SOLID_TONES: Record<Tone, string> = {
  neutral: 'bg-ink-muted text-white',
  info: 'bg-cobalt text-white',
  success: 'bg-success text-white',
  warning: 'bg-warning text-navy',
  danger: 'bg-danger text-white',
}

interface BadgeProps {
  tone?: Tone
  solid?: boolean
  className?: string
  children: React.ReactNode
}

/** Étiquette de statut : le texte est toujours présent, la couleur n'est qu'un renfort. */
export function Badge({ tone = 'neutral', solid = false, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold',
        solid ? SOLID_TONES[tone] : TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
