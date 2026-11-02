// Métadonnées (EXIF/XMP) : date, appareil, logiciel, GPS. Leur absence est normale après WhatsApp ou Facebook.
import type { ClueLevel } from '@/types/domain'

export interface ImageMetadata {
  takenAt: string | null
  make: string | null
  model: string | null
  software: string | null
  gps: { latitude: number; longitude: number } | null
}

const GENERATIVE_TOOLS = /midjourney|dall[-· ]?e|stable ?diffusion|firefly|imagen|flux|leonardo|ideogram|sora/i
const EDITING_TOOLS = /photoshop|gimp|lightroom|snapseed|picsart|canva|affinity|pixelmator|facetune|meitu|pixlr/i

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null)

export function normalizeMetadata(raw: Record<string, unknown> | null | undefined): ImageMetadata {
  const date = raw?.DateTimeOriginal ?? raw?.CreateDate ?? raw?.ModifyDate
  const latitude = raw?.latitude
  const longitude = raw?.longitude
  return {
    takenAt: date instanceof Date && !Number.isNaN(date.getTime()) ? date.toISOString() : text(date),
    make: text(raw?.Make),
    model: text(raw?.Model),
    software: text(raw?.Software) ?? text(raw?.CreatorTool),
    gps:
      typeof latitude === 'number' && typeof longitude === 'number' && Number.isFinite(latitude) && Number.isFinite(longitude)
        ? { latitude, longitude }
        : null,
  }
}

export type MetadataFinding = 'stripped' | 'generative_tool' | 'editing_tool' | 'future_date' | 'consistent'

/** Qualifie les métadonnées : un indice, jamais une preuve (section 9, étape 3). */
export function qualifyMetadata(meta: ImageMetadata, now = new Date()): { clue: ClueLevel; finding: MetadataFinding } {
  const empty = !meta.takenAt && !meta.make && !meta.model && !meta.software && !meta.gps
  if (empty) return { clue: 'none', finding: 'stripped' }
  if (meta.software && GENERATIVE_TOOLS.test(meta.software)) return { clue: 'to_examine', finding: 'generative_tool' }
  if (meta.takenAt && new Date(meta.takenAt).getTime() > now.getTime() + 24 * 3600 * 1000) {
    return { clue: 'weak', finding: 'future_date' }
  }
  if (meta.software && EDITING_TOOLS.test(meta.software)) return { clue: 'weak', finding: 'editing_tool' }
  return { clue: 'none', finding: 'consistent' }
}

export async function readMetadata(file: Blob): Promise<ImageMetadata> {
  const { default: exifr } = await import('exifr')
  const raw = await exifr.parse(file, { tiff: true, exif: true, gps: true, xmp: true, icc: false, iptc: false }).catch(() => null)
  return normalizeMetadata(raw as Record<string, unknown> | null)
}
