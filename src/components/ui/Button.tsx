import type { ButtonHTMLAttributes, Ref } from 'react'
import { cn } from '@/lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-cobalt text-white hover:brightness-110 shadow-sm',
  secondary: 'bg-surface text-cobalt border border-line hover:bg-canvas',
  ghost: 'text-cobalt hover:bg-cobalt/10',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  block?: boolean
  ref?: Ref<HTMLButtonElement>
}

export function Button({ variant = 'primary', block = false, className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        block && 'w-full',
        className,
      )}
      {...props}
    />
  )
}
