import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

const FIELD = 'w-full rounded-xl border border-line bg-canvas px-3.5 text-sm text-ink placeholder:text-ink-muted focus:border-cobalt focus:outline-none focus:ring-2 focus:ring-cobalt/25'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(FIELD, 'min-h-11', className)} {...props} />
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(FIELD, 'py-3 leading-relaxed', className)} {...props} />
}
