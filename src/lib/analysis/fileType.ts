// Type réel d'un fichier d'après ses premiers octets (même règle que services/analyse/app/sniff.py).

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  signature.every((value, index) => bytes[offset + index] === value)
const ascii = (bytes: Uint8Array, start: number, end: number) => String.fromCharCode(...bytes.slice(start, end))

const FTYP_BRANDS: Record<string, string> = {
  heic: 'image/heic',
  heix: 'image/heic',
  mif1: 'image/heif',
  avif: 'image/avif',
  'qt  ': 'video/quicktime',
}

export function sniffMime(bytes: Uint8Array): string | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (ascii(bytes, 0, 6) === 'GIF87a' || ascii(bytes, 0, 6) === 'GIF89a') return 'image/gif'
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') return 'image/webp'
  if (startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return 'video/webm'
  if (ascii(bytes, 4, 8) === 'ftyp') return FTYP_BRANDS[ascii(bytes, 8, 12)] ?? 'video/mp4'
  return null
}

export type MediaKind = 'image' | 'video'

export function mediaKind(mime: string | null): MediaKind | null {
  if (mime?.startsWith('image/')) return 'image'
  if (mime?.startsWith('video/')) return 'video'
  return null
}

/** Limites par défaut du cahier des charges (section 15). */
export const MAX_BYTES: Record<MediaKind, number> = { image: 20 * 1024 * 1024, video: 100 * 1024 * 1024 }
