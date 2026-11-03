import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'

export function Logo({ withTagline = false, tone = 'dark' }: { withTagline?: boolean; tone?: 'light' | 'dark' }) {
  const { t } = useTranslation()
  const isDark = tone === 'dark'

  return (
    <span className="flex items-center gap-2.5">
      <img src="/logo-mark.png" alt="" className={cn('size-9 rounded-full ring-1', isDark ? 'ring-white/15' : 'ring-navy/15')} />
      <span className="min-w-0">
        <span className={cn('block font-display text-lg font-extrabold leading-none tracking-wide', isDark ? 'text-white' : 'text-navy')}>
          {t('app.name')}
        </span>
        {withTagline && (
          <span className={cn('mt-1 block text-[11px] leading-tight', isDark ? 'text-white/65' : 'text-navy/70')}>
            {t('app.tagline')}
          </span>
        )}
      </span>
    </span>
  )
}
