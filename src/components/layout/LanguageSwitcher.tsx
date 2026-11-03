import { Check } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LANGUAGES, type Language } from '@/types/domain'
import { cn } from '@/lib/cn'

/** Drapeaux dessinés (les drapeaux emoji ne s'affichent pas sous Windows). */
function Flag({ language, className }: { language: Language; className?: string }) {
  return (
    <svg viewBox="0 0 30 30" aria-hidden className={cn('rounded-full', className)}>
      <defs>
        <clipPath id={`flag-${language}`}>
          <circle cx="15" cy="15" r="15" />
        </clipPath>
      </defs>
      <g clipPath={`url(#flag-${language})`}>
        {language === 'fr' && (
          <>
            <rect width="10" height="30" fill="#0055A4" />
            <rect x="10" width="10" height="30" fill="#FFFFFF" />
            <rect x="20" width="10" height="30" fill="#EF4135" />
          </>
        )}
        {language === 'mg' && (
          <>
            <rect width="30" height="15" fill="#FC3D32" />
            <rect y="15" width="30" height="15" fill="#007E3A" />
            <rect width="11" height="30" fill="#FFFFFF" />
          </>
        )}
        {language === 'en' && (
          <>
            <rect width="30" height="30" fill="#012169" />
            <path d="M0 0L30 30M30 0L0 30" stroke="#FFFFFF" strokeWidth="6" />
            <path d="M0 0L30 30M30 0L0 30" stroke="#C8102E" strokeWidth="2" />
            <path d="M15 0V30M0 15H30" stroke="#FFFFFF" strokeWidth="10" />
            <path d="M15 0V30M0 15H30" stroke="#C8102E" strokeWidth="6" />
          </>
        )}
      </g>
    </svg>
  )
}

/**
 * Choix de la langue MG / FR / EN, mémorisé par i18next : trois drapeaux superposés,
 * la langue active au premier plan ; un clic ouvre la liste.
 */
export function LanguageSwitcher({ className, tone = 'light' }: { className?: string; tone?: 'light' | 'dark' }) {
  const { t, i18n } = useTranslation()
  const current = (LANGUAGES.find((lng) => lng === i18n.resolvedLanguage) ?? 'fr') as Language
  const others = LANGUAGES.filter((lng) => lng !== current)
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !root.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])

  const ring = tone === 'dark' ? 'ring-[#0A2F4F]' : 'ring-surface'

  return (
    <div ref={root} className={cn('relative inline-flex', className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t('profil.language')} : ${t(`language.${current}`)}`}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'group flex h-10 items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 transition',
          tone === 'dark' ? 'hover:bg-white/10' : 'hover:bg-line/70',
        )}
      >
        <span className="relative flex h-8 w-[3.25rem] items-center">
          {/* Les deux autres langues en retrait, la langue active devant. */}
          {others.map((lng, index) => (
            <Flag
              key={lng}
              language={lng}
              className={cn('absolute size-6 opacity-80 ring-2 transition-transform duration-300 group-hover:opacity-100', ring, index === 0 ? 'left-[1.375rem] group-hover:translate-x-1' : 'left-[0.875rem] group-hover:translate-x-0.5')}
            />
          ))}
          <Flag language={current} className={cn('absolute left-0 z-10 size-8 shadow-md ring-2', ring)} />
        </span>
        <span className={cn('text-xs font-bold uppercase', tone === 'dark' ? 'text-white' : 'text-ink')}>{current}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="dashboard-fade absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-[0_18px_32px_rgba(10,47,79,0.18)]"
        >
          {LANGUAGES.map((lng) => (
            <button
              key={lng}
              type="button"
              role="menuitemradio"
              aria-checked={current === lng}
              lang={lng}
              onClick={() => {
                void i18n.changeLanguage(lng)
                setOpen(false)
              }}
              className={cn(
                'flex min-h-11 w-full items-center gap-3 rounded-xl px-2.5 text-left text-sm transition',
                current === lng ? 'bg-cobalt/10 font-semibold text-cobalt' : 'text-ink hover:bg-canvas',
              )}
            >
              <Flag language={lng} className="size-6 shrink-0 ring-1 ring-line" />
              <span className="flex-1">{t(`language.${lng}`)}</span>
              {current === lng && <Check className="size-4" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
