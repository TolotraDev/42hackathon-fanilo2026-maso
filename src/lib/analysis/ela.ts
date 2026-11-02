// Analyse du niveau d'erreur de compression (ELA) : une zone retouchée peut se recompresser différemment.
// C'est un indice à interpréter, jamais une preuve (section 9, étape 5).
import type { ClueLevel } from '@/types/domain'

const QUALITY = 0.9
const AMPLIFY = 15
const BLOCK = 16
const MAX_SIDE = 1600

export interface ElaResult {
  mapDataUrl: string
  /** Rapport entre les blocs les plus « bruyants » (99e centile) et la médiane. */
  ratio: number
  clue: ClueLevel
}

/** Qualifie la carte : des écarts concentrés dans quelques blocs méritent un examen. */
export function qualifyEla(blockErrors: number[]): { ratio: number; clue: ClueLevel } {
  if (blockErrors.length === 0) return { ratio: 0, clue: 'none' }
  const sorted = [...blockErrors].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  const p99 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))]
  const ratio = Math.round((p99 / (median + 1)) * 10) / 10
  const clue: ClueLevel = ratio >= 6 && p99 >= 8 ? 'to_examine' : ratio >= 3.5 && p99 >= 5 ? 'weak' : 'none'
  return { ratio, clue }
}

const loadImage = (blob: Blob) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = URL.createObjectURL(blob)
  })

export async function runEla(source: HTMLImageElement): Promise<ElaResult> {
  const scale = Math.min(1, MAX_SIDE / Math.max(source.naturalWidth, source.naturalHeight))
  const width = Math.round(source.naturalWidth * scale)
  const height = Math.round(source.naturalHeight * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })!
  context.drawImage(source, 0, 0, width, height)
  const original = context.getImageData(0, 0, width, height)

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((result) => (result ? resolve(result) : reject(new Error('ela'))), 'image/jpeg', QUALITY),
  )
  const recompressed = await loadImage(blob)
  context.drawImage(recompressed, 0, 0, width, height)
  URL.revokeObjectURL(recompressed.src)
  const second = context.getImageData(0, 0, width, height)

  const map = context.createImageData(width, height)
  const columns = Math.ceil(width / BLOCK)
  const sums = new Float64Array(columns * Math.ceil(height / BLOCK))
  const counts = new Uint32Array(sums.length)
  for (let index = 0; index < original.data.length; index += 4) {
    const error =
      (Math.abs(original.data[index] - second.data[index]) +
        Math.abs(original.data[index + 1] - second.data[index + 1]) +
        Math.abs(original.data[index + 2] - second.data[index + 2])) /
      3
    const value = Math.min(255, error * AMPLIFY)
    map.data[index] = value
    map.data[index + 1] = value
    map.data[index + 2] = value
    map.data[index + 3] = 255
    const pixel = index / 4
    const block = Math.floor(Math.floor(pixel / width) / BLOCK) * columns + Math.floor((pixel % width) / BLOCK)
    sums[block] += error
    counts[block] += 1
  }
  context.putImageData(map, 0, 0)
  const blockErrors = Array.from(sums, (sum, block) => sum / Math.max(1, counts[block]))
  return { mapDataUrl: canvas.toDataURL('image/png'), ...qualifyEla(blockErrors) }
}
