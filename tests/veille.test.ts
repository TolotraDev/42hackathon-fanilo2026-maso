import { describe, expect, it } from 'vitest'
import { classify, countByRegion, detectRegion, sortItems, trends, type VeilleItem } from '@/features/veille/veilleModel'
import { DEFAULT_SETTINGS } from '@/lib/settings'

const rules = DEFAULT_SETTINGS.alert_rules

const item = (id: string, title: string, occurrences = 1): VeilleItem => {
  const { level, keywords } = classify(title, rules, occurrences)
  return { id, origin: 'report', title, text: title, url: null, source: 'test', region: detectRegion(title), date: `2026-11-0${id}`, level, keywords, occurrences }
}

describe('veille (M2 / W3)', () => {
  it('classe par mots-clés, sans tenir compte des accents', () => {
    expect(classify('Une EPIDEMIE de choléra annoncée', rules).level).toBe('high')
    expect(classify('Le prix du riz augmente', rules).level).toBe('medium')
    expect(classify('Fête de quartier samedi', rules).level).toBe('low')
  })

  it('ne confond pas un mot-clé avec un morceau de mot', () => {
    expect(classify('Le mortier du chantier', rules).keywords).not.toContain('morts')
  })

  it('élève le niveau d’un contenu signalé plusieurs fois', () => {
    expect(classify('Fête de quartier', rules, 3).level).toBe('medium')
    expect(classify('Le prix du riz', rules, 4).level).toBe('high')
  })

  it('situe la rumeur par région ou par ville', () => {
    expect(detectRegion('Inondation à Toamasina')).toBe('Atsinanana')
    expect(detectRegion('Coupure dans la région Boeny')).toBe('Boeny')
    expect(detectRegion('Rien de précis')).toBeNull()
  })

  it('regroupe les rumeurs par mot-clé et compte par région', () => {
    const items = [item('1', 'Cyclone à Toamasina'), item('2', 'Le cyclone approche de Mahajanga'), item('3', 'Prix du riz à Toamasina')]
    expect(trends(items)[0]).toEqual({ keyword: 'cyclone', count: 2, level: 'high' })
    expect(countByRegion(items).get('Atsinanana')).toEqual({ count: 2, level: 'high' })
    expect(sortItems(items).map((entry) => entry.id)).toEqual(['2', '1', '3'])
  })
})
