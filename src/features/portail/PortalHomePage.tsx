import { Megaphone, Search } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button, Card, Input } from '@/components/ui'
import { FormMessage } from '@/features/auth/FormMessage'
import { MADAGASCAR_REGIONS } from '@/lib/regions'
import { VERDICTS } from '@/types/domain'
import { HumanNotice, ReportCardView, usePortalError } from './components'
import { portalApi } from './portalApi'
import type { ReportFilters } from './types'
import { useLoad } from './useLoad'

export const PORTAL_SELECT = 'min-h-11 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink focus:border-cobalt focus:outline-none'
const PAGE = 12

/** W0 — Accueil du portail : derniers rapports publiés, recherche par mot-clé, verdict, thème, région. */
export function PortalHomePage() {
  const { t } = useTranslation()
  const portalError = usePortalError()
  const [draft, setDraft] = useState<ReportFilters>({ query: '', verdict: '', theme: '', region: '' })
  const [filters, setFilters] = useState<ReportFilters>({})
  const [limit, setLimit] = useState(PAGE)
  const { data: cards, error, loading } = useLoad(() => portalApi().reports({ ...filters, limit }), [filters, limit])

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h1 className="font-display text-2xl font-extrabold text-navy dark:text-ink">{t('portail.title')}</h1>
        <p className="max-w-2xl text-sm text-ink-muted">{t('portail.subtitle')}</p>
        <div className="flex flex-wrap gap-2">
          <Link to="/portail/signaler" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-cobalt px-4 text-sm font-semibold text-white hover:brightness-110">
            <Megaphone className="size-4" aria-hidden />
            {t('portail.cta.submit')}
          </Link>
          <Link to="/portail/signaler" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-cobalt hover:bg-canvas">
            {t('portail.cta.alreadyChecked')}
          </Link>
        </div>
      </section>

      <Card className="p-4">
        <form
          role="search"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end"
          onSubmit={(event) => {
            event.preventDefault()
            setLimit(PAGE)
            setFilters({ ...draft })
          }}
        >
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <label htmlFor="portal-query" className="text-sm font-semibold text-ink">{t('portail.filter.query')}</label>
            <Input id="portal-query" type="search" value={draft.query} onChange={(event) => setDraft({ ...draft, query: event.target.value })} placeholder={t('portail.filter.queryPlaceholder')} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="portal-verdict" className="text-sm font-semibold text-ink">{t('portail.filter.verdict')}</label>
            <select id="portal-verdict" className={PORTAL_SELECT} value={draft.verdict} onChange={(event) => setDraft({ ...draft, verdict: event.target.value as ReportFilters['verdict'] })}>
              <option value="">{t('portail.filter.all')}</option>
              {VERDICTS.map((verdict) => (
                <option key={verdict} value={verdict}>{t(`verdict.${verdict}`)}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="portal-theme" className="text-sm font-semibold text-ink">{t('portail.filter.theme')}</label>
            <Input id="portal-theme" value={draft.theme} onChange={(event) => setDraft({ ...draft, theme: event.target.value })} placeholder={t('portail.filter.themePlaceholder')} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="portal-region" className="text-sm font-semibold text-ink">{t('portail.filter.region')}</label>
            <select id="portal-region" className={PORTAL_SELECT} value={draft.region} onChange={(event) => setDraft({ ...draft, region: event.target.value })}>
              <option value="">{t('portail.filter.all')}</option>
              {MADAGASCAR_REGIONS.map((region) => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>
          <Button type="submit" className="sm:col-span-2 lg:col-span-1">
            <Search className="size-4" aria-hidden />
            {t('portail.filter.search')}
          </Button>
        </form>
      </Card>

      <section className="space-y-3" aria-live="polite">
        <h2 className="font-display text-base font-bold text-navy dark:text-ink">{filters.query || filters.verdict || filters.theme || filters.region ? t('portail.results') : t('portail.latest')}</h2>
        {error ? <FormMessage tone="error">{portalError(error)}</FormMessage> : null}
        {loading && !cards && <p className="text-sm text-ink-muted">{t('auth.loading')}</p>}
        {cards && cards.length === 0 && <Card className="p-4 text-sm text-ink-muted">{t('portail.noReports')}</Card>}
        <div className="grid gap-3 md:grid-cols-2">
          {cards?.map((card) => <ReportCardView key={card.public_id} card={card} />)}
        </div>
        {cards && cards.length === limit && (
          <Button variant="secondary" block onClick={() => setLimit(limit + PAGE)}>{t('portail.more')}</Button>
        )}
      </section>
      <HumanNotice />
    </div>
  )
}
