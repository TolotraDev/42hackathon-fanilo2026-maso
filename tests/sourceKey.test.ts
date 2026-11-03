import { describe, expect, it } from 'vitest'
import { sameSource, sourceKeyOf } from '@/lib/analysis/url'

describe('source d’un lien', () => {
  it('un site ordinaire est identifié par son domaine', () => {
    expect(sourceKeyOf('https://www.lexpress.mg/2026/11/article.html')).toEqual({ domain: 'lexpress.mg', account: null, accountUnknown: false })
    expect(sameSource('https://lexpress.mg', 'https://www.lexpress.mg/article')).toBe(true)
  })

  it('sur Facebook, la source est la page, pas facebook.com', () => {
    expect(sourceKeyOf('https://www.facebook.com/vaovaomafana.example').account).toBe('vaovaomafana.example')
    expect(sameSource('https://facebook.com/vaovaomafana.example', 'https://m.facebook.com/vaovaomafana.example/posts/123')).toBe(true)
    expect(sameSource('https://facebook.com/vaovaomafana.example', 'https://www.facebook.com/autrepage/posts/456')).toBe(false)
  })

  it('un lien d’événement ou de partage ne désigne aucun compte connu', () => {
    for (const link of ['https://www.facebook.com/events/1234567890/', 'https://www.facebook.com/share/p/1AbCdEf/', 'https://fb.watch/abc/', 'https://www.facebook.com/photo.php?fbid=1']) {
      expect(sourceKeyOf(link).accountUnknown).toBe(true)
      expect(sameSource('https://facebook.com/vaovaomafana.example', link)).toBe(false)
    }
  })

  it('profils, groupes et autres réseaux', () => {
    expect(sourceKeyOf('https://www.facebook.com/profile.php?id=10001').account).toBe('id:10001')
    expect(sourceKeyOf('https://www.facebook.com/groups/42/permalink/9').account).toBe('groups/42')
    expect(sourceKeyOf('https://www.tiktok.com/@compte/video/1').account).toBe('compte')
    expect(sourceKeyOf('https://twitter.com/compte/status/1')).toMatchObject({ domain: 'x.com', account: 'compte' })
  })
})
