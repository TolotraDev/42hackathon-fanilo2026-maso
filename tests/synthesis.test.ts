import { describe, expect, it } from 'vitest'
import { classifyInput, imageFindings, linkFindings, ratingKind, textFindings, videoFindings, vigilance } from '@/lib/analysis/synthesis'

describe('contenu collé dans « Vérifier »', () => {
  it('reconnaît un lien de publication, une image, une vidéo et un texte', () => {
    expect(classifyInput('https://www.facebook.com/share/p/1AbC/')).toEqual({ kind: 'link', url: 'https://www.facebook.com/share/p/1AbC/' })
    expect(classifyInput('exemple.mg/article')).toEqual({ kind: 'link', url: 'https://exemple.mg/article' })
    expect(classifyInput('https://scontent.ftnr1-1.fna.fbcdn.net/v/t39.30808-6/123_n.jpg?stp=dst&oh=x')).toMatchObject({ kind: 'image_url' })
    expect(classifyInput('https://scontent-x.fbcdn.net/v/t1.6435-9/photo')).toMatchObject({ kind: 'image_url' })
    expect(classifyInput('https://cdn.exemple.mg/video/pont.mp4')).toMatchObject({ kind: 'video_url' })
    expect(classifyInput('https://video.ftnr1-1.fna.fbcdn.net/o1/v/clip')).toMatchObject({ kind: 'video_url' })
    expect(classifyInput('URGENT partagez : le riz sera introuvable demain https://x.mg')).toMatchObject({ kind: 'text' })
    expect(classifyInput('   ')).toEqual({ kind: 'empty' })
    expect(classifyInput('javascript:alert(1)')).toMatchObject({ kind: 'text' })
  })
})

describe('notes des médias de vérification', () => {
  it('comprend les notes en français, anglais et malgache', () => {
    expect(ratingKind('Faux')).toBe('false')
    expect(ratingKind('False')).toBe('false')
    expect(ratingKind('Hors contexte')).toBe('misleading')
    expect(ratingKind('Missing context')).toBe('misleading')
    expect(ratingKind('Trompeur')).toBe('misleading')
    expect(ratingKind('Vrai')).toBe('true')
    expect(ratingKind('Diso')).toBe('false')
    expect(ratingKind('Sans note')).toBe('other')
    expect(ratingKind(null)).toBe('other')
  })
})

describe('niveau de vigilance (jamais un verdict)', () => {
  it('élevé si une alerte ou une vérification publiée conclut au faux', () => {
    expect(vigilance([{ level: 'alert', key: 'x' }])).toBe('high')
    expect(vigilance([], [{ text: null, claimant: null, publisher: 'AFP', url: null, rating: 'Faux', date: null }])).toBe('high')
    expect(vigilance([{ level: 'caution', key: 'x' }, { level: 'ok', key: 'y' }])).toBe('medium')
    expect(vigilance([{ level: 'ok', key: 'y' }, { level: 'info', key: 'z' }])).toBe('low')
  })
})

describe('synthèse par type de contenu', () => {
  it('image : chaque indice a sa source ; image IA et image déjà vérifiée en alerte', () => {
    const findings = imageFindings({
      matches: [{ case_title: 'Photo d’inondation', verdict: 'out_of_context', exact: false }],
      metadata: { finding: 'stripped' },
      ai: { available: true, score: 0.92, model: 'umm-maybe/AI-image-detector' },
      sourceUrl: 'https://cdn.exemple.mg/p.jpg',
    })
    expect(findings.filter((item) => item.level === 'alert').map((item) => item.key)).toEqual(['seenWithVerdict', 'aiHigh'])
    expect(findings.find((item) => item.key === 'aiHigh')?.params?.percent).toBe(92)
    expect(findings.find((item) => item.key === 'metaStripped')?.level).toBe('info')
    expect(findings.at(-1)?.key).toBe('reverseReady')
    expect(imageFindings({ ai: { available: false } }).map((item) => item.key)).toContain('aiUnavailable')
  })

  it('lien : domaine récent et source peu fiable à examiner, publication bloquée expliquée', () => {
    const findings = linkFindings({ domain: 'info-flash.mg', ageDays: 40, https: false, source: { name: 'Info Flash', score: 2.5 } })
    expect(findings.map((item) => [item.key, item.level])).toEqual([
      ['domainNew', 'caution'],
      ['noHttps', 'caution'],
      ['sourceScore', 'caution'],
    ])
    expect(linkFindings({ page: { social: 'facebook', blocked: true }, sourceChecked: true }).map((item) => item.key)).toEqual(['socialBlocked'])
    expect(linkFindings({ ageDays: 4000, domain: 'rfi.fr' })[0]).toMatchObject({ key: 'domainOld', level: 'ok' })
  })

  it('texte : un chiffre très éloigné de la statistique officielle est une alerte, avec sa source', () => {
    const findings = textFindings({
      signals: ['urgency'],
      claims: 2,
      figures: [{ raw: '25 %', percent: 160, indicator: 'Inflation', official: 9.6, year: 2023, source: 'Banque mondiale' }],
    })
    expect(findings.map((item) => [item.key, item.level])).toEqual([
      ['signal.urgency', 'caution'],
      ['figureGap', 'alert'],
      ['claimsToCheck', 'info'],
    ])
    expect(findings[1].source?.name).toBe('Banque mondiale')
  })

  it('vidéo : montage et images clés à rechercher', () => {
    expect(videoFindings({ keyframes: 5, sceneChanges: 2, durationS: 30 }).map((item) => item.key)).toEqual(['videoEdited', 'videoKeyframes'])
  })
})
