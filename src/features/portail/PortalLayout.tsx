import { FileSearch, Megaphone, QrCode, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { Logo } from '@/components/layout/Logo'
import { Lazy } from '@/features/auth/RouteGuards'
import { useAuth } from '@/features/auth/AuthProvider'
import { cn } from '@/lib/cn'

const LINKS = [
  { to: '/portail', key: 'reports', icon: Search, end: true },
  { to: '/portail/signaler', key: 'submit', icon: Megaphone, end: false },
  { to: '/portail/suivi', key: 'track', icon: FileSearch, end: false },
  { to: '/portail/verifier', key: 'verify', icon: QrCode, end: false },
] as const

/** W0 — Portail public : accessible sans compte, même charte que l'application. */
export function PortalLayout() {
  const { t } = useTranslation()
  const { state } = useAuth()
  const signedIn = state.status === 'signed_in' || state.status === 'guest'

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="bg-navy text-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
          <Link to="/portail" aria-label={t('portail.home')}>
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher tone="dark" />
            <Link to={signedIn ? '/' : '/connexion'} className="min-h-9 rounded-lg px-2.5 py-2 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white">
              {signedIn ? t('portail.backToApp') : t('portail.staffLogin')}
            </Link>
          </div>
        </div>
        <nav aria-label={t('portail.nav')} className="mx-auto max-w-5xl overflow-x-auto px-2">
          <ul className="flex min-w-max gap-1 pb-2">
            {LINKS.map(({ to, key, icon: Icon, end }) => (
              <li key={key}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn('flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold', isActive ? 'bg-white/15 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white')
                  }
                >
                  <Icon className="size-4" aria-hidden />
                  {t(`portail.link.${key}`)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5">
        <Lazy>
          <Outlet />
        </Lazy>
      </main>

      <footer className="border-t border-line px-4 py-4 text-center text-xs text-ink-muted">
        <p>{t('portail.footer')}</p>
      </footer>
    </div>
  )
}
