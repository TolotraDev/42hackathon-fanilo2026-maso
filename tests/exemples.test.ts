// Vérifie que les fichiers d'exemple du guide (docs/exemples) donnent bien les résultats annoncés.
import { readFileSync } from 'node:fs'
import exifr from 'exifr'
import { describe, expect, it } from 'vitest'
import { sniffMime } from '@/lib/analysis/fileType'
import { normalizeMetadata, qualifyMetadata } from '@/lib/analysis/metadata'

const file = (name: string) => readFileSync(`docs/exemples/${name}`)
const qualify = async (name: string) => qualifyMetadata(normalizeMetadata(await exifr.parse(file(name)).catch(() => ({}))), new Date('2026-11-02'))

describe('fichiers d’exemple du guide de test', () => {
  it('1 — photo originale : métadonnées cohérentes avec GPS', async () => {
    expect(await qualify('1-photo-originale.jpg')).toEqual({ clue: 'none', finding: 'consistent' })
    expect(normalizeMetadata(await exifr.parse(file('1-photo-originale.jpg'))).gps?.latitude).toBeCloseTo(-18.9144, 3)
  })
  it('2 — photo partagée : métadonnées effacées', async () => {
    expect(await qualify('2-photo-partagee-whatsapp.jpg')).toEqual({ clue: 'none', finding: 'stripped' })
  })
  it('4 — photo retouchée : indice faible', async () => {
    expect(await qualify('4-photo-retouchee.jpg')).toEqual({ clue: 'weak', finding: 'editing_tool' })
  })
  it('5 — image générée par IA : indice à examiner', async () => {
    expect(await qualify('5-image-generee-ia.jpg')).toEqual({ clue: 'to_examine', finding: 'generative_tool' })
  })
  it('7 — faux fichier : refusé', () => {
    expect(sniffMime(new Uint8Array(file('7-faux-fichier-image.jpg').subarray(0, 32)))).toBeNull()
  })
})
