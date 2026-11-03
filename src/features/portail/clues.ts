// Indices simples montrés au public après un signalement (W0) : jamais un verdict.
import { sha256Hex } from '@/lib/analysis/hash'
import { qualifyMetadata, readMetadata, type MetadataFinding } from '@/lib/analysis/metadata'
import { grayscale32, phashFromGray } from '@/lib/analysis/phash'

export interface FileFingerprint {
  sha256: string
  phash: string | null
  finding: MetadataFinding
  software: string | null
  takenAt: string | null
}

const loadImage = (file: Blob) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(image.src)
      resolve(image)
    }
    image.onerror = () => reject(new Error('unreadable'))
    image.src = URL.createObjectURL(file)
  })

/** Empreintes (SHA-256, pHash) et métadonnées, calculées sur l'appareil : le fichier n'est envoyé qu'ensuite. */
export async function fingerprint(file: File): Promise<FileFingerprint> {
  const sha256 = await sha256Hex(await file.arrayBuffer())
  const phash = await loadImage(file).then((image) => phashFromGray(grayscale32(image)), () => null)
  const meta = await readMetadata(file)
  const { finding } = qualifyMetadata(meta)
  return { sha256, phash, finding, software: meta.software, takenAt: meta.takenAt }
}

const SHORTENERS = /^(bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly|is\.gd|buff\.ly|rebrand\.ly|cutt\.ly|shorturl\.at|tiny\.cc)$/i

export type LinkClue = 'not_https' | 'shortener' | 'social' | 'domain'

/** Ce que l'on peut dire d'un lien sans l'ouvrir. */
export function linkClues(raw: string): { domain: string; clues: LinkClue[] } | null {
  try {
    const url = new URL(raw.trim())
    const domain = url.hostname.toLowerCase().replace(/^www\./, '')
    const clues: LinkClue[] = ['domain']
    if (url.protocol !== 'https:') clues.push('not_https')
    if (SHORTENERS.test(domain)) clues.push('shortener')
    if (/(^|\.)(facebook\.com|fb\.watch|whatsapp\.com|tiktok\.com|youtube\.com|youtu\.be|x\.com|twitter\.com|instagram\.com)$/.test(domain)) clues.push('social')
    return { domain, clues }
  } catch {
    return null
  }
}
