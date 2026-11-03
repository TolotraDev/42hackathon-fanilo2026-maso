import { BadgeCheck, ChevronRight, FileSearch, ImageUp, Megaphone, QrCode, Search, ShieldCheck, SlidersHorizontal, UserCheck, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button, Card, Input } from '@/components/ui'
import { FormMessage } from '@/features/auth/FormMessage'
import { cn } from '@/lib/cn'
import { MADAGASCAR_REGIONS } from '@/lib/regions'
import { VERDICTS, type Verdict } from '@/types/domain'
import { HumanNotice, ReportCardView, usePortalError } from './components'
import { portalApi } from './portalApi'
import type { ReportFilters } from './types'
import { useLoad } from './useLoad'

export const PORTAL_SELECT = 'min-h-11 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink focus:border-cobalt focus:outline-none'
const PAGE = 12

const QUICK_ACTIONS: { to: string; key: 'submit' | 'track' | 'verify'; icon: LucideIcon }[] = [
  { to: '/portail/signaler', key: 'submit', icon: Megaphone },
  { to: '/portail/suivi', key: 'track', icon: FileSearch },
  { to: '/portail/verifier', key: 'verify', icon: QrCode },
]

const QUICK_VERDICTS: { verdict: Verdict; dot: string }[] = [
  { verdict: 'false', dot: 'bg-[#D64545]' },
  { verdict: 'misleading', dot: 'bg-[#E3A21A]' },
  { verdict: 'out_of_context', dot: 'bg-[#E3A21A]' },
  { verdict: 'confirmed', dot: 'bg-[#2E9E5B]' },
]

const HOW_STEPS: { key: 'report' | 'check' | 'publish'; icon: LucideIcon }[] = [
  { key: 'report', icon: Megaphone },
  { key: 'check', icon: UserCheck },
  { key: 'publish', icon: BadgeCheck },
]

