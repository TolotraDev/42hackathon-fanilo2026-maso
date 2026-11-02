import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { DossiersPage } from '@/features/dossiers/DossiersPage'
import { NotFoundPage } from '@/features/NotFoundPage'
import { ProfilPage } from '@/features/profil/ProfilPage'
import { RedigerPage } from '@/features/rediger/RedigerPage'
import { RessourcesPage } from '@/features/ressources/RessourcesPage'
import { VeillePage } from '@/features/veille/VeillePage'
import { VerifierPage } from '@/features/verifier/VerifierPage'

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/veille" replace /> },
      { path: 'veille', element: <VeillePage /> },
      { path: 'verifier', element: <VerifierPage /> },
      { path: 'ressources', element: <RessourcesPage /> },
      { path: 'rediger', element: <RedigerPage /> },
      { path: 'dossiers', element: <DossiersPage /> },
      { path: 'profil', element: <ProfilPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
