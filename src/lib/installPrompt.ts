// Installation de MASO comme application (PWA).
// Le navigateur n'envoie l'événement « beforeinstallprompt » qu'une fois, au chargement de la page :
// il est capté ici dès le démarrage (avant React), puis gardé pour le bouton « Installer l'application »,
// quelle que soit la page où l'utilisateur le trouve (Profil, accueil).

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallPlatform = 'ios' | 'android' | 'desktop_chromium' | 'desktop_safari' | 'firefox' | 'in_app' | 'other'

export interface InstallState {
  /** Le navigateur propose l'installation directe (Chrome, Edge, Samsung Internet, Opera…). */
  canPrompt: boolean
  /** MASO est déjà ouvert comme application installée. */
  installed: boolean
}

let deferred: BeforeInstallPromptEvent | null = null
let state: InstallState = { canPrompt: false, installed: false }
const listeners = new Set<() => void>()

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.matchMedia('(display-mode: fullscreen)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

function emit() {
  state = { canPrompt: deferred !== null, installed: isStandalone() || state.installed }
  listeners.forEach((listener) => listener())
}

let captured = false
/** À appeler une fois, au démarrage de l'application. */
export function captureInstallPrompt() {
  if (captured || typeof window === 'undefined') return
  captured = true
  state = { canPrompt: false, installed: isStandalone() }
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferred = event as BeforeInstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    state = { ...state, installed: true }
    emit()
  })
  window.matchMedia('(display-mode: standalone)').addEventListener?.('change', emit)
}

export function subscribeInstall(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const installSnapshot = () => state

/** Ouvre la fenêtre d'installation du navigateur. « unavailable » : il faut passer par son menu. */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const event = deferred
  if (!event) return 'unavailable'
  // Un événement ne sert qu'une fois : le navigateur en renverra un autre plus tard si besoin.
  deferred = null
  emit()
  try {
    await event.prompt()
    const { outcome } = await event.userChoice
    if (outcome === 'accepted') state = { ...state, installed: true }
    emit()
    return outcome
  } catch {
    return 'unavailable'
  }
}

/** Appareil et navigateur, pour expliquer où se trouve « Installer » quand l'installation directe n'existe pas. */
export function installPlatform(userAgent = navigator.userAgent, touchPoints = navigator.maxTouchPoints ?? 0): InstallPlatform {
  const ua = userAgent
  // Navigateurs intégrés aux applications (lien ouvert depuis Facebook, Instagram, Messenger…) : pas d'installation.
  if (/FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|; wv\)/i.test(ua)) return 'in_app'
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && touchPoints > 1)
  if (ios) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  if (/Firefox\//i.test(ua)) return 'firefox'
  if (/Edg\/|Chrome\/|Chromium\/|OPR\//i.test(ua)) return 'desktop_chromium'
  if (/Safari\//i.test(ua) && /Macintosh/i.test(ua)) return 'desktop_safari'
  return 'other'
}