/** W0 — Accueil de l'espace public : derniers rapports publiés, recherche par mot-clé, verdict, thème, région. */
export function PortalHomePage() {
  const { t } = useTranslation()
  const portalError = usePortalError()
  const [draft, setDraft] = useState<ReportFilters>({ query: '', verdict: '', theme: '', region: '' })
  const [filters, setFilters] = useState<ReportFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [limit, setLimit] = useState(PAGE)
  const { data: cards, error, loading } = useLoad(() => portalApi().reports({ ...filters, limit }), [filters, limit])
  const filtered = Boolean(filters.query || filters.verdict || filters.theme || filters.region)
  const activeFilters = [draft.verdict, draft.theme, draft.region].filter(Boolean).length

  const apply = (event: React.FormEvent) => {
    event.preventDefault()
    setLimit(PAGE)
    setFilters({ ...draft })
  }

  const pickVerdict = (verdict: ReportFilters['verdict']) => {
    const next = { ...draft, verdict }
    setDraft(next)
    setLimit(PAGE)
    setFilters(next)
  }

  return (
    <div className="space-y-6">
      {/* Bandeau d'accueil : bleu marine uni de la charte, anneaux décoratifs et parcours en 3 étapes. */}
      <section className="dashboard-rise relative overflow-hidden rounded-3xl bg-[#0A2F4F] text-white shadow-[0_18px_32px_rgba(10,47,79,0.22)]">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full border-[36px] border-white/[0.04]" />
        <div aria-hidden className="pointer-events-none absolute -right-6 -top-6 size-28 rounded-full border-[14px] border-[#1976D2]/25" />
        <div aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-[#1976D2]" />

        <div className="relative grid gap-8 px-5 py-7 sm:px-9 sm:py-10 lg:grid-cols-[1.35fr_1fr] lg:items-center">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1976D2] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-[0_6px_14px_rgba(25,118,210,0.35)]">
              <ShieldCheck className="size-3.5" aria-hidden />
              {t('portail.kicker')}
            </span>
            <div className="space-y-3">
              <h1 className="font-display text-[26px] font-extrabold leading-tight sm:text-4xl">{t('portail.heroTitle')}</h1>
              <span aria-hidden className="block h-1 w-14 rounded-full bg-[#1976D2]" />
              <p className="max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">{t('portail.heroSubtitle')}</p>
            </div>

            {/* Recherche : une seule barre blanche, le bouton est intégré. */}
            <form
              role="search"
              onSubmit={apply}
              className="flex items-center gap-1 rounded-2xl bg-white p-1.5 shadow-[0_12px_24px_rgba(0,0,0,0.18)] focus-within:ring-4 focus-within:ring-[#1976D2]/40"
            >
              <label htmlFor="portal-query" className="sr-only">{t('portail.filter.query')}</label>
              <Search className="ml-2.5 size-5 shrink-0 text-[#5B6B7B]" aria-hidden />
              <input
                id="portal-query"
                type="search"
                value={draft.query}
                onChange={(event) => setDraft({ ...draft, query: event.target.value })}
                placeholder={t('portail.filter.queryPlaceholder')}
                className="min-h-11 min-w-0 flex-1 bg-transparent px-1.5 text-sm text-[#14212E] placeholder:text-[#5B6B7B] focus:outline-none"
              />
              <button
                type="submit"
                aria-label={t('portail.filter.search')}
                className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-[#1976D2] px-3.5 text-sm font-semibold text-white transition hover:brightness-110 sm:px-5"
              >
                <Search className="size-4 sm:hidden" aria-hidden />
                <span className="hidden sm:inline">{t('portail.filter.search')}</span>
              </button>
            </form>

            {/* Accès rapide par verdict : un clic filtre directement les rapports. */}
            <div className="-mt-1 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-white/55">{t('portail.quickVerdicts')}</span>
              {QUICK_VERDICTS.map(({ verdict, dot }) => {
                const active = filters.verdict === verdict
                return (
                  <button
                    key={verdict}
                    type="button"
                    aria-pressed={active}
                    onClick={() => pickVerdict(active ? '' : verdict)}
                    className={cn(
                      'inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition',
                      active ? 'bg-white text-[#0A2F4F]' : 'bg-white/[0.08] text-white/85 ring-1 ring-white/15 hover:bg-white/15 hover:text-white',
                    )}
                  >
                    <span className={cn('size-2 rounded-full', dot)} aria-hidden />
                    {t(`verdict.${verdict}`)}
                  </button>
                )
              })}
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              <Link
                to="/portail/signaler"
                className="group flex items-center gap-3 rounded-2xl bg-white p-3 text-[#0A2F4F] shadow-[0_10px_20px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#1976D2] text-white">
                  <Megaphone className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{t('portail.cta.submit')}</span>
                  <span className="block text-xs leading-snug text-[#5B6B7B]">{t('portail.cta.submitHint')}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-[#1976D2] transition group-hover:translate-x-0.5" aria-hidden />
              </Link>
              <Link
                to="/portail/signaler"
                className="group flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3 text-white ring-1 ring-white/15 transition hover:-translate-y-0.5 hover:bg-white/10"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                  <ImageUp className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{t('portail.cta.checkTitle')}</span>
                  <span className="block text-xs leading-snug text-white/60">{t('portail.cta.checkHint')}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-white/70 transition group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </div>
          </div>

          {/* Parcours d'un signalement : rappelle qu'un humain décide à chaque étape. */}
          <div className="hidden rounded-2xl bg-white/[0.06] p-5 ring-1 ring-white/10 sm:block">
            <h2 id="portal-how" className="mb-4 text-[11px] font-bold uppercase tracking-wider text-white/60">{t('portail.how.title')}</h2>
            <ol aria-labelledby="portal-how">
            {HOW_STEPS.map(({ key, icon: Icon }, index) => (
              <li key={key} className="relative flex gap-3 pb-5 last:pb-0">
                {index < HOW_STEPS.length - 1 && <span aria-hidden className="absolute left-5 top-11 h-[calc(100%-2.75rem)] w-px bg-white/15" />}
                <span
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-full',
                    index === HOW_STEPS.length - 1 ? 'bg-[#2E9E5B] text-white' : 'bg-[#1976D2] text-white',
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 pt-0.5">
                  <span className="block text-sm font-bold text-white">{t(`portail.how.${key}.title`)}</span>
                  <span className="block text-xs leading-relaxed text-white/65">{t(`portail.how.${key}.text`)}</span>
                </span>
              </li>
            ))}
            </ol>
          </div>
        </div>
      </section>

      <section aria-labelledby="portal-quick" className="space-y-3">
        <h2 id="portal-quick" className="font-display text-sm font-bold uppercase tracking-wide text-navy dark:text-ink">{t('portail.quick.title')}</h2>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {QUICK_ACTIONS.map(({ to, key, icon: Icon }, index) => (
            <Link
              key={key}
              to={to}
              style={{ '--i': index + 1 } as React.CSSProperties}
              className="dashboard-rise group flex flex-col items-center gap-2 rounded-2xl border border-line bg-surface p-3 text-center shadow-[0_1px_3px_rgb(10_47_79/0.06)] transition hover:-translate-y-0.5 hover:border-cobalt hover:shadow-[0_12px_24px_rgba(10,47,79,0.10)] sm:flex-row sm:items-start sm:gap-3 sm:p-4 sm:text-left dark:border-white/10 dark:bg-[#0F2C46]"
            >
              <span
                className={cn(
                  'flex size-11 shrink-0 items-center justify-center rounded-full transition',
                  key === 'submit' ? 'bg-cobalt text-white shadow-[0_8px_16px_rgba(25,118,210,0.30)]' : 'bg-cobalt/10 text-cobalt dark:bg-white/10 dark:text-white',
                )}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-ink sm:text-sm dark:text-white">{t(`portail.link.${key}`)}</span>
                <span className="mt-0.5 hidden text-xs text-ink-muted sm:block dark:text-white/65">{t(`portail.quick.${key}`)}</span>
              </span>
              <ChevronRight className="hidden size-4 shrink-0 self-center text-ink-muted transition group-hover:translate-x-0.5 group-hover:text-cobalt sm:block" aria-hidden />
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3" aria-live="polite">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-base font-bold text-navy dark:text-ink">{filtered ? t('portail.results') : t('portail.latest')}</h2>
          <button
            type="button"
            aria-expanded={showFilters}
            aria-controls="portal-filters"
            onClick={() => setShowFilters((value) => !value)}
            className={cn(
              'inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition',
              showFilters || activeFilters
                ? 'border-cobalt bg-cobalt/10 text-cobalt dark:text-white'
                : 'border-line bg-surface text-ink hover:border-cobalt dark:border-white/10 dark:bg-[#0F2C46] dark:text-white',
            )}
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            {t('portail.filters')}
            {activeFilters > 0 && <span className="flex size-5 items-center justify-center rounded-full bg-cobalt text-[11px] text-white">{activeFilters}</span>}
          </button>
        </div>

        {showFilters && (
          <Card id="portal-filters" className="dashboard-fade p-4 dark:border-white/10 dark:bg-[#0F2C46]">
            <form className="grid gap-3 sm:grid-cols-3 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end" onSubmit={apply}>
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
              <Button type="submit" className="sm:col-span-3 lg:col-span-1">
                <Search className="size-4" aria-hidden />
                {t('portail.filter.search')}
              </Button>
            </form>
          </Card>
        )}

        {error ? <FormMessage tone="error">{portalError(error)}</FormMessage> : null}
        {loading && !cards && (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3" aria-hidden>
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-44 animate-pulse rounded-2xl bg-line/70 dark:bg-white/5" />
            ))}
          </div>
        )}
        {cards && cards.length === 0 && <Card className="p-6 text-center text-sm text-ink-muted dark:border-white/10 dark:bg-[#0F2C46]">{t('portail.noReports')}</Card>}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {cards?.map((card, index) => (
            <div key={card.public_id} className="dashboard-rise" style={{ '--i': Math.min(index, 8) } as React.CSSProperties}>
              <ReportCardView card={card} />
            </div>
          ))}
        </div>
        {cards && cards.length === limit && (
          <Button variant="secondary" block onClick={() => setLimit(limit + PAGE)}>{t('portail.more')}</Button>
        )}
      </section>
      <HumanNotice />
    </div>
  )
}
