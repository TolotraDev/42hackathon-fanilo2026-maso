import { Share2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card } from '@/components/ui'
import { mediaKind, sniffMime } from '@/lib/analysis/fileType'
import { firstUrlIn, normalizeUrl } from '@/lib/analysis/url'
import { BackToHub } from './ImageAnalysisPage'
import { setPendingMedia } from './pendingMedia'

// Mêmes clés que src/sw/sw.ts
const SHARE_CACHE = 'maso-share'
const SHARED_FILE_KEY = '/__maso/shared-file'

/** Réception d'un contenu partagé depuis le téléphone (M3, Web Share Target) : oriente vers la bonne analyse. */
export function SharePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [empty, setEmpty] = useState(false)

  useEffect(() => {
    void (async () => {
      const sharedUrl = normalizeUrl(params.get('url') ?? '') ?? firstUrlIn(`${params.get('text') ?? ''} ${params.get('title') ?? ''}`)
      const cache = 'caches' in window ? await caches.open(SHARE_CACHE) : null
      const response = await cache?.match(SHARED_FILE_KEY)
      if (response) {
        await cache!.delete(SHARED_FILE_KEY)
        const blob = await response.blob()
        const name = decodeURIComponent(response.headers.get('X-File-Name') ?? 'partage')
        const kind = mediaKind(sniffMime(new Uint8Array(await blob.slice(0, 32).arrayBuffer())))
        if (kind) {
          setPendingMedia({
            file: new File([blob], name, { type: blob.type }),
            sourceUrl: sharedUrl,
            origin: params.get('text') || params.get('title') || null,
          })
          navigate(`/verifier/${kind}`, { replace: true })
          return
        }
      }
      if (sharedUrl) {
        navigate(`/verifier/lien?url=${encodeURIComponent(sharedUrl)}`, { replace: true })
        return
      }
      setEmpty(true)
    })()
  }, [params, navigate])

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <BackToHub />
      <Card className="flex items-center gap-3 p-4 text-sm text-ink">
        <Share2 className="size-5 text-cobalt" aria-hidden />
        {empty ? t('verifier.share.empty') : t('verifier.share.receiving')}
      </Card>
    </div>
  )
}
