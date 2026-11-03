import { FileSearch } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, Card, Input } from '@/components/ui'
import { FormMessage } from '@/features/auth/FormMessage'
import type { Tone } from '@/types/domain'
import { ReportCardView, useFormatDate, usePortalError } from './components'
import { portalApi } from './portalApi'
import type { TrackedStatus } from './types'
import { useLoad } from './useLoad'

const STATUS_TONES: Record<TrackedStatus, Tone> = { new: 'neutral', in_progress: 'info', verified: 'success', debunked: 'warning' }

/** W0 — Suivi d'un signalement par son code : uniquement l'état, jamais le contenu. */
export function TrackPage() {
  const { t } = useTranslation()
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const formatDate = useFormatDate()
  const portalError = usePortalError()
  const [draft, setDraft] = useState(code)
  const { data, error, loading } = useLoad(() => (code ? portalApi().track(code) : Promise.resolve(null)), [code])

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 font-display text-xl font-extrabold text-navy dark:text-ink">
        <FileSearch className="size-5 text-cobalt" aria-hidden />
        {t('portail.track.title')}
      </h1>
      <Card className="p-4">
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault()
            if (draft.trim()) navigate(`/portail/suivi/${draft.trim().toUpperCase()}`)
          }}
        >
          <div className="flex-1 space-y-1.5">
            <label htmlFor="track-code" className="text-sm font-semibold text-ink">{t('portail.submit.trackingCode')}</label>
            <Input id="track-code" value={draft} onChange={(event) => setDraft(event.target.value)} className="font-mono uppercase tracking-widest" maxLength={20} autoComplete="off" />
          </div>
          <Button type="submit">{t('portail.track.check')}</Button>
        </form>
      </Card>
      <div aria-live="polite">
        {code && loading && <p className="text-sm text-ink-muted">{t('auth.loading')}</p>}
        {error ? <FormMessage tone="error">{portalError(error)}</FormMessage> : null}
        {data && !data.found && <Card className="p-4 text-sm text-ink-muted">{t('portail.track.notFound')}</Card>}
        {data?.found && data.status && (
          <Card className="space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={STATUS_TONES[data.status]}>{t(`portail.track.status.${data.status}`)}</Badge>
              {data.received_at && <span className="text-xs text-ink-muted">{t('portail.track.received', { date: formatDate(data.received_at, true) })}</span>}
            </div>
            <p className="text-sm text-ink">{t(`portail.track.explain.${data.status}`)}</p>
            {data.report && <ReportCardView card={data.report} />}
          </Card>
        )}
      </div>
    </div>
  )
}
