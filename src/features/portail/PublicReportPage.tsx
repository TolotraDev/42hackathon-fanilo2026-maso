import { ArrowLeft, ExternalLink, FileDown, ShieldCheck } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { Badge, Button, Card, SectionTitle, VerdictBadge } from '@/components/ui'
import { FormMessage } from '@/features/auth/FormMessage'
import { HumanNotice, QrImage, reportUrl, SharePanel, useFormatDate, usePortalError, verifyUrl } from './components'
import { portalApi } from './portalApi'
import { downloadBlob, publicReportPdf } from './publicReportPdf'
import { useLoad } from './useLoad'

/** W0 — Page d'un rapport publié : affirmation, verdict, explication, preuves, méthode, corrections, partage. */
export function PublicReportPage() {
  const { t } = useTranslation()
  const { publicId = '' } = useParams()
  const formatDate = useFormatDate()
  const portalError = usePortalError()
  const { data: report, error, loading } = useLoad(() => portalApi().report(publicId), [publicId])

  useEffect(() => {
    if (!report) return
    const previous = document.title
    document.title = `${t(`verdict.${report.verdict}`)} — ${report.title} · MASO`
    return () => {
      document.title = previous
    }
  }, [report, t])

  const back = (
    <Link to="/portail" className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-cobalt hover:underline">
      <ArrowLeft className="size-4" aria-hidden />
      {t('portail.backToReports')}
    </Link>
  )
  if (loading) return <p className="text-sm text-ink-muted">{t('auth.loading')}</p>
  if (error) return <div className="space-y-3">{back}<FormMessage tone="error">{portalError(error)}</FormMessage></div>
  if (!report) return <div className="space-y-3">{back}<Card className="p-4 text-sm text-ink-muted">{t('portail.notFound')}</Card></div>

  const url = reportUrl(report.public_id)
  const shareTitle = t('portail.share.title', { verdict: t(`verdict.${report.verdict}`), title: report.title })

  return (
    <article className="space-y-4" lang={report.language}>
      {back}
      <Card className="space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <VerdictBadge verdict={report.verdict} />
          {report.confidence && <Badge>{t('dossiers.verdict.confidence')} : {t(`confidence.${report.confidence}`)}</Badge>}
          <Badge tone="info">{report.public_id}</Badge>
        </div>
        <h1 className="font-display text-xl font-extrabold leading-snug text-navy dark:text-ink">{report.title}</h1>
        {report.claim && (
          <div>
            <p className="text-xs font-semibold uppercase text-ink-muted">{t('portail.report.claim')}</p>
            <p className="rounded-xl bg-canvas px-3 py-2 text-sm italic text-ink">« {report.claim} »</p>
          </div>
        )}
        <p className="text-base font-semibold text-ink">{report.summary}</p>
        <p className="text-xs text-ink-muted">
          {t('portail.report.publishedBy', { date: formatDate(report.published_at), newsroom: report.newsroom })}
          {report.validated_by && ` · ${t('portail.report.validatedBy', { name: report.validated_by })}`}
          {[report.region, report.theme].filter(Boolean).length > 0 && ` · ${[report.region, report.theme].filter(Boolean).join(' · ')}`}
        </p>
        <p className="text-xs text-ink-muted">{t(`verdictDefinition.${report.verdict}`)}</p>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <Card className="space-y-2 p-4">
            <SectionTitle>{t('portail.report.explanation')}</SectionTitle>
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{report.explanation}</p>
          </Card>
          <Card className="space-y-2 p-4">
            <SectionTitle>{t('portail.report.claims')}</SectionTitle>
            <ul className="space-y-2">
              {report.claims.map((claim, index) => (
                <li key={index} className="rounded-xl border border-line p-3 text-sm text-ink">
                  {claim.text}{' '}
                  {claim.evidence.map((label) => {
                    const published = report.evidences.some((evidence) => evidence.label === label)
                    return published ? (
                      <a key={label} href={`#preuve-${label}`} className="font-semibold text-cobalt hover:underline">[{label}]</a>
                    ) : (
                      <span key={label} className="text-xs text-ink-muted" title={t('portail.report.privateEvidence')}>[{label} — {t('portail.report.notPublished')}]</span>
                    )
                  })}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="space-y-2 p-4">
            <SectionTitle>{t('portail.report.evidences')}</SectionTitle>
            {report.evidences.length === 0 && <p className="text-sm text-ink-muted">{t('portail.report.noEvidence')}</p>}
            <ul className="space-y-2">
              {report.evidences.map((evidence) => (
                <li key={evidence.label} id={`preuve-${evidence.label}`} className="space-y-1 rounded-xl bg-canvas p-3 text-sm">
                  <p className="font-semibold text-ink">[{evidence.label}] {t(`dossiers.evidenceType.${evidence.type}`)}{evidence.origin ? ` — ${evidence.origin}` : ''}</p>
                  {[evidence.archive_url, evidence.url].filter(Boolean).map((link) => (
                    <a key={link} href={link!} target="_blank" rel="noreferrer noopener" className="flex items-center gap-1 break-all text-xs text-cobalt hover:underline">
                      <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                      {link}
                    </a>
                  ))}
                  {evidence.sha256 && <p className="break-all font-mono text-[11px] text-ink-muted">SHA-256 {evidence.sha256}</p>}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="space-y-2 p-4">
            <SectionTitle>{t('portail.report.method')}</SectionTitle>
            <p className="whitespace-pre-line text-sm text-ink">{report.method || '—'}</p>
          </Card>
          {report.corrections.length > 0 && (
            <Card className="space-y-2 border-warning p-4">
              <SectionTitle>{t('portail.report.corrections')}</SectionTitle>
              <ul className="space-y-1 text-sm text-ink">
                {report.corrections.map((correction) => (
                  <li key={correction.at}><span className="text-xs text-ink-muted">{formatDate(correction.at, true)} — </span>{correction.text}</li>
                ))}
              </ul>
            </Card>
          )}
          <HumanNotice />
        </div>

        <aside className="space-y-4">
          <Card className="space-y-3 p-4">
            <SectionTitle>{t('portail.report.share')}</SectionTitle>
            <SharePanel title={shareTitle} description={report.summary} url={url} />
            <Button
              variant="secondary"
              block
              onClick={() => void publicReportPdf(report, t, (iso) => formatDate(iso), url).then((blob) => downloadBlob(blob, `${report.public_id}.pdf`))}
            >
              <FileDown className="size-4" aria-hidden />
              {t('portail.report.pdf')}
            </Button>
          </Card>
          <Card className="space-y-3 p-4 text-center">
            <SectionTitle>{t('portail.report.authenticity')}</SectionTitle>
            <div className="flex justify-center">
              <QrImage value={verifyUrl(report.public_id)} label={t('portail.report.qrLabel', { id: report.public_id })} />
            </div>
            <p className="text-xs text-ink-muted">{t('portail.report.qrHint')}</p>
            <Link to={`/portail/verifier/${report.public_id}`} className="inline-flex min-h-10 items-center justify-center gap-1.5 text-sm font-semibold text-cobalt hover:underline">
              <ShieldCheck className="size-4" aria-hidden />
              {t('portail.report.verifyNow')}
            </Link>
          </Card>
        </aside>
      </div>
    </article>
  )
}
