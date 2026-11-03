// Code PIN (M14) : verrouille l'application sur un téléphone partagé ou perdu.
// Seule une empreinte salée (PBKDF2) est gardée sur l'appareil, jamais le code lui-même.
import { readStorage, writeStorage } from '@/lib/storage'

const PIN_KEY = 'maso.pin'
const UNLOCKED_KEY = 'maso.pin.unlocked'
const ITERATIONS = 100_000
/** Après 5 minutes en arrière-plan, l'application se verrouille de nouveau. */
export const RELOCK_AFTER_MS = 5 * 60 * 1000

interface StoredPin {
  salt: string
  hash: string
}

const toHex = (buffer: ArrayBuffer) => [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
const fromHex = (hex: string) => new Uint8Array(hex.match(/.{2}/g)!.map((pair) => parseInt(pair, 16)))

async function derive(pin: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: ITERATIONS }, key, 256)
  return toHex(bits)
}

export const isValidPin = (pin: string) => /^\d{4,6}$/.test(pin)

function readPin(): StoredPin | null {
  try {
    return JSON.parse(readStorage(PIN_KEY) ?? 'null') as StoredPin | null
  } catch {
    return null
  }
}

export const hasPin = () => readPin() !== null

export async function setPin(pin: string): Promise<void> {
  if (!isValidPin(pin)) throw new Error('invalid_pin')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  writeStorage(PIN_KEY, JSON.stringify({ salt: toHex(salt.buffer), hash: await derive(pin, salt) }))
  markUnlocked()
}

export function removePin(): void {
  writeStorage(PIN_KEY, '')
}

export async function checkPin(pin: string): Promise<boolean> {
  const stored = readPin()
  if (!stored) return true
  return (await derive(pin, fromHex(stored.salt))) === stored.hash
}

/** Déverrouillage valable pour l'onglet en cours (sessionStorage) : un nouveau lancement redemande le code. */
export function markUnlocked(): void {
  try {
    sessionStorage.setItem(UNLOCKED_KEY, String(Date.now()))
  } catch {
    // stockage indisponible : le code sera redemandé
  }
}

export function isUnlocked(): boolean {
  try {
    return sessionStorage.getItem(UNLOCKED_KEY) !== null
  } catch {
    return false
  }
}

export function lock(): void {
  try {
    sessionStorage.removeItem(UNLOCKED_KEY)
  } catch {
    // rien à faire
  }
}
