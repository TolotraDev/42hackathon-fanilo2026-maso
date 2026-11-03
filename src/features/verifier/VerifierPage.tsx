import { FileText, Image, Link2, LoaderCircle, Search, Server, Video, ArrowRight, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card, CaseStatusBadge, Input, SectionTitle, VerdictBadge } from '@/components/ui'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { analyseApi, type FactCheckClaim } from '@/lib/analyseApi'
import { VERDICTS, type Language } from '@/types/domain'
import { setPendingMedia } from './pendingMedia'
import { isPersistenceAvailable, searchLibrary, type CaseSummary } from './verificationApi'

type LibraryHit = CaseSummary & { verdict: (typeof VERDICTS)[number] | null }

interface SearchResults {
  library: LibraryHit[]
  claims: FactCheckClaim[]
  factcheckAvailable: boolean
}

type Health = { state: 'checking' } | { state: 'ok'; capabilities: Record<string, boolean> } | { state: 'off' }

/** M3 — Hub Vérifier : vérifications existantes, import d'une image, d'une vidéo ou d'un lien. */
export function VerifierPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const online = useOnlineStatus()
  const imageInput = useRef<HTMLInputElement>(null)
  const videoInput = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<SearchResults | null>(null)
  const [health, setHealth] = useState<Health>({ state: 'checking' })

  useEffect(() => {
    analyseApi
      .health()
      .then((body) => setHealth({ state: 'ok', capabilities: body.capabilities }))
      .catch(() => setHealth({ state: 'off' }))
  }, [online])

  const search = async (event: React.FormEvent) => {
    event.preventDefault()
    if (query.trim().length < 3) return
    setSearching(true)
    const language = (i18n.resolvedLanguage ?? 'fr') as Language
    const [library, factcheck] = await Promise.all([
      isPersistenceAvailable() ? searchLibrary(query).catch(() => []) : Promise.resolve([]),
      analyseApi.factcheck(query.trim(), language).catch(() => ({ available: false, claims: [] as FactCheckClaim[] })),
    ])
    setResults({ library, claims: factcheck.claims, factcheckAvailable: factcheck.available })
    setSearching(false)
  }

  const openMedia = (files: FileList | null, path: string) => {
    const file = files?.[0]
    if (!file) return
    setPendingMedia({ file })
    navigate(path)
  }

  const entries: Array<{ id: 'image' | 'video' | 'link' | 'text'; icon: LucideIcon; action?: () => void }> = [
    { id: 'image', icon: Image, action: () => imageInput.current?.click() },
    { id: 'video', icon: Video, action: () => videoInput.current?.click() },
    { id: 'link', icon: Link2, action: () => navigate('/verifier/lien') },
    { id: 'text', icon: FileText, action: () => navigate('/verifier/texte') },
  ]

  const resultCount = results ? results.library.length + results.claims.length : 0

  const healthTone = health.state === 'ok' ? 'success' : health.state === 'off' ? 'warning' : 'neutral'

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px] lg:items-start">
      {/* Colonne principale */}
      <div className="min-w-0 space-y-4">
        {/* Recherche */}
        <Card className="dashboard-rise overflow-hidden" style={{ ['--i' as string]: 0 }}>
          <div className="border-b border-line px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
              {t('verifier.searchExisting')}
            </p>
            <h2 className="mt-0.5 font-display text-base font-bold text-navy dark:text-ink">
              {t('verifier.claimLabel')}
            </h2>
          </div>
          <form onSubmit={(event) => void search(event)} className="space-y-3 p-4">
            <Input
              id="claim"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('verifier.claimPlaceholder')}
            />
            <Button type="submit" block disabled={query.trim().length < 3 || searching || !online}>
              {searching ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
              ) : (
                <Search className="size-4" aria-hidden />
              )}
              {t('verifier.searchExisting')}
            </Button>
            {!online && <p className="text-xs text-ink-muted">{t('verifier.summary.waitingNetwork')}</p>}
          </form>

          {results && (
            <div className="border-t border-line px-4 py-3" aria-live="polite">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
                {t('verifier.existingResults', { count: resultCount })}
              </p>
              {resultCount === 0 ? (
                <p className="text-xs italic text-ink-muted">{t('verifier.noExisting')}</p>
              ) : (
                <ul className="divide-y divide-line">
                  {results.library.map((hit, index) => (
                    <li key={hit.id} className="dashboard-fade" style={{ ['--i' as string]: index }}>
                      <div className="row-link flex min-h-11 items-center gap-2 py-2">
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{hit.title}</span>
                        <CaseStatusBadge status={hit.status} />
                        {hit.verdict && <VerdictBadge verdict={hit.verdict} />}
                        <ArrowRight className="row-arrow size-4 shrink-0 text-ink-muted" aria-hidden />
                      </div>
                    </li>
                  ))}
                  {results.claims.map((claim, index) => (
                    <li
                      key={`${claim.url}-${index}`}
                      className="dashboard-fade py-2"
                      style={{ ['--i' as string]: results.library.length + index }}
                    >
                      <a
                        href={claim.url ?? '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="group/claim block"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">
                            {claim.publisher}
                          </span>
                          <span aria-hidden className="text-ink-muted">·</span>
                          <span className="text-xs font-semibold text-cobalt group-hover/claim:underline">
                            {claim.rating}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 border-l-2 border-line pl-2 text-xs text-ink-muted">
                          {claim.text}
                        </p>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              {!results.factcheckAvailable && (
                <p className="mt-2 text-xs italic text-ink-muted">{t('verifier.link.factcheckOff')}</p>
              )}
            </div>
          )}
        </Card>

        {/* Import */}
        <section className="dashboard-rise" style={{ ['--i' as string]: 1 }}>
          <SectionTitle>{t('verifier.importTitle')}</SectionTitle>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {entries.map(({ id, icon: Icon, action }) => (
              <button
                key={id}
                type="button"
                onClick={action}
                disabled={!action}
                className="shortcut-link flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-surface px-2 py-3 text-xs font-semibold text-ink transition-colors hover:border-cobalt hover:text-cobalt disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="shortcut-icon flex size-10 items-center justify-center rounded-xl bg-cobalt/10 text-cobalt">
                  <Icon className="size-5" aria-hidden />
                </span>
                {t(`verifier.input.${id}`)}
                {!action && (
                  <span className="text-[10px] font-medium text-ink-muted">{t('verifier.soon')}</span>
                )}
              </button>
            ))}
          </div>
          <input
            ref={imageInput}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(event) => openMedia(event.target.files, '/verifier/image')}
          />
          <input
            ref={videoInput}
            type="file"
            accept="video/*"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(event) => openMedia(event.target.files, '/verifier/video')}
          />
        </section>

        {/* Statut du service */}
        <Card
          className="indicator-card dashboard-rise relative overflow-hidden"
          style={{ ['--i' as string]: 2 }}
        >
          <span
            aria-hidden
            className={`tone-bar absolute inset-y-0 left-0 w-1 ${
              health.state === 'ok' ? 'bg-success' : health.state === 'off' ? 'bg-warning' : 'bg-line'
            }`}
          />
          <div className="flex items-start gap-3 p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cobalt/10 text-cobalt">
              <Server className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink">{t('verifier.service.title')}</p>
                <Badge tone={healthTone}>
                  <span className="flex items-center gap-1.5">
                    {health.state === 'checking' && (
                      <span className="notif-dot-unread size-1.5 rounded-full bg-current" aria-hidden />
                    )}
                    {t(`verifier.service.${health.state}`)}
                  </span>
                </Badge>
              </div>
              <p className="text-xs text-ink-muted">
                {health.state === 'off' ? t('verifier.service.offHint') : t('verifier.service.localHint')}
              </p>
              {health.state === 'ok' && (
                <ul className="flex flex-wrap gap-1.5 pt-1">
                  {(['provenance', 'video', 'link', 'factcheck', 'ai_clue'] as const).map((capability) => (
                    <li key={capability}>
                      <Badge tone={health.capabilities[capability] ? 'info' : 'neutral'}>
                        {t(`verifier.service.capability.${capability}`)} :{' '}
                        {health.capabilities[capability]
                          ? t('verifier.service.on')
                          : t('verifier.service.notConfigured')}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Option 1 : Grille 2x2 compacte */}
      <aside className="lg:sticky lg:top-4">
        <Card className="dashboard-rise p-4" style={{ ['--i' as string]: 0 }}>
          <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-muted">
              {t('verifier.verdictScale')}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">
              {t('verifier.verdictScaleHint')}
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {VERDICTS.map((verdict, index) => (
              <div
                key={verdict}
                className="dashboard-fade flex flex-col gap-2 rounded-xl border border-line bg-canvas/30 p-3 transition-colors hover:bg-canvas/60"
                style={{ ['--i' as string]: index }}
              >
                <VerdictBadge verdict={verdict} />
                <p className="text-[11px] leading-snug text-ink-muted">
                  {t(`verdictDefinition.${verdict}`)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </aside>
    </div>
  )
}