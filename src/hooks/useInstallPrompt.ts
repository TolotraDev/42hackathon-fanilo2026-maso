import { useSyncExternalStore } from 'react'
import { installSnapshot, promptInstall, subscribeInstall } from '@/lib/installPrompt'

/** Gère l'invitation à installer la PWA (cahier des charges, M1). L'événement est capté au démarrage. */
export function useInstallPrompt() {
  const state = useSyncExternalStore(subscribeInstall, installSnapshot, installSnapshot)
  return { canInstall: state.canPrompt, installed: state.installed, install: promptInstall }
}
