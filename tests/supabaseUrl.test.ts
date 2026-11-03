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

describe('lectures retentées quand le réseau coupe', async () => {
  const { fetchWithRetry } = await import('@/lib/supabase')
  const ok = new Response('[]')
  const cut = () => Promise.reject(new TypeError('Failed to fetch'))

  it('retente une lecture coupée puis réussit', async () => {
    const base = vi.fn().mockImplementationOnce(cut).mockImplementationOnce(cut).mockResolvedValue(ok)
    await expect(fetchWithRetry(base, [0, 0])('https://x/rest/v1/cases')).resolves.toBe(ok)
    expect(base).toHaveBeenCalledTimes(3)
  })

  it('abandonne après les tentatives prévues', async () => {
    const base = vi.fn().mockImplementation(cut)
    await expect(fetchWithRetry(base, [0, 0])('https://x/rest/v1/cases')).rejects.toThrow('Failed to fetch')
    expect(base).toHaveBeenCalledTimes(3)
  })

  it('ne rejoue jamais une écriture', async () => {
    const base = vi.fn().mockImplementation(cut)
    await expect(fetchWithRetry(base, [0, 0])('https://x/rest/v1/cases', { method: 'POST' })).rejects.toThrow()
    expect(base).toHaveBeenCalledTimes(1)
  })
})
