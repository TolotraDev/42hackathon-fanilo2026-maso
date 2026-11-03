import { describe, expect, it } from 'vitest'
import { canAccessSection, homePathFor } from '@/lib/permissions'
import { canTransition, canValidate } from '@/lib/workflow'
import { CASE_STATUSES, ROLES } from '@/types/domain'

describe('accès aux espaces selon le rôle', () => {
  it('réserve les espaces de vérification à l’équipe éditoriale', () => {
    for (const section of ['veille', 'verifier', 'rediger', 'dossiers'] as const) {
      expect(canAccessSection('journalist', section)).toBe(true)
      expect(canAccessSection('admin', section)).toBe(false)
      expect(canAccessSection('public', section)).toBe(false)
    }
  })

  it('ouvre l’annuaire public, les statistiques et le portail aux invités', () => {
    expect(canAccessSection('public', 'ressources')).toBe(true)
    expect(canAccessSection('public', 'portail')).toBe(true)
    expect(canAccessSection('public', 'accueil')).toBe(false)
    expect(canAccessSection('public', 'admin')).toBe(false)
  })

  it('réserve l’administration à l’administrateur', () => {
    expect(canAccessSection('admin', 'admin')).toBe(true)
    expect(canAccessSection('editor_in_chief', 'admin')).toBe(false)
  })

  it('refuse tout accès sans rôle', () => {
    expect(canAccessSection(null, 'profil')).toBe(false)
  })

  it('envoie chaque rôle vers son accueil', () => {
    expect(homePathFor('fact_checker')).toBe('/accueil')
    expect(homePathFor('admin')).toBe('/admin')
    expect(homePathFor('public')).toBe('/ressources')
  })
})

describe('workflow des dossiers (copie de public.can_transition)', () => {
  it('un journaliste ne peut pas publier', () => {
    expect(canTransition('validated', 'published', 'journalist')).toBe(false)
    expect(canTransition('validated', 'published', 'editor_in_chief')).toBe(true)
  })

  it('seuls le fact-checker et le rédacteur en chef soumettent un verdict', () => {
    expect(canTransition('in_analysis', 'to_review', 'journalist')).toBe(false)
    expect(canTransition('in_analysis', 'to_review', 'fact_checker')).toBe(true)
  })

  it('personne ne valide son propre travail', () => {
    expect(canValidate('editor_in_chief', 'ed-1', 'ed-1')).toBe(false)
    expect(canValidate('editor_in_chief', 'ed-2', 'ed-1')).toBe(true)
    expect(canValidate('fact_checker', 'fc-2', 'fc-1')).toBe(false)
  })

  it('l’administrateur et le public ne changent aucun statut', () => {
    for (const role of ['admin', 'public'] as const) {
      for (const from of CASE_STATUSES) {
        for (const to of CASE_STATUSES) expect(canTransition(from, to, role)).toBe(false)
      }
    }
  })

  it('un dossier publié ou classé ne change plus de statut', () => {
    for (const role of ROLES) {
      for (const to of CASE_STATUSES) {
        expect(canTransition('published', to, role)).toBe(false)
        expect(canTransition('closed', to, role)).toBe(false)
      }
    }
  })
})
