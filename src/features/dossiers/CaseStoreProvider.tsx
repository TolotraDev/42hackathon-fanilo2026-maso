import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { DEMO_CASE_SEEDS } from '@/data/demo/cases'
import { DEMO_USERS } from '@/data/demo/users'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  addLocalNotifications,
  localNotifications,
  notificationsFor,
  remoteNotifications,
  type AppNotification,
} from '@/features/notifications/notifications'
import { isStaff } from '@/lib/permissions'
import { supabase } from '@/lib/supabase'
import { createCaseStore, type CaseStore } from './caseStore'
import { DEMO_DB_NAME, LocalDb, localDbName } from './localDb'
import type { CaseDetail, CaseRecord, SyncState } from './model'
import { createRemote, fetchTeam } from './remote'

export interface TeamMember {
  id: string
  fullName: string
  role: string
}

interface CaseStoreContextValue {
  store: CaseStore | null
  pending: number
  syncStates: Record<string, SyncState>
  team: TeamMember[]
  /** Change à chaque modification ou synchronisation : les écrans se rechargent. */
  version: number
  notifications: AppNotification[]
  markRead: (ids: string[]) => Promise<void>
  refreshNotifications: () => Promise<void>
}

const CaseStoreContext = createContext<CaseStoreContextValue>({
  store: null,
  pending: 0,
  syncStates: {},
  team: [],
  version: 0,
  notifications: [],
  markRead: async () => undefined,
  refreshNotifications: async () => undefined,
})

const AUTO_SYNC_MS = 30000
const NOTIFICATIONS_MS = 60000
const DEMO_TEAM: TeamMember[] = DEMO_USERS.map((user) => ({ id: user.id, fullName: user.fullName, role: user.role }))
/** Nom de la rédaction de démonstration (supabase/seed.sql). */
export const DEMO_NEWSROOM = 'Rédaction démo MASO'
/** Dossiers déjà téléchargés en arrière-plan pendant cette session (pour la consultation hors ligne). */
const prefetched = new Set<string>()

