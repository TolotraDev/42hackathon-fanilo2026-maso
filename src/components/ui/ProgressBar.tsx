import type { Tone } from '@/types/domain'
import { cn } from '@/lib/cn'

const FILLS: Record<Tone, string> = {
  neutral: 'bg-ink-muted',
  info: 'bg-cobalt',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
}

interface ProgressBarProps {
  value: number
  max: number
  tone?: Tone
  label: string
}

export function ProgressBar({ value, max, tone = 'info', label }: ProgressBarProps) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className="h-2 w-full overflow-hidden rounded-full bg-line"
    >
      <div className={cn('h-full rounded-full transition-all', FILLS[tone])} style={{ width: `${percent}%` }} />
    </div>
  )
}
