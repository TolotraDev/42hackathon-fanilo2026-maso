import { describe, expect, it, vi } from 'vitest'

vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({}) }))
const { projectOrigin } = await import('@/lib/supabase')

describe('adresse du projet Supabase', () => {
  it('retire un chemin collé par erreur', () => {
    expect(projectOrigin('https://abcd.supabase.co/rest/v1/')).toBe('https://abcd.supabase.co')
    expect(projectOrigin(' https://abcd.supabase.co/ ')).toBe('https://abcd.supabase.co')
  })

  it('garde le port en local', () => {
    expect(projectOrigin('http://127.0.0.1:54321')).toBe('http://127.0.0.1:54321')
  })

  it('ignore une valeur vide ou invalide (mode démonstration)', () => {
    expect(projectOrigin('')).toBeUndefined()
    expect(projectOrigin('pas une url')).toBeUndefined()
  })
})
