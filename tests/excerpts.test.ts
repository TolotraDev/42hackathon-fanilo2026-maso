import { describe, expect, it } from 'vitest'
import type { CaseDetail } from '@/features/dossiers/model'
import { buildExcerpts } from '@/features/rediger/excerpts'

const detail = {
  case: { id: 'c1', title: 'Inondation', claim: 'Antananarivo inondée ce matin' },
  evidences: [
    { id: 'e1', type: 'link', url: 'https://example.org/photo', archiveUrl: 'https://web.archive.org/x', origin: 'Facebook', analysis: null },
    { id: 'e2', type: 'analysis', url: null, archiveUrl: null, origin: null, analysis: { kind: 'statistic_comparison', claimed: 5000, official: { indicator: 'Ménages sinistrés', value: 1200, unit: 'ménages', year: 2024, source: 'BNGRC' } } },
  ],
  sources: [{ id: 's1', name: 'BNGRC', type: 'institution', domain: 'bngrc.mg', score: 4.5, verified: true }],
  requests: [{ id: 'r1', personId: 'p1', personName: 'Haingo Rabemananjara', channel: 'phone', status: 'answered', response: 'La photo date de 2019.' }],
  checklist: [
    { id: 'k1', question: 'La date de la photo est-elle établie ?', state: 'done', explanation: 'Recherche inversée : 2019.' },
    { id: 'k2', question: 'Le lieu est-il confirmé ?', state: 'todo', explanation: '' },
  ],
} as unknown as CaseDetail

describe('extraits numérotés pour l’assistant (section 10)', () => {
  const excerpts = buildExcerpts(detail)

  it('numérote chaque extrait selon sa nature', () => {
    expect(excerpts.map((excerpt) => excerpt.id)).toEqual(['P1', 'C2', 'S3', 'R4', 'K5'])
  })

  it('ne prend que le contenu du dossier, sans les points de checklist non traités', () => {
    expect(excerpts.find((excerpt) => excerpt.kind === 'C')?.text).toContain('1200 ménages (2024)')
    expect(excerpts.find((excerpt) => excerpt.kind === 'R')?.text).toContain('La photo date de 2019.')
    expect(excerpts.some((excerpt) => excerpt.text.includes('Le lieu est-il confirmé'))).toBe(false)
  })
})
