import { QrCode, ShieldAlert, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, Card, Input, VerdictBadge } from '@/components/ui'
import { FormMessage } from '@/features/auth/FormMessage'
import { useFormatDate, usePortalError } from './components'
import { portalApi } from './portalApi'
import { useLoad } from './useLoad'

/** W0 — Vérifier un rapport (QR ou numéro) : la signature est recalculée sur le contenu publié. */
export function VerifyPage() {
  const { t } = useTranslation()
  const { publicId = '' } = useParams()
  const navigate = useNavigate()
  const formatDate = useFormatDate()
  const portalError = usePortalError()
  const [draft, setDraft] = useState(publicId)
  const { data, error, loading } = useLoad(() => (publicId ? portalApi().verify(publicId) : Promise.resolve(null)), [publicId])

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 font-display text-xl font-extrabold text-navy dark:text-ink">
        <QrCode className="size-5 text-cobalt" aria-hidden />
        {t('portail.verify.title')}
      </h1>
      <p className="text-sm text-ink-muted">{t('portail.verify.subtitle')}</p>
      <Card className="p-4">
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault()
            if (draft.trim()) navigate(`/portail/verifier/${draft.trim().toUpperCase()}`)
          }}
        >
          <div className="flex-1 space-y-1.5">
            <label htmlFor="verify-id" className="text-sm font-semibold text-ink">{t('portail.verify.number')}</label>
            <Input id="verify-id" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="MASO-2026-0001" className="font-mono uppercase" autoComplete="off" />
          </div>
          <Button type="submit">{t('portail.verify.check')}</Button>
        </form>
      </Card>
      <div aria-live="polite">
        {publicId && loading && <p className="text-sm text-ink-muted">{t('auth.loading')}</p>}
        {error ? <FormMessage tone="error">{portalError(error)}</FormMessage> : null}
        {data && !data.found && (
          <Card className="flex items-start gap-3 border-danger p-4">
            <ShieldAlert className="size-6 shrink-0 text-danger" aria-hidden />
            <div>
              <p className="font-display font-bold text-danger">{t('portail.verify.unknown')}</p>
              <p className="text-sm text-ink">{t('portail.verify.unknownHint')}</p>
            </div>
          </Card>
        )}
        {data?.found && (
          <Card className={`space-y-3 p-4 ${data.valid ? 'border-success' : 'border-danger'}`}>
            <div className="flex items-start gap-3">
              {data.valid ? <ShieldCheck className="size-7 shrink-0 text-success" aria-hidden /> : <ShieldAlert className="size-7 shrink-0 text-danger" aria-hidden />}
              <div>
                <p className={`font-display text-lg font-bold ${data.valid ? 'text-success' : 'text-danger'}`}>
                  {data.valid ? t('portail.verify.authentic') : t('portail.verify.altered')}
                </p>
                <p className="text-sm text-ink">{data.valid ? t('portail.verify.authenticHint') : t('portail.verify.alteredHint')}</p>
              </div>
            </div>
            <div className="space-y-1 rounded-xl bg-canvas p-3 text-sm text-ink">
              <p className="flex flex-wrap items-center gap-2 font-semibold">{data.verdict && <VerdictBadge verdict={data.verdict} />}{data.title}</p>
              <p className="text-xs text-ink-muted">
                {data.public_id} · {data.newsroom}
                {data.published_at && ` · ${t('portail.verify.published', { date: formatDate(data.published_at, true) })}`}
                {data.signed_at && ` · ${t('portail.verify.signed', { date: formatDate(data.signed_at, true) })}`}
              </p>
              {data.content_hash && <p className="break-all font-mono text-[11px] text-ink-muted">{t('portail.verify.hash')} : {data.content_hash}</p>}
            </div>
            {data.valid && (
              <Link to={`/portail/rapports/${data.public_id}`} className="inline-flex min-h-10 items-center text-sm font-semibold text-cobalt hover:underline">
                {t('portail.verify.open')}
              </Link>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
