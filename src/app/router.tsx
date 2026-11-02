import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { AdminPage } from '@/features/admin/AdminPage'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { OnboardingPage } from '@/features/auth/OnboardingPage'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'
import { HomeRedirect, PublicOnly, RequireAuth, RequireSection } from '@/features/auth/RouteGuards'
import { DossiersPage } from '@/features/dossiers/DossiersPage'
import { NotFoundPage } from '@/features/NotFoundPage'
import { ProfilPage } from '@/features/profil/ProfilPage'
import { RedigerPage } from '@/features/rediger/RedigerPage'
import { RessourcesPage } from '@/features/ressources/RessourcesPage'
import { VeillePage } from '@/features/veille/VeillePage'
import { VerifierPage } from '@/features/verifier/VerifierPage'
import type { SectionId } from '@/lib/permissions'

const section = (id: SectionId, page: React.ReactNode) => ({
  path: id,
  element: <RequireSection section={id}>{page}</RequireSection>,
})

export const router = createBrowserRouter([
  { path: 'bienvenue', element: <OnboardingPage /> },
  { path: 'connexion', element: <PublicOnly><LoginPage /></PublicOnly> },
  { path: 'mot-de-passe-oublie', element: <PublicOnly><ForgotPasswordPage /></PublicOnly> },
  { path: 'nouveau-mot-de-passe', element: <ResetPasswordPage /> },
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomeRedirect /> },
      section('veille', <VeillePage />),
      section('verifier', <VerifierPage />),
      section('ressources', <RessourcesPage />),
      section('rediger', <RedigerPage />),
      section('dossiers', <DossiersPage />),
      section('admin', <AdminPage />),
      section('profil', <ProfilPage />),
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
