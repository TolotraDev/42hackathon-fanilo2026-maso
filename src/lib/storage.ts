// Accès à localStorage protégé : il peut être indisponible (navigation privée, stockage bloqué).

export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // stockage indisponible : la préférence ne sera simplement pas mémorisée
  }
}
