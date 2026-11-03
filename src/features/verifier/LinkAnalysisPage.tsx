import { Archive, ExternalLink, FileSearch, FileText, ImageUp, Search } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Badge, Button, Card, CaseStatusBadge, Input, Textarea } from '@/components/ui'
import { FormMessage } from '@/features/auth/FormMessage'
import { analyseApi, ServiceError, stateForServiceError, type FactCheckClaim, type LinkResult, type PageResult } from '@/lib/analyseApi'
import { linkFindings } from '@/lib/analysis/synthesis'
import { normalizeUrl } from '@/lib/analysis/url'
import type { StepResult } from '@/lib/analysis/types'
import { cn } from '@/lib/cn'
import type { ClueLevel } from '@/types/domain'
import { AttachToCase } from './AttachToCase'
import { BackToHub, type AnalysisOutcome } from './ImageAnalysisPage'
import { setPendingMedia } from './pendingMedia'
import { FactList, StepCard } from './StepCard'
import { SynthesisCard } from './SynthesisCard'
import { findCasesWithUrl, findSourceForUrl, isPersistenceAvailable, type CaseSummary, type SourceRecord } from './verificationApi'

/** Un domaine très récent est un signal classique de site opportuniste (section 7, M5). */
export function qualifyDomainAge(ageDays: number | null | undefined): ClueLevel | undefined {
  if (ageDays === null || ageDays === undefined) return undefined
  if (ageDays < 180) return 'to_examine'
  if (ageDays < 730) return 'weak'
  return 'none'
}

export function qualifySourceScore(score: number | null): ClueLevel | undefined {
  if (score === null) return undefined
  if (score < 4) return 'to_examine'
  if (score < 6.5) return 'weak'
  return 'none'
}

const NETWORK_NAMES: Record<string, string> = { facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', x: 'X (Twitter)', youtube: 'YouTube', whatsapp: 'WhatsApp' }

/** Motifs de refus d'une adresse par le service (protection des réseaux internes). */
const REJECTIONS = ['private_address', 'unsupported_port', 'unsupported_scheme', 'invalid_host', 'host_not_found', 'too_many_redirects'] as const
type Rejection = (typeof REJECTIONS)[number]

interface Existing {
  cases: CaseSummary[]
  claims: FactCheckClaim[]
  factcheckAvailable: boolean
}

/** M5 — Analyse d'un lien : domaine, HTTPS, hébergeur, annuaire des médias, vérifications existantes, archive. */
export function LinkAnalysisPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const [input, setInput] = useState(params.get('url') ?? '')
  const [invalid, setInvalid] = useState(false)
  const url = normalizeUrl(params.get('url') ?? '')

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const normalized = normalizeUrl(input)
    setInvalid(!normalized)
    if (normalized) setParams({ url: normalized })
  }

  return (
    <div className="space-y-4">
      <BackToHub />
      <Card className="p-4">
        <form onSubmit={submit} className="space-y-2">
          <label htmlFor="link-url" className="font-display text-sm font-bold text-navy dark:text-ink">
            {t('verifier.link.label')}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input id="link-url" inputMode="url" value={input} onChange={(event) => setInput(event.target.value)} placeholder="https://…" />
            <Button type="submit" className="shrink-0">
              <Search className="size-4" aria-hidden />
              {t('verifier.link.analyse')}
            </Button>
          </div>
          {invalid && <FormMessage tone="error">{t('verifier.link.invalid')}</FormMessage>}
        </form>
      </Card>
      {url && <LinkAnalysisView key={url} url={url} />}
    </div>
  )
}

interface LinkAnalysisViewProps {
  url: string
  /** Intégrée au dossier : pas de bouton « Ajouter à un dossier », résultat remonté à la fin. */
  embedded?: boolean
  onDone?: (outcome: AnalysisOutcome) => void
}

