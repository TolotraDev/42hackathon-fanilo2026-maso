import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthProvider'

/** Utilisateur connecté (nom + rôle écrit), en bas de la barre latérale et du menu mobile. */
export function UserBadge({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation()
  const { profile, role } = useAuth()
  if (!role) return null
  const name = profile ? profile.fullName || profile.email : t('auth.guestMode')
  return (
    <Link to="/profil" onClick={onNavigate} className="flex items-center gap-3 rounded-xl border border-line bg-canvas px-3 py-2.5 transition hover:border-cobalt/40 dark:border-transparent dark:bg-transparent dark:hover:bg-white/10">
      <Avatar name={name} className="bg-cobalt" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-ink dark:text-white">{name}</span>
        <span className="block truncate text-xs text-ink-muted dark:text-white/65">{t(`role.${role}`)}</span>
      </span>
    </Link>
  )
}
