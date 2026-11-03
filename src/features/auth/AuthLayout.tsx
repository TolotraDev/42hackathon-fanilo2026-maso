import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { Logo } from '@/components/layout/Logo'
import { useTheme } from '@/hooks/useTheme'

/** Écrans hors connexion (présentation, connexion) : même rendu sur mobile et sur web. */
export function AuthLayout({ children }: { children: React.ReactNode }) {
  const { isDark } = useTheme()

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <header className="flex items-center justify-between gap-3 px-4 py-4 sm:px-8">
        <Logo tone={isDark ? 'dark' : 'light'} />
        <LanguageSwitcher tone={isDark ? 'dark' : 'light'} />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-10 pt-2 sm:items-center sm:pt-0">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  )
}
