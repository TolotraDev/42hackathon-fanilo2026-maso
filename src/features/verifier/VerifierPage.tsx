import { FileText, Image, Link2, LoaderCircle, Search, Server, Video, type LucideIcon } from 'lucide-react'
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
    { id: 'text', icon: FileText },
  ]

  const resultCount = results ? results.library.length + results.claims.length : 0

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
      <div className="space-y-4">
        <Card className="p-4">
          <form onSubmit={(event) => void search(event)} className="space-y-3">
            <label htmlFor="claim" className="block font-display text-sm font-bold text-navy dark:text-ink">
              {t('verifier.claimLabel')}
            </label>
            <Input id="claim" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('verifier.claimPlaceholder')} />
            <Button type="submit" block disabled={query.trim().length < 3 || searching || !online}>
              {searching ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Search className="size-4" aria-hidden />}
              {t('verifier.searchExisting')}
            </Button>
            {!online && <p className="text-xs text-ink-muted">{t('verifier.summary.waitingNetwork')}</p>}
          </form>

          {results && (
            <div className="mt-4 space-y-2" aria-live="polite">
              <p className="text-sm font-semibold text-ink">{t('verifier.existingResults', { count: resultCount })}</p>
              <ul className="space-y-1.5 text-xs">
                {results.library.map((hit) => (
                  <li key={hit.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-canvas px-3 py-2">
                    <span className="min-w-0 flex-1 font-semibold text-ink">{hit.title}</span>
                    <CaseStatusBadge status={hit.status} />
                    {hit.verdict && <VerdictBadge verdict={hit.verdict} />}
                  </li>
                ))}
                {results.claims.map((claim, index) => (
                  <li key={`${claim.url}-${index}`} className="rounded-xl bg-canvas px-3 py-2">
                    <a href={claim.url ?? '#'} target="_blank" rel="noreferrer" className="font-semibold text-cobalt hover:underline">
                      {claim.publisher} : {claim.rating}
                    </a>
                    <p className="text-ink-muted">{claim.text}</p>
                  </li>
                ))}
              </ul>
              {resultCount === 0 && <p className="text-xs text-ink-muted">{t('verifier.noExisting')}</p>}
              {!results.factcheckAvailable && <p className="text-xs text-ink-muted">{t('verifier.link.factcheckOff')}</p>}
            </div>
          )}
        </Card>

        <section>
          <SectionTitle>{t('verifier.importTitle')}</SectionTitle>
          <div className="grid grid-cols-4 gap-2">
            {entries.map(({ id, icon: Icon, action }) => (
              <button
                key={id}
                type="button"
                onClick={action}
                disabled={!action}
                className="flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-2xl border border-line bg-surface px-1 py-3 text-xs font-semibold text-ink shadow-[0_1px_3px_rgb(10_47_79/0.06)] transition hover:border-cobalt disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-cobalt/10 text-cobalt">
                  <Icon className="size-5" aria-hidden />
                </span>
                {t(`verifier.input.${id}`)}
                {!action && <span className="text-[10px] font-medium text-ink-muted">{t('verifier.soon')}</span>}
              </button>
            ))}
          </div>
          <input ref={imageInput} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={(event) => openMedia(event.target.files, '/verifier/image')} />
          <input ref={videoInput} type="file" accept="video/*" className="sr-only" tabIndex={-1} aria-hidden onChange={(event) => openMedia(event.target.files, '/verifier/video')} />
        </section>

        <Card className="flex items-start gap-3 p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cobalt/10 text-cobalt">
            <Server className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink">{t('verifier.service.title')}</p>
              <Badge tone={health.state === 'ok' ? 'success' : health.state === 'off' ? 'warning' : 'neutral'}>
                {t(`verifier.service.${health.state}`)}
              </Badge>
            </div>
            <p className="text-xs text-ink-muted">
              {health.state === 'off' ? t('verifier.service.offHint') : t('verifier.service.localHint')}
            </p>
            {health.state === 'ok' && (
              <ul className="flex flex-wrap gap-1.5">
                {(['provenance', 'video', 'link', 'factcheck', 'ai_clue'] as const).map((capability) => (
                  <li key={capability}>
                    <Badge tone={health.capabilities[capability] ? 'info' : 'neutral'}>
                      {t(`verifier.service.capability.${capability}`)} : {health.capabilities[capability] ? t('verifier.service.on') : t('verifier.service.notConfigured')}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <SectionTitle>{t('verifier.verdictScale')}</SectionTitle>
        <p className="mb-3 text-xs text-ink-muted">{t('verifier.verdictScaleHint')}</p>
        <ul className="divide-y divide-line">
          {VERDICTS.map((verdict) => (
            <li key={verdict} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-start sm:gap-3">
              <span className="sm:w-36 sm:shrink-0">
                <VerdictBadge verdict={verdict} />
              </span>
              <span className="text-sm text-ink">{t(`verdictDefinition.${verdict}`)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
