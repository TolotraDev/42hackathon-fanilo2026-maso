// Packs hors ligne (M8, M10) : dernière version téléchargée, avec sa date.
import { readStorage, writeStorage } from './storage'

export interface CachedPack<T> {
  data: T
  savedAt: string
}

export function savePack<T>(key: string, data: T): void {
  writeStorage(`maso.pack.${key}`, JSON.stringify({ data, savedAt: new Date().toISOString() }))
}

export function readPack<T>(key: string): CachedPack<T> | null {
  try {
    return JSON.parse(readStorage(`maso.pack.${key}`) ?? 'null') as CachedPack<T> | null
  } catch {
    return null
  }
}

/**
 * Charge depuis le serveur et met le résultat en cache ; hors ligne ou en cas d'échec réseau,
 * renvoie la dernière version enregistrée sur l'appareil (offline = true).
 */
export async function loadWithPack<T>(key: string, load: () => Promise<T>): Promise<{ data: T; offline: boolean; savedAt: string | null }> {
  try {
    const data = await load()
    savePack(key, data)
    return { data, offline: false, savedAt: null }
  } catch (error) {
    const pack = readPack<T>(key)
    if (pack) return { data: pack.data, offline: true, savedAt: pack.savedAt }
    throw error
  }
}
