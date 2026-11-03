import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { CaseStoreProvider } from '@/features/dossiers/CaseStoreProvider'
import { initTheme, ThemeProvider } from '@/hooks/useTheme'
import { logStartupDiagnostics } from '@/lib/diagnostics'
import { captureInstallPrompt } from '@/lib/installPrompt'
import '@/i18n'
import '@/styles/index.css'
import { router } from './router'

// Avant tout : l'invitation à installer n'est envoyée qu'une fois par le navigateur, au chargement.
captureInstallPrompt()
initTheme()
logStartupDiagnostics()
// Nouvelle version déployée : le service worker la récupère et la page se recharge seule (autoUpdate).
// Le navigateur ne cherche une mise à jour qu'au chargement : on vérifie aussi chaque minute et au retour
// sur l'onglet, pour qu'un onglet resté ouvert (ou l'application installée) ne garde pas l'ancienne version.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return
    const check = () => {
      if (navigator.onLine) void registration.update().catch(() => undefined)
    }
    setInterval(check, 60_000)
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check())
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <CaseStoreProvider>
          <RouterProvider router={router} />
        </CaseStoreProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
