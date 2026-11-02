import { cn } from '@/lib/cn'

/** Pastille avec initiales (aucune photo de personne réelle). */
export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
  return (
    <span
      aria-hidden
      className={cn('flex size-10 shrink-0 items-center justify-center rounded-full bg-navy font-display text-xs font-bold text-white', className)}
    >
      {initials}
    </span>
  )
}
