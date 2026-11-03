import { useTranslation } from 'react-i18next'

export function Logo({ withTagline = false }: { withTagline?: boolean }) {
  const { t } = useTranslation()
  return (
    <span className="flex items-center gap-2.5">
      <img src="/logo-mark.png" alt="" className="size-9 rounded-full ring-1 ring-white/15" />
      <span className="min-w-0">
        <span className="block font-display text-lg font-extrabold leading-none tracking-wide text-white">{t('app.name')}</span>
        {withTagline && <span className="mt-1 block text-[11px] leading-tight text-white/65">{t('app.tagline')}</span>}
      </span>
    </span>
  )
}
