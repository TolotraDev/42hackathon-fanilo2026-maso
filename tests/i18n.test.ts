import { describe, expect, it } from 'vitest'
import en from '@/i18n/locales/en.json'
import fr from '@/i18n/locales/fr.json'
import mg from '@/i18n/locales/mg.json'
import { CASE_STATUSES, VERDICTS } from '@/types/domain'

type Tree = { [key: string]: string | Tree }

function flatKeys(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string' ? [`${prefix}${key}`] : flatKeys(value, `${prefix}${key}.`),
  )
}

function lookup(tree: Tree, path: string): string | Tree | undefined {
  return path.split('.').reduce<string | Tree | undefined>((node, key) => (typeof node === 'object' ? node[key] : undefined), tree)
}

const locales: Record<string, Tree> = { fr, mg, en }
const reference = flatKeys(fr).sort()

describe('traductions', () => {
  it.each(Object.keys(locales))('%s contient exactement les mêmes clés que fr', (lng) => {
    expect(flatKeys(locales[lng]).sort()).toEqual(reference)
  })

  it.each(Object.keys(locales))('%s n’a aucune chaîne vide', (lng) => {
    for (const key of flatKeys(locales[lng])) {
      expect(lookup(locales[lng], key), key).not.toBe('')
    }
  })

  it.each(Object.keys(locales))('%s écrit un libellé et une définition pour chaque verdict', (lng) => {
    for (const verdict of VERDICTS) {
      expect(lookup(locales[lng], `verdict.${verdict}`)).toBeTypeOf('string')
      expect(lookup(locales[lng], `verdictDefinition.${verdict}`)).toBeTypeOf('string')
    }
  })

  it.each(Object.keys(locales))('%s écrit un libellé pour chaque statut de dossier', (lng) => {
    for (const status of CASE_STATUSES) {
      expect(lookup(locales[lng], `caseStatus.${status}`)).toBeTypeOf('string')
    }
  })
})
