import { useEffect, useState } from 'react'
import { analyseApi } from '@/lib/analyseApi'
import { useOnlineStatus } from './useOnlineStatus'

export type Capabilities = Record<string, boolean>

/** Analyses disponibles sur le service Python ; null tant que la réponse n'est pas arrivée ou si le service est absent. */
export function useServiceCapabilities(): { capabilities: Capabilities | null; checked: boolean } {
  const online = useOnlineStatus()
  const [state, setState] = useState<{ capabilities: Capabilities | null; checked: boolean }>({ capabilities: null, checked: false })

  useEffect(() => {
    let cancelled = false
    analyseApi
      .health()
      .then((body) => !cancelled && setState({ capabilities: body.capabilities, checked: true }))
      .catch(() => !cancelled && setState({ capabilities: null, checked: true }))
    return () => {
      cancelled = true
    }
  }, [online])

  return state
}
