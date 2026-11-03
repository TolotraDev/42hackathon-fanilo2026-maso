import { BadgeCheck, CloudOff, Download, LockKeyhole, LogIn, PackageCheck, Smartphone } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { NetworkStatus } from '@/components/layout/NetworkStatus'
import { Avatar, Badge, Button, Card, Input, SegmentedControl } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthProvider'
import { SignOutButton } from '@/features/auth/SignOutButton'
import { FormMessage } from '@/features/auth/FormMessage'
import { hasPin, isValidPin, removePin, setPin } from '@/features/auth/pin'
import { deviceNotificationsOn, notificationsSupported, setDeviceNotifications } from '@/features/notifications/deviceNotifications'
import { QrImage } from '@/features/portail/components'
import { listDirectory, listIndicators, listSources } from '@/features/ressources/resourcesApi'
import { useDataSaver } from '@/hooks/useDataSaver'
import { InstallApp } from '@/components/InstallApp'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useTheme, type ThemePreference } from '@/hooks/useTheme'
import { readPack, savePack } from '@/lib/offlineCache'
import { isStaff } from '@/lib/permissions'

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {hint && <span className="block text-xs text-ink-muted">{hint}</span>}
      </span>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-cobalt' : 'bg-line'}`}
    >
      <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${checked ? 'left-6' : 'left-1'}`} />
    </button>
  )
}

/** Packs hors ligne (M14) : annuaire, statistiques et sources téléchargés sur l'appareil. */
function OfflinePacks() {
  const { t, i18n } = useTranslation()
  const { role, profile } = useAuth()
  const online = useOnlineStatus()
  const packs = [
    { id: 'directory', key: `directory.${role}.${profile?.id ?? 'invite'}`, load: () => listDirectory(role) },
    { id: 'statistics', key: 'statistics', load: listIndicators },
    ...(isStaff(role) ? [{ id: 'sources', key: 'sources', load: listSources }] : []),
  ]
  const [, refresh] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  const download = async () => {
    setBusy(true)
    setError(false)
    try {
      for (const pack of packs) savePack(pack.key, await pack.load())
    } catch {
      setError(true)
    } finally {
      setBusy(false)
      refresh((value) => value + 1)
    }
  }

  return (
    <Card className="dashboard-rise space-y-3 p-5 shadow-sm" style={{ '--i': 3 } as CSSProperties}>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cobalt/10 text-cobalt">
          <PackageCheck className="size-5" aria-hidden />
        </span>
        <div>
          <p className="text-sm font-semibold text-ink">{t('profil.packs.title')}</p>
          <p className="text-xs text-ink-muted">{t('profil.packs.hint')}</p>
        </div>
      </div>
      <ul className="space-y-1 text-xs">
        {packs.map((pack) => {
          const saved = readPack(pack.key)?.savedAt
          return (
            <li key={pack.id} className="flex justify-between gap-2">
              <span className="font-semibold text-ink">{t(`profil.packs.${pack.id}`)}</span>
              <span className="text-ink-muted">
                {saved
                  ? t('profil.packs.savedAt', { date: new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(saved)) })
                  : t('profil.packs.none')}
              </span>
            </li>
          )
        })}
      </ul>
      {error && <FormMessage tone="error">{t('profil.packs.error')}</FormMessage>}
      <Button variant="secondary" block disabled={busy || !online} onClick={() => void download()}>
        <Download className="size-4" aria-hidden />
        {busy ? t('auth.loading') : t('profil.packs.download')}
      </Button>
    </Card>
  )
}

/** Code PIN (M14) : 4 à 6 chiffres, demandé au lancement et après 5 minutes en arrière-plan. */
function PinSettings() {
  const { t } = useTranslation()
  const [enabled, setEnabled] = useState(hasPin)
  const [editing, setEditing] = useState(false)
  const [pin, setPinValue] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)
  const digits = (value: string) => value.replace(/\D/g, '')

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!isValidPin(pin)) return setMessage({ tone: 'error', text: t('pin.invalid') })
    if (pin !== confirm) return setMessage({ tone: 'error', text: t('pin.mismatch') })
    await setPin(pin)
    setEnabled(true)
    setEditing(false)
    setPinValue('')
    setConfirm('')
    setMessage({ tone: 'success', text: t('pin.saved') })
  }

  return (
    <div className="space-y-3 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <LockKeyhole className="size-4 shrink-0 text-cobalt" aria-hidden />
          <span>
            <span className="block text-sm font-semibold text-ink">{t('pin.setting')}</span>
            <span className="block text-xs text-ink-muted">{t('pin.hint')}</span>
          </span>
        </span>
        <Toggle
          label={t('pin.setting')}
          checked={enabled || editing}
          onChange={(next) => {
            setMessage(null)
            if (next) {
              setEditing(true)
              return
            }
            removePin()
            setEnabled(false)
            setEditing(false)
          }}
        />
      </div>
      {editing && (
        <form onSubmit={(event) => void save(event)} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Input type="password" inputMode="numeric" maxLength={6} autoComplete="new-password" aria-label={t('pin.new')} placeholder={t('pin.new')} value={pin} onChange={(event) => setPinValue(digits(event.target.value))} />
          <Input type="password" inputMode="numeric" maxLength={6} autoComplete="new-password" aria-label={t('pin.confirm')} placeholder={t('pin.confirm')} value={confirm} onChange={(event) => setConfirm(digits(event.target.value))} />
          <Button type="submit">{t('pin.save')}</Button>
        </form>
      )}
      {message && <FormMessage tone={message.tone}>{message.text}</FormMessage>}
    </div>
  )
}

/** M14 — Profil et paramètres : compte, badge QR, langue, thème, économie de données, packs, notifications, code PIN. */
export function ProfilPage() {
  const { t } = useTranslation()
  const { preference, setPreference } = useTheme()
  const { installed } = useInstallPrompt()
  const { state, profile, role, leaveGuestMode } = useAuth()
  const navigate = useNavigate()
  const name = profile ? profile.fullName || profile.email : t('auth.guestMode')
  const [dataSaver, setDataSaver] = useDataSaver()
  const [notify, setNotify] = useState(deviceNotificationsOn)
  const badge = profile?.badge
  const today = new Date().toISOString().slice(0, 10)
  const badgeValid = badge && !badge.revoked && badge.validUntil >= today

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Carte principale compte */}
      <Card
        className="dashboard-rise space-y-4 border-t-4 border-t-white/20 p-5 shadow-sm"
        style={{ '--i': 0 } as CSSProperties}
      >
        <div className="flex items-center gap-3">
          <Avatar name={name} className="size-12 text-sm shadow-sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-bold text-ink">{name}</p>
            {profile && <p className="truncate text-xs text-ink-muted">{profile.email}</p>}
          </div>
          {role && (
            <Badge tone="info" className="bg-cobalt/10 text-cobalt border-none">
              {t(`role.${role}`)}
            </Badge>
          )}
        </div>

        {state.status === 'signed_in' && state.offline && (
          <p className="flex items-start gap-2 rounded-xl bg-warning/10 px-3 py-2 text-xs text-warning dark:text-warning/90">
            <CloudOff className="mt-0.5 size-4 shrink-0" aria-hidden />
            {t('auth.offlineSession')}
          </p>
        )}

        {profile ? (
          <SignOutButton variant="block" />
        ) : (
          <Button
            block
            onClick={() => {
              leaveGuestMode()
              navigate('/connexion')
            }}
            className="bg-cobalt text-white hover:bg-cobalt/90 border-none"
          >
            <LogIn className="size-4" aria-hidden />
            {t('auth.signIn')}
          </Button>
        )}
      </Card>

      {/* Badge de presse : le public scanne le QR pour vérifier l'identité du journaliste (W0). */}
      {badge && (
        <Card className="dashboard-rise flex flex-col items-center gap-3 p-5 text-center shadow-sm sm:flex-row sm:text-left" style={{ '--i': 1 } as CSSProperties}>
          {badgeValid ? (
            <QrImage value={`${window.location.origin}/portail/verifier/${badge.code}`} label={t('profil.badge.qr', { code: badge.code })} size={128} />
          ) : (
            <BadgeCheck className="size-12 text-ink-muted" aria-hidden />
          )}
          <div className="space-y-1">
            <p className="font-display text-sm font-bold text-navy dark:text-ink">{t('profil.badge.title')}</p>
            <p className="font-mono text-xs text-ink">{badge.code}</p>
            <p className={`text-xs font-semibold ${badgeValid ? 'text-success' : 'text-danger'}`}>
              {badge.revoked ? t('admin.badge.revoked') : badgeValid ? t('admin.badge.until', { date: badge.validUntil }) : t('admin.badge.expired')}
            </p>
            {badgeValid && <p className="text-xs text-ink-muted">{t('profil.badge.hint')}</p>}
          </div>
        </Card>
      )}

      {/* Paramètres (langue, thème, réseau) */}
      <Card
        className="dashboard-rise divide-y divide-line border-t-4 border-t-white/20 shadow-sm"
        style={{ '--i': 1 } as CSSProperties}
      >
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
        <Row label={t('profil.dataSaver')} hint={t('profil.dataSaverHint')}>
          <Toggle label={t('profil.dataSaver')} checked={dataSaver} onChange={setDataSaver} />
        </Row>
        {profile && notificationsSupported() && (
          <Row label={t('profil.notifications')} hint={t('profil.notificationsHint')}>
            <Toggle label={t('profil.notifications')} checked={notify} onChange={(next) => void setDeviceNotifications(next).then(setNotify)} />
          </Row>
        )}
        {profile && <PinSettings />}
      </Card>

      <OfflinePacks />

      {/* Installation PWA */}
      <Card
        className="dashboard-rise space-y-3 border-t-4 border-t-white/20 p-5 shadow-sm"
        style={{ '--i': 2 } as CSSProperties}
      >
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cobalt/10 text-cobalt">
            <Smartphone className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">{t('profil.install')}</p>
            <p className="text-xs text-ink-muted">{installed ? t('profil.installed') : t('profil.installHint')}</p>
          </div>
        </div>
        <InstallApp block />
      </Card>

      <p className="dashboard-fade text-center text-xs text-ink-muted">
        {t('app.name')} · {t('profil.version', { version: __APP_VERSION__ })}
      </p>
    </div>
  )
}