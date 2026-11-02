import { lazy } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/features/auth/LoginPage'
import { HomeRedirect, Lazy, PublicOnly, RequireAuth, RequireSection } from '@/features/auth/RouteGuards'
import { NotFoundPage } from '@/features/NotFoundPage'
import { VeillePage } from '@/features/veille/VeillePage'
import type { SectionId } from '@/lib/permissions'

// Chaque page est chargée à la demande : premier chargement léger sur réseau lent (section 12).
const AdminPage = lazy(() => import('@/features/admin/AdminPage').then((m) => ({ default: m.AdminPage })))
const ForgotPasswordPage = lazy(() => import('@/features/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })))
const OnboardingPage = lazy(() => import('@/features/auth/OnboardingPage').then((m) => ({ default: m.OnboardingPage })))
const ResetPasswordPage = lazy(() => import('@/features/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })))
const DossiersPage = lazy(() => import('@/features/dossiers/DossiersPage').then((m) => ({ default: m.DossiersPage })))
const ProfilPage = lazy(() => import('@/features/profil/ProfilPage').then((m) => ({ default: m.ProfilPage })))
const RedigerPage = lazy(() => import('@/features/rediger/RedigerPage').then((m) => ({ default: m.RedigerPage })))
const RessourcesPage = lazy(() => import('@/features/ressources/RessourcesPage').then((m) => ({ default: m.RessourcesPage })))
const ImageAnalysisPage = lazy(() => import('@/features/verifier/ImageAnalysisPage').then((m) => ({ default: m.ImageAnalysisPage })))
const LinkAnalysisPage = lazy(() => import('@/features/verifier/LinkAnalysisPage').then((m) => ({ default: m.LinkAnalysisPage })))
const SharePage = lazy(() => import('@/features/verifier/SharePage').then((m) => ({ default: m.SharePage })))
const SourcePage = lazy(() => import('@/features/verifier/SourcePage').then((m) => ({ default: m.SourcePage })))
const VerifierPage = lazy(() => import('@/features/verifier/VerifierPage').then((m) => ({ default: m.VerifierPage })))
const VideoAnalysisPage = lazy(() => import('@/features/verifier/VideoAnalysisPage').then((m) => ({ default: m.VideoAnalysisPage })))

const section = (id: SectionId, page: React.ReactNode, path: string = id) => ({
  path,
  element: (
    <RequireSection section={id}>
      <Lazy>{page}</Lazy>
    </RequireSection>
  ),
})

export const router = createBrowserRouter([
  { path: 'bienvenue', element: <Lazy><OnboardingPage /></Lazy> },
  { path: 'connexion', element: <PublicOnly><LoginPage /></PublicOnly> },
  { path: 'mot-de-passe-oublie', element: <PublicOnly><Lazy><ForgotPasswordPage /></Lazy></PublicOnly> },
  { path: 'nouveau-mot-de-passe', element: <Lazy><ResetPasswordPage /></Lazy> },
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
      section('verifier', <ImageAnalysisPage />, 'verifier/image'),
      section('verifier', <VideoAnalysisPage />, 'verifier/video'),
      section('verifier', <LinkAnalysisPage />, 'verifier/lien'),
      section('verifier', <SharePage />, 'verifier/partage'),
      section('verifier', <SourcePage />, 'verifier/sources/:id'),
      section('ressources', <RessourcesPage />),
      section('rediger', <RedigerPage />),
      section('dossiers', <DossiersPage />),
      section('admin', <AdminPage />),
      section('profil', <ProfilPage />),
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
