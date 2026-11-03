import { describe, expect, it } from 'vitest'
import { analyzeText, parseFigure } from '@/lib/analysis/textClaims'

const RUMEUR =
  'URGENT !!! Le barrage de Mandraka a cédé ce matin, 12 000 familles évacuées à Antananarivo. Partagez vite avant que ce soit supprimé ! Rado Rakoto a dit « la ville sera sous l’eau ce soir ».'

describe('analyse de texte (M6)', () => {
  const analysis = analyzeText(RUMEUR)

  it('extrait les affirmations vérifiables', () => {
    expect(analysis.claims.length).toBeGreaterThanOrEqual(2)
    expect(analysis.entities.places).toEqual(['Antananarivo'])
    expect(analysis.entities.numbers).toContain('12 000')
    expect(analysis.entities.dates).toContain('ce matin')
    expect(analysis.entities.names).toContain('Rado Rakoto')
    expect(analysis.claims.some((claim) => claim.quotes.length === 1)).toBe(true)
  })

  it('repère les signaux de manipulation', () => {
    const ids = analysis.signals.map((signal) => signal.id)
    expect(ids).toEqual(expect.arrayContaining(['urgency', 'share_appeal', 'no_source', 'unsourced_figures', 'shouting']))
  })

  it('donne les chiffres à rapprocher des statistiques', () => {
    expect(analysis.figures.map((figure) => figure.value)).toContain(12000)
  })

  it('ne signale pas l’absence de source quand une source est citée', () => {
    const sourced = analyzeText('Selon le BNGRC, 1 200 ménages sont sinistrés dans la région Boeny en 2024.')
    expect(sourced.signals.map((signal) => signal.id)).not.toContain('no_source')
    expect(sourced.signals.map((signal) => signal.id)).not.toContain('unsourced_figures')
    expect(sourced.entities.places).toContain('Boeny')
    expect(sourced.entities.dates).toContain('2024')
  })

  it('reconnaît le malgache', () => {
    const mg = analyzeText('MAIKA! Zarao amin’ny namana: tondra-drano any Toamasina omaly.')
    const ids = mg.signals.map((signal) => signal.id)
    expect(ids).toContain('urgency')
    expect(ids).toContain('share_appeal')
    expect(mg.entities.places).toContain('Toamasina')
  })

  it('lit les nombres écrits à la française', () => {
    expect(parseFigure('12 000')).toBe(12000)
    expect(parseFigure('1.200')).toBe(1200)
    expect(parseFigure('3,5 %')).toBe(3.5)
  })
})
