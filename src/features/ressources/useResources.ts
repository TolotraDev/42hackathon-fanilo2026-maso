import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useAuthErrorMessage } from '@/features/auth/useAuthError'
import { loadWithPack } from '@/lib/offlineCache'
import { listDirectory, listNotes } from './resourcesApi'
import type { DirectoryPerson, PersonNote } from './types'

export interface PackState {
  offline: boolean
  savedAt: string | null
}

/** Annuaire + notes personnelles, avec repli sur le pack hors ligne de l'appareil (M8). */
export function useDirectory() {
  const { role, profile } = useAuth()
  const errorMessage = useAuthErrorMessage()
  const [people, setPeople] = useState<DirectoryPerson[] | null>(null)
  const [notes, setNotes] = useState<Record<string, PersonNote>>({})
  const [pack, setPack] = useState<PackState>({ offline: false, savedAt: null })
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      const key = `directory.${role}.${profile?.id ?? 'invite'}`
      const directory = await loadWithPack(key, () => listDirectory(role))
      setPeople(directory.data)
      setPack({ offline: directory.offline, savedAt: directory.savedAt })
      if (role !== 'public') {
        const personal = await loadWithPack(`notes.${profile?.id ?? 'demo'}`, listNotes)
        setNotes(personal.data)
      }
    } catch (failure) {
      setError(errorMessage(failure))
    }
  }, [role, profile?.id, errorMessage])

  useEffect(() => {
    void reload()
  }, [reload])

  return { people, notes, setNotes, pack, error, reload }
}
