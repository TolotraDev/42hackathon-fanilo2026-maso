import { SearchX } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { homePathFor } from '@/lib/permissions'

export function NotFoundPage() {
  const { t } = useTranslation()
  const { role } = useAuth()
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <SearchX className="size-12 text-ink-muted" aria-hidden />
      <h2 className="font-display text-lg font-bold text-ink">{t('notFound.title')}</h2>
      <Link to={homePathFor(role)} className="text-sm font-semibold text-cobalt hover:underline">
        {t('notFound.back')}
      </Link>
    </div>
  )
}
