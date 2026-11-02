import { describe, expect, it } from 'vitest'
import { qualifyEla } from '@/lib/analysis/ela'
import { mediaKind, sniffMime } from '@/lib/analysis/fileType'
import { sha256Hex } from '@/lib/analysis/hash'
import { normalizeMetadata, qualifyMetadata } from '@/lib/analysis/metadata'
import { hammingHex, phashFromGray } from '@/lib/analysis/phash'
import { reverseSearchLinks } from '@/lib/analysis/reverseSearch'
import { computeSourceScore, missingJustifications } from '@/lib/analysis/sourceScore'
import { domainOf, firstUrlIn, normalizeUrl } from '@/lib/analysis/url'
import { qualifyAiScore } from '@/features/verifier/useImageAnalysis'
import { qualifyDomainAge, qualifySourceScore } from '@/features/verifier/LinkAnalysisPage'

/** Image synthétique 32×32 : dégradé + forme, avec bruit facultatif. */
function synthetic(shape: 'circle' | 'bars', noise = 0, seed = 1): number[] {
  let state = seed
  const random = () => ((state = (state * 16807) % 2147483647) / 2147483647 - 0.5) * noise
  return Array.from({ length: 1024 }, (_, index) => {
    const x = index % 32
    const y = Math.floor(index / 32)
    const base = shape === 'circle' ? ((x - 16) ** 2 + (y - 12) ** 2 < 64 ? 220 : 40) : x % 8 < 4 ? 200 : 30
    return Math.max(0, Math.min(255, base + y * 2 + random()))
  })
}

describe('empreinte perceptuelle (pHash)', () => {
  it('produit 64 bits en hexadécimal', () => {
    expect(phashFromGray(synthetic('circle'))).toMatch(/^[0-9a-f]{16}$/)
  })

  it('reste très proche après une légère altération (recompression simulée)', () => {
    const original = phashFromGray(synthetic('circle'))
    const altered = phashFromGray(synthetic('circle', 12, 7))
    expect(hammingHex(original, altered)).toBeLessThanOrEqual(10)
  })

  it('s’éloigne nettement pour une image différente', () => {
    expect(hammingHex(phashFromGray(synthetic('circle')), phashFromGray(synthetic('bars')))).toBeGreaterThan(10)
  })

  it('compte les bits différents', () => {
    expect(hammingHex('f0f0f0f0f0f0f0f0', 'f0f0f0f0f0f0f0f1')).toBe(1)
    expect(hammingHex('0000000000000000', 'ffffffffffffffff')).toBe(64)
  })
})

describe('réception', () => {
  it('calcule le SHA-256', async () => {
    const digest = await sha256Hex(new TextEncoder().encode('MASO').buffer as ArrayBuffer)
    expect(digest).toBe('ae4d6e6f157d11f1c23bcda15c3ee8c3d6efa900fafa78c669ce6a868d9b83e5') // référence : hashlib (Python)
  })

  it('reconnaît le type réel, pas l’extension', () => {
    expect(sniffMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg')
    expect(sniffMime(new TextEncoder().encode('<html><body>'))).toBeNull()
    const mp4 = new Uint8Array([0, 0, 0, 0x18, ...new TextEncoder().encode('ftypisom')])
    expect(mediaKind(sniffMime(mp4))).toBe('video')
  })
})

describe('métadonnées', () => {
  it('explique l’absence de métadonnées sans conclure à une manipulation', () => {
    expect(qualifyMetadata(normalizeMetadata({}))).toEqual({ clue: 'none', finding: 'stripped' })
  })

  it('signale un outil de génération d’images', () => {
    expect(qualifyMetadata(normalizeMetadata({ Software: 'Midjourney v6' })).clue).toBe('to_examine')
  })

  it('signale faiblement un logiciel de retouche', () => {
    expect(qualifyMetadata(normalizeMetadata({ Software: 'Adobe Photoshop 25.0', Make: 'Canon' }))).toEqual({
      clue: 'weak',
      finding: 'editing_tool',
    })
  })

  it('repère une date dans le futur', () => {
    const meta = normalizeMetadata({ DateTimeOriginal: new Date('2031-01-01'), Make: 'Samsung' })
    expect(qualifyMetadata(meta, new Date('2026-11-02')).finding).toBe('future_date')
  })

  it('lit les coordonnées GPS', () => {
    expect(normalizeMetadata({ latitude: -18.91, longitude: 47.52 }).gps).toEqual({ latitude: -18.91, longitude: 47.52 })
  })
})

describe('analyse de recompression (ELA)', () => {
  it('ne signale rien sur une image homogène', () => {
    expect(qualifyEla(Array(400).fill(2)).clue).toBe('none')
  })

  it('signale des zones nettement différentes', () => {
    const blocks = [...Array(390).fill(1.5), ...Array(10).fill(20)]
    expect(qualifyEla(blocks).clue).toBe('to_examine')
  })
})

describe('indices et qualifications', () => {
  it('ne présente jamais l’indice IA comme une conclusion : trois niveaux seulement', () => {
    expect(qualifyAiScore(0.95)).toBe('to_examine')
    expect(qualifyAiScore(0.7)).toBe('weak')
    expect(qualifyAiScore(0.2)).toBe('none')
  })

  it('qualifie l’âge du domaine', () => {
    expect(qualifyDomainAge(45)).toBe('to_examine')
    expect(qualifyDomainAge(400)).toBe('weak')
    expect(qualifyDomainAge(4000)).toBe('none')
    expect(qualifyDomainAge(null)).toBeUndefined()
  })

  it('qualifie le score d’une source connue', () => {
    expect(qualifySourceScore(2.5)).toBe('to_examine')
    expect(qualifySourceScore(8)).toBe('none')
    expect(qualifySourceScore(null)).toBeUndefined()
  })
})

describe('recherche inversée', () => {
  it('préremplit les moteurs quand l’image a une adresse', () => {
    const links = reverseSearchLinks('https://exemple.mg/photo.jpg')
    expect(links.find((link) => link.id === 'tineye')?.url).toBe('https://tineye.com/search?url=https%3A%2F%2Fexemple.mg%2Fphoto.jpg')
    expect(links.filter((link) => link.prefilled)).toHaveLength(4)
  })

  it('propose les sites de dépôt sinon', () => {
    expect(reverseSearchLinks(null).every((link) => !link.prefilled)).toBe(true)
  })
})

describe('adresses', () => {
  it('normalise une adresse saisie', () => {
    expect(normalizeUrl('exemple.mg/article')).toBe('https://exemple.mg/article')
    expect(normalizeUrl('javascript:alert(1)')).toBeNull()
    expect(normalizeUrl('pas une adresse')).toBeNull()
  })

  it('extrait le domaine et le premier lien d’un texte partagé', () => {
    expect(domainOf('https://www.Exemple.mg/x')).toBe('exemple.mg')
    expect(firstUrlIn('Regardez ça ! https://fb.watch/abc123 incroyable')).toBe('https://fb.watch/abc123')
  })
})

describe('score de fiabilité d’une source (copie de public.compute_source_score)', () => {
  it('calcule la moyenne sur 10 des critères évalués', () => {
    expect(
      computeSourceScore({ identity: { score: 0, justification: 'Aucune mention légale' }, seniority: { score: 1, justification: '8 mois' } }),
    ).toBe(2.5)
    expect(computeSourceScore({})).toBeNull()
  })

  it('repère les critères non justifiés', () => {
    expect(missingJustifications({ identity: { score: 2, justification: '  ' } })).toEqual(['identity'])
  })
})