/** Rapport d'analyse d'un lien (page Vérifier, ou rapport d'analyse d'un dossier). */
export function LinkAnalysisView({ url, embedded = false, onDone }: LinkAnalysisViewProps) {
  const { t, i18n } = useTranslation()
  const [server, setServer] = useState<StepResult<LinkResult>>({ state: 'pending' })
  const [rejection, setRejection] = useState<Rejection | null>(null)
  const [source, setSource] = useState<StepResult<{ source: SourceRecord | null; reason?: 'no_database' }>>({ state: 'pending' })
  const [existing, setExisting] = useState<StepResult<Existing>>({ state: 'pending' })
  const [archive, setArchive] = useState<{ busy: boolean; url?: string; error?: boolean }>({ busy: false })
  const [page, setPage] = useState<StepResult<PageResult>>({ state: 'pending' })
  const [mediaBusy, setMediaBusy] = useState(false)
  const [mediaError, setMediaError] = useState(false)
  const navigate = useNavigate()

  // Date lue sur une page web : format libre, affichée telle quelle si elle n'est pas reconnue.
  const formatDate = (iso: string) => {
    const date = new Date(iso)
    return Number.isNaN(date.getTime()) ? iso : new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium' }).format(date)
  }
  const waybackDate = (stamp?: string) =>
    stamp ? formatDate(`${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}T00:00:00Z`) : ''

  const run = useCallback(async (target: string) => {
    setArchive({ busy: false })
    setRejection(null)
    const started = performance.now()
    setServer({ state: 'running' })
    setSource({ state: 'running' })
    setExisting({ state: 'running' })
    setPage({ state: 'running' })
    setMediaError(false)

    const serverTask = analyseApi
      .link(target)
      .then((data) => setServer({ state: 'done', data, tool: 'RDAP, Wayback Machine', durationMs: Math.round(performance.now() - started) }))
      .catch((error: unknown) => {
        const reason = error instanceof ServiceError ? REJECTIONS.find((item) => item === error.detail) : undefined
        if (reason) {
          setRejection(reason)
          setServer({ state: 'not_applicable' })
        } else {
          setServer({ state: stateForServiceError(error) })
        }
      })

    const sourceTask = (async () => {
      if (!isPersistenceAvailable()) return setSource({ state: 'not_applicable', data: { source: null, reason: 'no_database' } })
      if (!navigator.onLine) return setSource({ state: 'waiting_network' })
      try {
        const found = await findSourceForUrl(target)
        setSource({ state: 'done', clue: found ? qualifySourceScore(found.score) : undefined, data: { source: found }, tool: 'Annuaire MASO' })
      } catch {
        setSource({ state: 'unavailable' })
      }
    })()

    // Lecture de la page (titre, image, date) : sert aussi à chercher les vérifications par le titre.
    const pageTask = analyseApi
      .page(target)
      .then((data) => {
        setPage({ state: 'done', data, tool: data.tool })
        return data
      })
      .catch((error: unknown) => {
        setPage({ state: stateForServiceError(error) })
        return null
      })

    const existingTask = (async () => {
      if (!navigator.onLine) return setExisting({ state: 'waiting_network' })
      const noFactcheck = { available: false, claims: [] as FactCheckClaim[] }
      const [cases, byUrl, pageData] = await Promise.all([
        isPersistenceAvailable() ? findCasesWithUrl(target).catch(() => []) : Promise.resolve([]),
        analyseApi.factcheck(target).catch(() => noFactcheck),
        pageTask,
      ])
      const title = pageData && !pageData.blocked ? pageData.title?.trim() : null
      const byTitle = title && title.length >= 8 ? await analyseApi.factcheck(title.slice(0, 200), i18n.resolvedLanguage).catch(() => noFactcheck) : noFactcheck
      const claims = [...byUrl.claims, ...byTitle.claims].filter((claim, index, all) => all.findIndex((other) => other.url === claim.url) === index)
      const factcheck = { available: byUrl.available || byTitle.available, claims }
      setExisting({
        state: 'done',
        clue: cases.length || factcheck.claims.length ? 'to_examine' : 'none',
        data: { cases, claims: factcheck.claims, factcheckAvailable: factcheck.available },
        tool: factcheck.available ? 'Bibliothèque MASO, Google Fact Check Tools' : 'Bibliothèque MASO',
      })
    })()

    await Promise.all([serverTask, sourceTask, existingTask, pageTask])
  }, [i18n.resolvedLanguage])

  /** Analyse l'image de la page comme un fichier envoyé, avec son adresse publique (recherche inversée directe). */
  const analysePageImage = async (imageUrl: string) => {
    setMediaBusy(true)
    setMediaError(false)
    try {
      const file = await analyseApi.fetchMedia(imageUrl, 'image')
      setPendingMedia({ file, sourceUrl: imageUrl, origin: url })
      navigate('/verifier/image')
    } catch {
      setMediaError(true)
    } finally {
      setMediaBusy(false)
    }
  }

  useEffect(() => {
    void run(url)
  }, [url, run])

  const requestArchive = async () => {
    if (!url) return
    setArchive({ busy: true })
    try {
      const result = await analyseApi.archive(url)
      setArchive({ busy: false, url: result.archive_url, error: !result.archived })
    } catch {
      setArchive({ busy: false, error: true })
    }
  }

  const link = server.data
  const domainInfo = link?.domain.ok ? link.domain : null
  const hosting = link?.hosting.ok ? link.hosting : null
  const https = link?.https.ok ? link.https : null
  const latest = link?.archive.ok ? link.archive : null
  const serverSummary = rejection
    ? t(`verifier.link.rejected.${rejection}`)
    : server.state === 'waiting_network'
      ? t('verifier.summary.waitingNetwork')
      : server.state === 'unavailable'
        ? t('verifier.summary.unavailable')
        : undefined
  /** Une partie de l'analyse a échoué (registre ou archive injoignable) : on le dit, sans inventer de résultat. */
  const partFailed = (part: keyof Pick<LinkResult, 'https' | 'domain' | 'hosting' | 'archive'>) =>
    link && !link[part].ok ? t('verifier.link.partUnavailable') : undefined
  const archiveUrl = archive.url ?? (latest?.archived ? latest.archive_url : undefined)
  const knownSource = source.data?.source
  const running = [server.state, source.state, existing.state, page.state].some((state) => state === 'running' || state === 'pending')
  const findings = linkFindings({
    domain: domainInfo?.domain,
    ageDays: domainInfo?.available ? domainInfo.age_days : null,
    https: https ? https.https : null,
    source: knownSource ? { name: knownSource.name, score: knownSource.score } : null,
    sourceChecked: source.state === 'done' && source.data?.reason !== 'no_database',
    page: page.data
      ? { title: page.data.title, site: page.data.site_name, publishedAt: page.data.published_at && formatDate(page.data.published_at), social: page.data.social, blocked: page.data.blocked }
      : null,
    archived: latest?.archived ? { timestamp: waybackDate(latest.timestamp) } : null,
    cases: existing.data?.cases.map((item) => ({ title: item.title })),
  })
  // Fin de l'analyse : le résultat remonte au dossier, une fois.
  const reported = useRef(false)
  useEffect(() => {
    if (running || reported.current || !onDone) return
    reported.current = true
    onDone({
      findings,
      claims: existing.data?.claims ?? [],
      record: {
        version: 1,
        kind: 'link',
        url,
        analysed_at: new Date().toISOString(),
        server: server.data ?? null,
        page: page.data ?? null,
        directory: knownSource ? { id: knownSource.id, name: knownSource.name, score: knownSource.score } : null,
        existing: existing.data ?? null,
      },
    })
  }, [running, findings, existing.data, server.data, page.data, knownSource, url, onDone])

  return (
    <div className="space-y-4">
      {(
        <div className={cn('grid grid-cols-1 gap-4', !embedded && 'lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start')}>
          <div className="min-w-0 space-y-3">
          <SynthesisCard
            running={running}
            claims={existing.data?.claims}
            factcheckAvailable={existing.data ? existing.data.factcheckAvailable : true}
            unreadable={Boolean(page.data?.blocked)}
            findings={findings}
          />
          <ol className="space-y-3">
            <li>
              <StepCard
                index={1}
                title={t('verifier.link.step.page')}
                state={page.state}
                tool={page.tool}
                limits={t('verifier.limits.page')}
                summary={
                  page.state === 'waiting_network'
                    ? t('verifier.summary.waitingNetwork')
                    : page.state === 'unavailable'
                      ? t('verifier.summary.unavailable')
                      : page.data &&
                        (page.data.blocked
                          ? t('verifier.link.pageBlocked', { network: NETWORK_NAMES[page.data.social ?? ''] ?? page.data.social })
                          : page.data.title
                            ? page.data.title
                            : t('verifier.link.pageEmpty'))
                }
              >
                {page.data && !page.data.blocked && (
                  <div className="space-y-3">
                    {page.data.image && (
                      <img src={page.data.image} alt={t('verifier.link.pageImage')} className="max-h-56 w-full rounded-xl bg-canvas object-contain" loading="lazy" referrerPolicy="no-referrer" />
                    )}
                    <FactList
                      items={[
                        [t('verifier.link.pageTitle'), page.data.title],
                        [t('verifier.link.pageDescription'), page.data.description],
                        [t('verifier.link.pageSite'), page.data.site_name],
                        [t('verifier.link.pagePublished'), page.data.published_at && formatDate(page.data.published_at)],
                        [t('verifier.link.pageAuthor'), page.data.author],
                      ]}
                    />
                  </div>
                )}
                {page.data?.blocked && url && <BlockedPostHelp origin={url} />}
              </StepCard>
              {page.data && !page.data.blocked && (page.data.image || page.data.title || page.data.description) && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {page.data.image && (
                    <Button className="min-h-10 text-xs" disabled={mediaBusy} onClick={() => void analysePageImage(page.data!.image!)}>
                      <ImageUp className="size-4" aria-hidden />
                      {mediaBusy ? t('verifier.link.fetchingImage') : t('verifier.link.analyseImage')}
                    </Button>
                  )}
                  {(page.data.title || page.data.description) && (
                    <Link
                      to={`/verifier/texte?texte=${encodeURIComponent([page.data.title, page.data.description].filter(Boolean).join('\n'))}`}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-line px-3 text-xs font-semibold text-cobalt hover:bg-canvas"
                    >
                      <FileText className="size-4" aria-hidden />
                      {t('verifier.link.analyseText')}
                    </Link>
                  )}
                </div>
              )}
              {mediaError && <FormMessage tone="error">{t('verifier.link.imageFailed')}</FormMessage>}
            </li>
            <li>
              <StepCard
                index={2}
                title={t('verifier.link.step.https')}
                state={server.state}
                clue={https ? (https.https ? 'none' : 'weak') : undefined}
                limits={t('verifier.limits.https')}
                summary={serverSummary ?? partFailed('https') ?? (https && (https.https ? t('verifier.link.httpsYes') : t('verifier.link.httpsNo')))}
              />
            </li>
            <li>
              <StepCard
                index={3}
                title={t('verifier.link.step.domain')}
                state={server.state}
                clue={qualifyDomainAge(domainInfo?.age_days)}
                tool={link?.tools.domain}
                durationMs={server.durationMs}
                limits={t('verifier.limits.domain')}
                summary={
                  serverSummary ??
                  partFailed('domain') ??
                  (domainInfo &&
                    (domainInfo.available && domainInfo.age_days != null
                      ? t('verifier.link.domainAge', { domain: domainInfo.domain, count: domainInfo.age_days })
                      : t('verifier.link.domainUnknown')))
                }
              >
                {domainInfo?.available && (
                  <FactList
                    items={[
                      [t('verifier.link.domain'), domainInfo.domain],
                      [t('verifier.link.createdAt'), domainInfo.created_at && formatDate(domainInfo.created_at)],
                      [t('verifier.link.registrar'), domainInfo.registrar],
                    ]}
                  />
                )}
              </StepCard>
            </li>
            <li>
              <StepCard
                index={4}
                title={t('verifier.link.step.hosting')}
                state={server.state}
                tool={link?.tools.hosting}
                limits={t('verifier.limits.hosting')}
                summary={serverSummary ?? partFailed('hosting')}
              >
                {hosting && (
                  <FactList
                    items={[
                      [t('verifier.link.ip'), hosting.ip],
                      [t('verifier.link.host'), hosting.organization ?? hosting.network],
                      [t('verifier.link.country'), hosting.country],
                    ]}
                  />
                )}
              </StepCard>
            </li>
            <li>
              <StepCard
                index={5}
                title={t('verifier.link.step.directory')}
                state={source.state}
                clue={source.clue}
                tool={source.tool}
                limits={t('verifier.limits.directory')}
                summary={
                  source.data?.reason === 'no_database'
                    ? t('verifier.summary.needsDatabase')
                    : source.state === 'done' &&
                      (knownSource
                        ? t('verifier.link.sourceKnown', { name: knownSource.name, score: knownSource.score === null ? '—' : new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 1 }).format(knownSource.score) })
                        : t('verifier.link.sourceUnknown'))
                }
              >
                {knownSource?.verified && <Badge tone="success">{t('verifier.source.verified')}</Badge>}
              </StepCard>
            </li>
            <li>
              <StepCard
                index={6}
                title={t('verifier.link.step.existing')}
                state={existing.state}
                clue={existing.clue}
                tool={existing.tool}
                limits={t('verifier.limits.existing')}
                summary={
                  existing.data &&
                  (existing.data.cases.length || existing.data.claims.length
                    ? t('verifier.link.existingFound', { count: existing.data.cases.length + existing.data.claims.length })
                    : t('verifier.link.existingNone'))
                }
              >
                {existing.data && (
                  <ul className="space-y-1.5 text-xs">
                    {existing.data.cases.map((item) => (
                      <li key={item.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-canvas px-3 py-2">
                        <span className="min-w-0 flex-1 font-semibold text-ink">{item.title}</span>
                        <CaseStatusBadge status={item.status} />
                      </li>
                    ))}
                    {existing.data.claims.map((claim, index) => (
                      <li key={`${claim.url}-${index}`} className="rounded-xl bg-canvas px-3 py-2">
                        <a href={claim.url ?? '#'} target="_blank" rel="noreferrer" className="font-semibold text-cobalt hover:underline">
                          {claim.publisher} : {claim.rating}
                        </a>
                        <p className="text-ink-muted">{claim.text}</p>
                      </li>
                    ))}
                    {!existing.data.factcheckAvailable && <li className="text-ink-muted">{t('verifier.link.factcheckOff')}</li>}
                  </ul>
                )}
              </StepCard>
            </li>
            <li>
              <StepCard
                index={7}
                title={t('verifier.link.step.archive')}
                state={server.state}
                tool={link?.tools.archive}
                limits={t('verifier.limits.archive')}
                summary={
                  serverSummary ??
                  partFailed('archive') ??
                  (latest && (latest.archived ? t('verifier.link.archived', { date: waybackDate(latest.timestamp) }) : t('verifier.link.notArchived')))
                }
              >
                <div className="flex flex-wrap items-center gap-2">
                  {archiveUrl && (
                    <a href={archiveUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-cobalt">
                      <ExternalLink className="size-3.5" aria-hidden />
                      {t('verifier.link.openArchive')}
                    </a>
                  )}
                  <Button variant="secondary" className="min-h-10 text-xs" disabled={archive.busy} onClick={() => void requestArchive()}>
                    <Archive className="size-3.5" aria-hidden />
                    {archive.busy ? t('verifier.link.archiving') : t('verifier.link.archiveNow')}
                  </Button>
                </div>
                {archive.url && <p className="mt-1 text-xs text-success">{t('verifier.link.archiveDone')}</p>}
                {archive.error && <p className="mt-1 text-xs text-danger">{t('verifier.link.archiveFailed')}</p>}
              </StepCard>
            </li>
          </ol>
          </div>

          <div className="space-y-4">
            {isPersistenceAvailable() && source.state === 'done' && (
              <Card className="p-4">
                <p className="font-display text-sm font-bold text-navy dark:text-ink">{t('verifier.source.title')}</p>
                <p className="mb-3 mt-1 text-xs text-ink-muted">{t('verifier.source.fromLinkHint')}</p>
                <Link
                  to={knownSource ? `/verifier/sources/${knownSource.id}` : `/verifier/sources/nouvelle?url=${encodeURIComponent(url)}`}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-line text-sm font-semibold text-cobalt hover:bg-canvas"
                >
                  <FileSearch className="size-4" aria-hidden />
                  {knownSource ? t('verifier.source.open') : t('verifier.source.create')}
                </Link>
              </Card>
            )}
            {!embedded && <AttachToCase
              evidence={(origin) => ({
type: 'link',
                  url,
                  archiveUrl: archiveUrl ?? null,
                  origin: origin || null,
                  analysis: {
                    version: 1,
                    kind: 'link',
                    analysed_at: new Date().toISOString(),
                    server: server.data ?? null,
                    directory: knownSource ? { id: knownSource.id, name: knownSource.name, score: knownSource.score } : null,
                    existing: existing.data ?? null,
                  },
                })}
            />}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Publication cachée par le réseau social (connexion exigée) : le journaliste apporte lui-même le contenu
 * — texte copié, capture d'écran, image ou vidéo enregistrée — et l'analyse continue sur ce contenu réel.
 */
function BlockedPostHelp({ origin }: { origin: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')

  const pick = (file: File | undefined) => {
    if (!file) return
    setPendingMedia({ file, origin })
    navigate(file.type.startsWith('video/') ? '/verifier/video' : '/verifier/image')
  }

  return (
    <div className="space-y-3 rounded-xl bg-canvas p-3">
      <p className="text-sm font-semibold text-ink">{t('verifier.link.blocked.title')}</p>
      <div className="space-y-2">
        <label htmlFor="blocked-text" className="text-xs font-bold text-ink">{t('verifier.link.blocked.textLabel')}</label>
        <Textarea id="blocked-text" rows={4} value={text} onChange={(event) => setText(event.target.value)} placeholder={t('verifier.link.blocked.textPlaceholder')} />
        <Button className="min-h-10 text-xs" disabled={text.trim().length < 10} onClick={() => navigate(`/verifier/texte?texte=${encodeURIComponent(text.trim().slice(0, 4000))}`)}>
          <FileText className="size-4" aria-hidden />
          {t('verifier.link.blocked.analyseText')}
        </Button>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-bold text-ink">{t('verifier.link.blocked.fileLabel')}</p>
        <input ref={fileRef} type="file" accept="image/*,video/*" className="sr-only" aria-label={t('verifier.link.blocked.fileLabel')} onChange={(event) => pick(event.target.files?.[0])} />
        <Button variant="secondary" className="min-h-10 text-xs" onClick={() => fileRef.current?.click()}>
          <ImageUp className="size-4" aria-hidden />
          {t('verifier.link.blocked.pickFile')}
        </Button>
      </div>
      <p className="whitespace-pre-line text-xs text-ink-muted">{t('verifier.link.socialHelp')}</p>
    </div>
  )
}
