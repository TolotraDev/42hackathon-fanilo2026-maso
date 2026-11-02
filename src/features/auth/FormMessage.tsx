import { CheckCircle2, CircleAlert } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Message de formulaire (erreur ou succès) : icône + texte, annoncé aux lecteurs d'écran. */
export function FormMessage({ tone, children }: { tone: 'error' | 'success'; children: React.ReactNode }) {
  const Icon = tone === 'error' ? CircleAlert : CheckCircle2
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm',
        tone === 'error' ? 'bg-danger/10 text-danger' : 'bg-success/12 text-success',
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  )
}
