import { CloudOff, Download, LogIn, LogOut, Smartphone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { NetworkStatus } from '@/components/layout/NetworkStatus'
import { Avatar, Badge, Button, Card, SegmentedControl } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthProvider'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { useTheme, type ThemePreference } from '@/hooks/useTheme'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm font-semibold text-ink">{label}</span>
      {children}
    </div>
  )
}

/** M14 — Profil et paramètres : compte, langue, thème, installation, réseau. */
export function ProfilPage() {
  const { t } = useTranslation()
  const { preference, setPreference } = useTheme()
  const { canInstall, installed, install } = useInstallPrompt()
  const { state, profile, role, signOut, leaveGuestMode } = useAuth()
  const navigate = useNavigate()
  const name = profile ? profile.fullName || profile.email : t('auth.guestMode')

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card className="space-y-4 p-4">
        <div className="flex items-center gap-3">
          <Avatar name={name} className="size-12 text-sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-bold text-ink">{name}</p>
            {profile && <p className="truncate text-xs text-ink-muted">{profile.email}</p>}
          </div>
          {role && <Badge tone="info">{t(`role.${role}`)}</Badge>}
        </div>
        {state.status === 'signed_in' && state.offline && (
          <p className="flex items-start gap-2 rounded-xl bg-warning/20 px-3 py-2 text-xs text-ink">
            <CloudOff className="mt-0.5 size-4 shrink-0" aria-hidden />
            {t('auth.offlineSession')}
          </p>
        )}
        {profile ? (
          <Button variant="secondary" block onClick={() => void signOut().then(() => navigate('/connexion'))}>
            <LogOut className="size-4" aria-hidden />
            {t('auth.signOut')}
          </Button>
        ) : (
          <Button
            block
            onClick={() => {
              leaveGuestMode()
              navigate('/connexion')
            }}
          >
            <LogIn className="size-4" aria-hidden />
            {t('auth.signIn')}
          </Button>
        )}
      </Card>

      <Card className="divide-y divide-line">
        <Row label={t('profil.language')}>
          <LanguageSwitcher />
        </Row>
        <Row label={t('profil.theme')}>
          <SegmentedControl<ThemePreference>
            label={t('profil.theme')}
            value={preference}
            onChange={setPreference}
            options={[
              { value: 'light', label: t('profil.themeLight') },
              { value: 'dark', label: t('profil.themeDark') },
              { value: 'system', label: t('profil.themeSystem') },
            ]}
            className="sm:w-72"
          />
        </Row>
        <Row label={t('profil.network')}>
          <NetworkStatus className="text-ink-muted" />
        </Row>
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cobalt/10 text-cobalt">
            <Smartphone className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">{t('profil.install')}</p>
            <p className="text-xs text-ink-muted">
              {installed ? t('profil.installed') : canInstall ? t('profil.installHint') : t('profil.installUnavailable')}
            </p>
          </div>
        </div>
        {canInstall && !installed && (
          <Button block onClick={() => void install()}>
            <Download className="size-4" aria-hidden />
            {t('profil.install')}
          </Button>
        )}
      </Card>

      <p className="text-center text-xs text-ink-muted">
        {t('app.name')} · {t('profil.version', { version: __APP_VERSION__ })}
      </p>
    </div>
  )
}
