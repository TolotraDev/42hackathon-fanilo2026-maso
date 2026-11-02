// Empreinte perceptuelle (pHash 64 bits) : stable malgré une recompression ou un léger redimensionnement.
// Image réduite à 32×32 en niveaux de gris → DCT → 8×8 basses fréquences → bit = coefficient > médiane.

const SIZE = 32
const LOW = 8

const COSINES = Array.from({ length: LOW }, (_, u) =>
  Float64Array.from({ length: SIZE }, (_, x) => Math.cos(((2 * x + 1) * u * Math.PI) / (2 * SIZE))),
)

/** pHash d'une image déjà réduite à 32×32 niveaux de gris (1024 valeurs, ligne par ligne). */
export function phashFromGray(gray: ArrayLike<number>): string {
  if (gray.length !== SIZE * SIZE) throw new Error('phash: 32×32 attendu')
  // DCT sur les lignes, en ne gardant que les 8 premières fréquences
  const rows = new Float64Array(SIZE * LOW)
  for (let y = 0; y < SIZE; y++) {
    for (let u = 0; u < LOW; u++) {
      let sum = 0
      for (let x = 0; x < SIZE; x++) sum += gray[y * SIZE + x] * COSINES[u][x]
      rows[y * LOW + u] = sum
    }
  }
  // puis sur les colonnes
  const coefficients: number[] = []
  for (let v = 0; v < LOW; v++) {
    for (let u = 0; u < LOW; u++) {
      let sum = 0
      for (let y = 0; y < SIZE; y++) sum += rows[y * LOW + u] * COSINES[v][y]
      coefficients.push(sum)
    }
  }
  const sorted = coefficients.slice(1).sort((a, b) => a - b) // la composante continue est exclue de la médiane
  const median = (sorted[31] + sorted[32]) / 2
  let hex = ''
  for (let nibble = 0; nibble < 16; nibble++) {
    let value = 0
    for (let bit = 0; bit < 4; bit++) value = (value << 1) | (coefficients[nibble * 4 + bit] > median ? 1 : 0)
    hex += value.toString(16)
  }
  return hex
}

/** Nombre de bits différents entre deux empreintes (0 = identiques, ≤ 10 = très proches). */
export function hammingHex(a: string, b: string): number {
  let distance = 0
  for (let index = 0; index < Math.min(a.length, b.length); index++) {
    let xor = parseInt(a[index], 16) ^ parseInt(b[index], 16)
    while (xor) {
      distance += xor & 1
      xor >>= 1
    }
  }
  return distance
}

/** Réduit une image à 32×32 niveaux de gris dans le navigateur. */
export function grayscale32(source: CanvasImageSource): Float64Array {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const context = canvas.getContext('2d', { willReadFrequently: true })!
  context.drawImage(source, 0, 0, SIZE, SIZE)
  const { data } = context.getImageData(0, 0, SIZE, SIZE)
  const gray = new Float64Array(SIZE * SIZE)
  for (let index = 0; index < gray.length; index++) {
    gray[index] = 0.299 * data[index * 4] + 0.587 * data[index * 4 + 1] + 0.114 * data[index * 4 + 2]
  }
  return gray
}
