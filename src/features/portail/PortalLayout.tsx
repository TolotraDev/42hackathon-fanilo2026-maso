import { BriefcaseBusiness, FileSearch, LayoutDashboard, LogIn, Megaphone, Moon, Newspaper, QrCode, Sun, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { Logo } from '@/components/layout/Logo'
import { Lazy } from '@/features/auth/RouteGuards'
import { useAuth } from '@/features/auth/AuthProvider'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/cn'

interface PortalLink {
  to: string
  key: 'reports' | 'submit' | 'track' | 'verify' | 'resources'
  icon: LucideIcon
  end: boolean
}

const REPORTS: PortalLink = { to: '/portail', key: 'reports', icon: Newspaper, end: true }
const SUBMIT: PortalLink = { to: '/portail/signaler', key: 'submit', icon: Megaphone, end: false }
const TRACK: PortalLink = { to: '/portail/suivi', key: 'track', icon: FileSearch, end: false }
const VERIFY: PortalLink = { to: '/portail/verifier', key: 'verify', icon: QrCode, end: false }
const RESOURCES: PortalLink = { to: '/portail/ressources', key: 'resources', icon: BriefcaseBusiness, end: false }
const LINKS = [REPORTS, SUBMIT, TRACK, VERIFY, RESOURCES]

/** Lien de la barre du bas : même effet flottant que la barre de l'application (BottomNav). */
function BottomItem({ to, end, icon: Icon, label }: { to: string; end?: boolean; icon: LucideIcon; label: string }) {
  return (
    <NavLink to={to} end={end} className="flex min-w-0 flex-1 flex-col items-center justify-end pb-1">
      {({ isActive }) => (
        <>
          <div
            className={cn(
              'flex items-center justify-center rounded-full transition-all duration-300 ease-in-out',
              isActive
                ? '-mt-6 size-14 bg-surface text-cobalt shadow-[0_10px_20px_rgba(10,47,79,0.12)] ring-4 ring-surface dark:bg-[#0A2F4F] dark:text-white dark:ring-[#0A2F4F]'
                : 'size-6 text-ink-muted dark:text-white/70',
            )}
          >
            <Icon className={isActive ? 'size-7' : 'size-6'} strokeWidth={isActive ? 2 : 1.5} aria-hidden />
          </div>
          <span
            className={cn(
              'mt-1 max-w-full truncate text-[11px] font-medium transition-colors duration-300',
              isActive ? 'font-bold text-ink dark:text-white' : 'text-ink-muted dark:text-white/70',
            )}
          >
            {label}
          </span>
        </>
      )}
    </NavLink>
  )
}

/**
 * Barre du bas du portail sur mobile : Signaler, l'action principale du public, est le bouton central rond.
 * Le suivi d'un signalement reste accessible depuis l'accueil et après l'envoi.
 */
function PortalBottomNav({ signedIn }: { signedIn: boolean }) {
  const { t } = useTranslation()

  return (
    <nav
      aria-label={t('portail.nav')}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur-sm dark:border-white/10 dark:bg-[#0A2F4F]/95 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-lg items-end px-1 pb-1">
        <BottomItem to={REPORTS.to} end icon={REPORTS.icon} label={t('portail.link.reports')} />
        <BottomItem to={RESOURCES.to} icon={RESOURCES.icon} label={t('portail.link.resources')} />

        <NavLink to={SUBMIT.to} className="group flex flex-1 flex-col items-center justify-end pb-1">
          {({ isActive }) => (
            <>
              <div
                className={cn(
                  'flex items-center justify-center rounded-full bg-cobalt text-white transition-all duration-300',
                  isActive
                    ? '-mt-6 size-14 shadow-[0_12px_24px_rgba(25,118,210,0.35)] ring-4 ring-surface dark:ring-[#0A2F4F]'
                    : 'size-12 shadow-md',
                )}
              >
                <Megaphone className={isActive ? 'size-7' : 'size-6'} aria-hidden />
              </div>
              <span
                className={cn(
                  'mt-1 text-[11px] font-medium uppercase tracking-wide transition-colors duration-300',
                  isActive ? 'font-bold text-ink dark:text-white' : 'text-ink-muted dark:text-white/70',
                )}
              >
                {t('portail.link.submit')}
              </span>
            </>
          )}
        </NavLink>

        <BottomItem to={VERIFY.to} icon={VERIFY.icon} label={t('nav.verifier')} />
        <BottomItem
          to={signedIn ? '/' : '/connexion'}
          icon={signedIn ? LayoutDashboard : LogIn}
          label={signedIn ? t('portail.staffShort') : t('portail.signIn')}
        />
      </div>
    </nav>
  )
}

/** W0 — Espace public : accessible sans compte, même charte que la connexion et l'application. */
export function PortalLayout() {
  const { t } = useTranslation()
  const { state } = useAuth()
  const { isDark, setPreference } = useTheme()
  const signedIn = state.status === 'signed_in' || state.status === 'guest'

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <header
        className="sticky top-0 z-30 border-b border-line bg-surface/90 backdrop-blur-md dark:border-white/10 dark:bg-[#0A2F4F]/90"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <Link to="/portail" aria-label={t('portail.home')} className="shrink-0 rounded-xl">
            <Logo tone={isDark ? 'dark' : 'light'} />
          </Link>

          <nav aria-label={t('portail.nav')} className="hidden lg:block">
            <ul className="flex items-center gap-1 rounded-2xl bg-canvas p-1 dark:bg-white/5">
              {LINKS.map(({ to, key, icon: Icon, end }) => (
                <li key={key}>
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      cn(
                        'flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 text-sm font-semibold transition',
                        isActive
                          ? 'bg-surface text-cobalt shadow-[0_6px_14px_rgba(10,47,79,0.10)] dark:bg-cobalt dark:text-white'
                          : 'text-ink-muted hover:text-ink dark:text-white/70 dark:hover:text-white',
                      )
                    }
                  >
                    <Icon className="size-4" aria-hidden />
                    {t(`portail.link.${key}`)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <LanguageSwitcher tone={isDark ? 'dark' : 'light'} />
            <button
              type="button"
              onClick={() => setPreference(isDark ? 'light' : 'dark')}
              aria-label={isDark ? t('profil.themeLight') : t('profil.themeDark')}
              className="flex size-9 items-center justify-center rounded-xl text-ink-muted transition hover:bg-line hover:text-ink dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
            >
              {isDark ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
            </button>
            <Link
              to={signedIn ? '/' : '/connexion'}
              className="hidden min-h-10 items-center gap-2 whitespace-nowrap rounded-xl bg-[#1976D2] px-4 text-sm font-semibold text-white shadow-[0_10px_18px_rgba(25,118,210,0.28)] transition hover:brightness-105 lg:inline-flex"
            >
              {signedIn ? <LayoutDashboard className="size-4" aria-hidden /> : <LogIn className="size-4" aria-hidden />}
              {signedIn ? t('portail.backToApp') : t('portail.signIn')}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 sm:px-6 lg:pb-10">
        <Lazy>
          {/* Pages partagées avec l'application (Ressources) : pas de recherche d'en-tête ici. */}
          <Outlet context={{ query: '' }} />
        </Lazy>
      </main>

      <footer className="hidden border-t border-line px-4 py-5 text-center text-xs text-ink-muted dark:border-white/10 lg:block">
        <p>{t('portail.footer')}</p>
      </footer>

      <PortalBottomNav signedIn={signedIn} />
    </div>
  )
}
