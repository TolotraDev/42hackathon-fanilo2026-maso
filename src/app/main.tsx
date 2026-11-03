import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { CaseStoreProvider } from '@/features/dossiers/CaseStoreProvider'
import { initTheme, ThemeProvider } from '@/hooks/useTheme'
import '@/i18n'
import '@/styles/index.css'
import { router } from './router'

initTheme()
registerSW({ immediate: true })

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
