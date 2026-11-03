import { Copy, ExternalLink, FileDown, Search } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, Input, VerdictBadge } from '@/components/ui'
import { FormMessage } from '@/features/auth/FormMessage'
import { BackToCases } from '@/features/dossiers/CasePage'
import { reportUrl, useFormatDate, usePortalError } from '@/features/portail/components'
import { PORTAL_SELECT } from '@/features/portail/PortalHomePage'
import { portalApi } from '@/features/portail/portalApi'
import { downloadBlob, publicReportPdf } from '@/features/portail/publicReportPdf'
import type { ReportFilters } from '@/features/portail/types'
import { useLoad } from '@/features/portail/useLoad'
import { MADAGASCAR_REGIONS } from '@/lib/regions'
import { LANGUAGES, VERDICTS } from '@/types/domain'

const EMPTY: ReportFilters = { query: '', verdict: '', theme: '', region: '', language: '', from: '', to: '' }

/** W7 — Bibliothèque des rapports publiés : recherche (mot-clé, verdict, région, thème, langue, date), PDF, partage. */
export function LibraryPage() {
  const { t } = useTranslation()
  const formatDate = useFormatDate()
  const portalError = usePortalError()
  const [draft, setDraft] = useState<ReportFilters>(EMPTY)
  const [filters, setFilters] = useState<ReportFilters>(EMPTY)
  const [copied, setCopied] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const { data: cards, error, loading } = useLoad(() => portalApi().reports({ ...filters, limit: 50 }), [filters])

  const pdf = async (publicId: string) => {
    setMessage(null)
    try {
      const report = await portalApi().report(publicId)
      if (!report) return
      downloadBlob(await publicReportPdf(report, t, (iso) => formatDate(iso), reportUrl(publicId)), `${publicId}.pdf`)
    } catch (caught) {
      setMessage(portalError(caught))
    }
  }

  const field = (key: keyof ReportFilters) => ({
    value: (draft[key] as string) ?? '',
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setDraft({ ...draft, [key]: event.target.value }),
  })

  return (
    <div className="space-y-4">
      <BackToCases />
      <Card className="p-4">
        <form
          role="search"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(event) => {
            event.preventDefault()
            setFilters({ ...draft })
          }}
        >
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="lib-query" className="text-sm font-semibold text-ink">{t('portail.filter.query')}</label>
            <Input id="lib-query" type="search" {...field('query')} placeholder={t('portail.filter.queryPlaceholder')} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="lib-verdict" className="text-sm font-semibold text-ink">{t('portail.filter.verdict')}</label>
            <select id="lib-verdict" className={PORTAL_SELECT} {...field('verdict')}>
              <option value="">{t('portail.filter.all')}</option>
              {VERDICTS.map((verdict) => <option key={verdict} value={verdict}>{t(`verdict.${verdict}`)}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="lib-language" className="text-sm font-semibold text-ink">{t('profil.language')}</label>
            <select id="lib-language" className={PORTAL_SELECT} {...field('language')}>
              <option value="">{t('portail.filter.all')}</option>
              {LANGUAGES.map((language) => <option key={language} value={language}>{t(`language.${language}`)}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="lib-region" className="text-sm font-semibold text-ink">{t('portail.filter.region')}</label>
            <select id="lib-region" className={PORTAL_SELECT} {...field('region')}>
              <option value="">{t('portail.filter.all')}</option>
              {MADAGASCAR_REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="lib-theme" className="text-sm font-semibold text-ink">{t('portail.filter.theme')}</label>
            <Input id="lib-theme" {...field('theme')} placeholder={t('portail.filter.themePlaceholder')} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="lib-from" className="text-sm font-semibold text-ink">{t('bibliotheque.from')}</label>
            <Input id="lib-from" type="date" {...field('from')} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="lib-to" className="text-sm font-semibold text-ink">{t('bibliotheque.to')}</label>
            <Input id="lib-to" type="date" {...field('to')} />
          </div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
            <Button type="submit">
              <Search className="size-4" aria-hidden />
              {t('portail.filter.search')}
            </Button>
            <Button variant="ghost" onClick={() => { setDraft(EMPTY); setFilters(EMPTY) }}>{t('bibliotheque.reset')}</Button>
          </div>
        </form>
      </Card>

      {(error || message) && <FormMessage tone="error">{message ?? portalError(error)}</FormMessage>}
      {loading && !cards && <p className="text-sm text-ink-muted">{t('auth.loading')}</p>}
      <p className="text-sm text-ink-muted" aria-live="polite">{cards ? t('bibliotheque.count', { count: cards.length }) : ''}</p>
      <ul className="space-y-2">
        {cards?.map((card) => (
          <li key={card.public_id}>
            <Card className="space-y-2 p-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <VerdictBadge verdict={card.verdict} />
                <Badge tone="info">{card.public_id}</Badge>
                <Badge>{t(`language.${card.language}`)}</Badge>
                {card.corrected && <Badge>{t('portail.corrected')}</Badge>}
              </div>
              <p className="font-display text-base font-bold text-navy dark:text-ink">{card.title}</p>
              <p className="line-clamp-2 text-sm text-ink">{card.summary}</p>
              <p className="text-xs text-ink-muted">{[formatDate(card.published_at), card.region, card.theme].filter(Boolean).join(' · ')}</p>
              <div className="flex flex-wrap gap-2">
                <Link to={`/portail/rapports/${card.public_id}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-line px-3 text-sm font-semibold text-cobalt hover:bg-canvas">
                  <ExternalLink className="size-4" aria-hidden />
                  {t('bibliotheque.open')}
                </Link>
                <Button variant="secondary" className="min-h-10" onClick={() => void pdf(card.public_id)}>
                  <FileDown className="size-4" aria-hidden />
                  PDF
                </Button>
                <Button
                  variant="secondary"
                  className="min-h-10"
                  onClick={() => void navigator.clipboard.writeText(reportUrl(card.public_id)).then(() => setCopied(card.public_id), () => undefined)}
                >
                  <Copy className="size-4" aria-hidden />
                  {copied === card.public_id ? t('portail.share.copied') : t('portail.share.copy')}
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>
      {cards?.length === 0 && <Card className="p-4 text-sm text-ink-muted">{t('portail.noReports')}</Card>}
    </div>
  )
}
