import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-2xl border border-line bg-surface shadow-[0_1px_3px_rgb(10_47_79/0.06)]', className)}
      {...props}
    />
  )
}

interface SectionTitleProps {
  children: React.ReactNode
  action?: React.ReactNode
}

export function SectionTitle({ children, action }: SectionTitleProps) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h2 className="font-display text-sm font-bold text-navy dark:text-ink">{children}</h2>
      {action}
    </div>
  )
}