/** Dossiers de l'équipe : consultables et modifiables hors ligne, synchronisés au retour du réseau. */
export function CaseStoreProvider({ children }: { children: React.ReactNode }) {
  const { profile, role } = useAuth()
  const userId = profile?.id ?? null
  const [pending, setPending] = useState(0)
  const [syncStates, setSyncStates] = useState<Record<string, SyncState>>({})
  const [team, setTeam] = useState<TeamMember[]>([])
  const [version, setVersion] = useState(0)
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  const store = useMemo(() => {
    if (!userId || !isStaff(role)) return null
    // Mode démonstration : les comptes de démo partagent la même base, comme une équipe sur un seul appareil.
    const db = new LocalDb(supabase ? localDbName(userId, 'remote') : DEMO_DB_NAME)
    return {
      db,
      notifications: supabase ? remoteNotifications(supabase) : localNotifications(db, userId),
      cases: createCaseStore({
        db,
        remote: supabase ? createRemote(supabase) : null,
        context: () => ({ userId, role, now: new Date().toISOString() }),
        isOnline: () => navigator.onLine,
        // Mode démonstration : numéro public et notifications calculés sur l'appareil.
        publication: async (local) => {
          const published = (await local.cases.toArray()).filter((stored) => stored.detail.report?.publicId).length
          return {
            publicId: `MASO-${new Date().getFullYear()}-${String(published + 1).padStart(4, '0')}`,
            editorName: DEMO_USERS.find((user) => user.id === userId)?.fullName ?? null,
            newsroom: DEMO_NEWSROOM,
          }
        },
        onLocalChange: (before, after, mutation) =>
          addLocalNotifications(db, notificationsFor(before, after, mutation, userId, DEMO_TEAM, new Date().toISOString())),
      }),
    }
  }, [userId, role])

  const refreshNotifications = useCallback(async () => {
    if (!store || (supabase && !navigator.onLine)) return
    const items = await store.notifications.list().catch(() => null)
    if (items) setNotifications(items)
  }, [store])

  const markRead = useCallback(
    async (ids: string[]) => {
      if (!store || !ids.length) return
      const now = new Date().toISOString()
      setNotifications((items) => items.map((item) => (ids.includes(item.id) ? { ...item, readAt: item.readAt ?? now } : item)))
      await store.notifications.markRead(ids).catch(() => undefined)
    },
    [store],
  )

  const refreshCounters = useCallback(async () => {
    if (!store) return
    setPending(await store.cases.pendingCount())
    setSyncStates(await store.cases.syncStates())
    setVersion((value) => value + 1)
    void refreshNotifications()
  }, [store, refreshNotifications])

  useEffect(() => {
    if (!store) return
    const unsubscribe = store.cases.subscribe(() => void refreshCounters())
    const sync = () => void store.cases.flush().then(refreshCounters)
    window.addEventListener('online', sync)
    const timer = window.setInterval(() => navigator.onLine && sync(), AUTO_SYNC_MS)
    const notificationTimer = window.setInterval(() => void refreshNotifications(), NOTIFICATIONS_MS)
    void refreshCounters()
    sync()

    void (async () => {
      // Équipe (noms affichés hors ligne) et, en mode démonstration, les 3 cas de démonstration.
      const cached = await store.db.meta.get('team')
      if (cached) setTeam(cached.value as TeamMember[])
      if (!supabase) setTeam(DEMO_TEAM)
      if (supabase && navigator.onLine) {
        const fresh = await fetchTeam(supabase).catch(() => null)
        if (fresh) {
          setTeam(fresh)
          await store.db.meta.put({ key: 'team', value: fresh })
        }
      }
      if (!supabase && !(await store.db.meta.get('seeded'))) {
        for (const seed of DEMO_CASE_SEEDS) await store.cases.mutate({ kind: 'create_case', caseId: seed.id, input: seed.input })
        await store.db.meta.put({ key: 'seeded', value: true })
      }
    })()

    return () => {
      unsubscribe()
      window.removeEventListener('online', sync)
      window.clearInterval(timer)
      window.clearInterval(notificationTimer)
    }
  }, [store, refreshCounters, refreshNotifications])

  const value = useMemo(
    () => ({ store: store?.cases ?? null, pending, syncStates, team, version, notifications, markRead, refreshNotifications }),
    [store, pending, syncStates, team, version, notifications, markRead, refreshNotifications],
  )
  return <CaseStoreContext.Provider value={value}>{children}</CaseStoreContext.Provider>
}

export const useCaseStore = () => useContext(CaseStoreContext)

/** Liste des dossiers (serveur, ou appareil hors ligne) ; télécharge en arrière-plan le détail des plus récents. */
export function useCases() {
  const { store, version } = useCaseStore()
  const [state, setState] = useState<{ cases: CaseRecord[] | null; offline: boolean; error: unknown }>({ cases: null, offline: false, error: null })

  useEffect(() => {
    if (!store) return
    let cancelled = false
    store
      .listCases()
      .then(async (result) => {
        if (cancelled) return
        setState({ cases: result.cases, offline: result.offline, error: null })
        if (!result.offline && store.mode === 'remote') {
          for (const record of result.cases.slice(0, 15)) {
            if (prefetched.has(record.id)) continue
            prefetched.add(record.id)
            await store.getCase(record.id).catch(() => null)
          }
        }
      })
      .catch((error: unknown) => !cancelled && setState((current) => ({ ...current, error })))
    return () => {
      cancelled = true
    }
  }, [store, version])

  return state
}

export function useCase(id: string | undefined) {
  const { store, version } = useCaseStore()
  const [state, setState] = useState<{ detail: CaseDetail | null | undefined; offline: boolean; error: unknown }>({ detail: undefined, offline: false, error: null })

  useEffect(() => {
    if (!store || !id) return
    let cancelled = false
    store
      .getCase(id)
      .then((result) => !cancelled && setState({ detail: result.detail, offline: result.offline, error: null }))
      .catch((error: unknown) => !cancelled && setState((current) => ({ ...current, error })))
    return () => {
      cancelled = true
    }
  }, [store, id, version])

  return state
}
