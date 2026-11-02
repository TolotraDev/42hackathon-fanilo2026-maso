import { ScanSearch } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Badge, Card } from '@/components/ui'
import { analyseApi, stateForServiceError, type VideoResult } from '@/lib/analyseApi'
import { MAX_BYTES, sniffMime } from '@/lib/analysis/fileType'
import { sha256Hex } from '@/lib/analysis/hash'
import type { StepResult } from '@/lib/analysis/types'
import { AttachToCase } from './AttachToCase'
import { FileDrop } from './FileDrop'
import { BackToHub } from './ImageAnalysisPage'
import { setPendingMedia, takePendingMedia } from './pendingMedia'
import { FactList, StepCard } from './StepCard'
import { addEvidence } from './verificationApi'

interface VideoReception {
  mime: string | null
  sha256: string
  size: number
  rejected: 'unsupported_type' | 'too_large' | null
}

const base64ToFile = (base64: string, name: string) => {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
  return new File([bytes], name, { type: 'image/jpeg' })
}

/** M4 (P1) — Analyse vidéo : informations techniques et images clés, chacune analysable. */
export function VideoAnalysisPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [media, setMedia] = useState(() => takePendingMedia())
  const file = media?.file ?? null
  const [reception, setReception] = useState<StepResult<VideoReception>>({ state: 'pending' })
  const [server, setServer] = useState<StepResult<VideoResult>>({ state: 'pending' })
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])

  useEffect(() => {
    if (!file) return
    let cancelled = false
    void (async () => {
      setReception({ state: 'running' })
      const started = performance.now()
      const head = new Uint8Array(await file.slice(0, 32).arrayBuffer())
      const mime = sniffMime(head)
      const sha256 = await sha256Hex(await file.arrayBuffer())
      const rejected = !mime?.startsWith('video/') ? 'unsupported_type' : file.size > MAX_BYTES.video ? 'too_large' : null
      if (cancelled) return
      setReception({
        state: 'done',
        data: { mime, sha256, size: file.size, rejected },
        tool: 'Web Crypto (SHA-256)',
        durationMs: Math.round(performance.now() - started),
      })
      if (rejected) return
      setServer({ state: 'running' })
      const serverStarted = performance.now()
      try {
        const data = await analyseApi.video(file)
        if (!cancelled) setServer({ state: 'done', data, tool: data.tool, durationMs: Math.round(performance.now() - serverStarted) })
      } catch (error) {
        if (!cancelled) setServer({ state: stateForServiceError(error) })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [file])

  if (!file) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <BackToHub />
        <FileDrop kind="video" onFile={(picked) => setMedia({ file: picked })} />
      </div>
    )
  }

  const info = server.data?.info
  const rejected = reception.data?.rejected

  return (
    <div className="space-y-4">
      <BackToHub />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:items-start">
        {/* Mobile : aperçu → résultats → outils. Web : aperçu et outils à gauche, résultats à droite. */}
        <div className="lg:col-start-1 lg:row-start-1">
          <Card className="overflow-hidden">
            {previewUrl && <video src={previewUrl} controls className="max-h-72 w-full bg-black" />}
            <p className="truncate p-3 text-xs font-semibold text-ink">{file.name}</p>
          </Card>
        </div>

        <ol className="space-y-3 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <li>
            <StepCard
              index={1}
              title={t('verifier.image.step.reception')}
              state={reception.state}
              tool={reception.tool}
              durationMs={reception.durationMs}
              limits={t('verifier.limits.reception')}
              summary={rejected && <span className="text-danger">{t(`verifier.video.rejected.${rejected}`)}</span>}
            >
              {reception.data && !rejected && (
                <FactList items={[['SHA-256', <code className="break-all font-mono text-[11px]">{reception.data.sha256}</code>]]} />
              )}
            </StepCard>
          </li>
          {!rejected && (
            <>
              <li>
                <StepCard
                  index={2}
                  title={t('verifier.video.step.technical')}
                  state={server.state}
                  tool={server.tool}
                  durationMs={server.durationMs}
                  limits={t('verifier.limits.video')}
                  summary={
                    server.state === 'waiting_network'
                      ? t('verifier.summary.waitingNetwork')
                      : server.state === 'unavailable'
                        ? t('verifier.summary.unavailable')
                        : undefined
                  }
                >
                  {info && (
                    <FactList
                      items={[
                        [t('verifier.video.duration'), info.duration_s !== null ? `${info.duration_s} s` : null],
                        [t('verifier.video.resolution'), `${info.width}×${info.height}`],
                        [t('verifier.video.codec'), info.codec],
                        [t('verifier.video.fps'), info.fps],
                        [t('verifier.video.audio'), info.audio ? t('verifier.video.yes') : t('verifier.video.no')],
                      ]}
                    />
                  )}
                </StepCard>
              </li>
              <li>
                <StepCard
                  index={3}
                  title={t('verifier.video.step.keyframes')}
                  state={server.state}
                  limits={t('verifier.limits.keyframes')}
                  summary={server.data && t('verifier.video.keyframesHint', { count: server.data.keyframes.length })}
                >
                  {server.data && (
                    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {server.data.keyframes.map((frame) => (
                        <li key={frame.time_s}>
                          <button
                            type="button"
                            onClick={() => {
                              setPendingMedia({
                                file: base64ToFile(frame.jpeg_base64, `${file.name}-${frame.time_s}s.jpg`),
                                origin: t('verifier.video.frameOrigin', { name: file.name, time: frame.time_s }),
                              })
                              navigate('/verifier/image')
                            }}
                            className="group block w-full overflow-hidden rounded-xl border border-line text-left"
                          >
                            <img src={`data:image/jpeg;base64,${frame.jpeg_base64}`} alt={t('verifier.video.frameAt', { time: frame.time_s })} className="aspect-video w-full object-cover" />
                            <span className="flex items-center justify-between gap-1 px-2 py-1.5 text-[11px] text-ink-muted">
                              {frame.time_s} s
                              {frame.reason === 'scene_change' && <Badge tone="info">{t('verifier.video.sceneChange')}</Badge>}
                              <ScanSearch className="size-3.5 text-cobalt" aria-label={t('verifier.video.analyseFrame')} />
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </StepCard>
              </li>
            </>
          )}
        </ol>

        <div className="space-y-4 lg:col-start-1 lg:row-start-2">
          {reception.state === 'done' && !rejected && (
            <AttachToCase
              onAttach={async (caseId, origin) => {
                await addEvidence({
                  caseId,
                  type: 'video',
                  file,
                  fileExtension: reception.data?.mime === 'video/webm' ? 'webm' : reception.data?.mime === 'video/quicktime' ? 'mov' : 'mp4',
                  sha256: reception.data?.sha256,
                  origin: origin || media?.origin || null,
                  analysis: {
                    version: 1,
                    kind: 'video',
                    analysed_at: new Date().toISOString(),
                    info: server.data?.info ?? null,
                    keyframes: server.data?.keyframes.map(({ time_s, reason }) => ({ time_s, reason })) ?? [],
                    tool: server.data?.tool,
                  },
                })
              }}
            />
          )}
        
        </div>
      </div>
    </div>
  )
}
