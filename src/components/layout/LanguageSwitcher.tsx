import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '@/types/domain'
import { cn } from '@/lib/cn'

/** Choix de la langue MG / FR / EN, mémorisé par i18next. */
export function LanguageSwitcher({ className, tone = 'light' }: { className?: string; tone?: 'light' | 'dark' }) {
  const { t, i18n } = useTranslation()
  const current = i18n.resolvedLanguage
  return (
    <div role="group" aria-label={t('profil.language')} className={cn('inline-flex gap-1', className)}>
      {LANGUAGES.map((lng) => (
        <button
          key={lng}
          type="button"
          lang={lng}
          aria-pressed={current === lng}
          onClick={() => void i18n.changeLanguage(lng)}
          className={cn(
            'min-h-8 min-w-10 rounded-lg px-2 text-xs font-bold uppercase transition',
            current === lng
              ? 'bg-cobalt text-white'
              : tone === 'dark'
                ? 'text-white/70 hover:bg-white/10 hover:text-white'
                : 'text-ink-muted hover:bg-line hover:text-ink',
          )}
        >
          {lng}
        </button>
      ))}
    </div>
  )
}
