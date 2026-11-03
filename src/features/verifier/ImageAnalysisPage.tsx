import { ArrowLeft, ExternalLink, Map as MapIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Card, CaseStatusBadge, Textarea, VerdictBadge } from '@/components/ui'
import { analyseApi, type FactCheckClaim } from '@/lib/analyseApi'
import { reverseSearchLinks } from '@/lib/analysis/reverseSearch'
import { imageFindings } from '@/lib/analysis/synthesis'
import { AttachToCase } from './AttachToCase'
import { FileDrop } from './FileDrop'
import { SynthesisCard } from './SynthesisCard'
import { takePendingMedia } from './pendingMedia'
import { FactList, StepCard } from './StepCard'
import { useImageAnalysis, type ImageSteps } from './useImageAnalysis'
import { emptyVisualChecklist, VisualChecklist } from './VisualChecklist'

const formatBytes = (bytes: number) =>
  bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} Mo` : `${Math.max(1, Math.round(bytes / 1024))} Ko`

/** Résumé d'une étape qui n'a pas pu s'exécuter. */
function useStateSummary() {
  const { t } = useTranslation()
  return (state: string) =>
    state === 'waiting_network' ? t('verifier.summary.waitingNetwork') : state === 'unavailable' ? t('verifier.summary.unavailable') : null
}

/** Copie de l'analyse enregistrée avec la preuve (sans la carte ELA, trop volumineuse). */
function analysisRecord(steps: ImageSteps, extra: Record<string, unknown>) {
  const { recompression, ...others } = steps
  const strip = ({ state, clue, data, tool, durationMs }: ImageSteps[keyof ImageSteps]) => ({ state, clue, data, tool, durationMs })
  return {
    version: 1,
    kind: 'image',
    analysed_at: new Date().toISOString(),
    steps: {
      ...Object.fromEntries(Object.entries(others).map(([id, step]) => [id, strip(step)])),
      recompression: { ...strip(recompression), data: recompression.data ? { ratio: recompression.data.ratio } : undefined },
    },
    ...extra,
  }
}

/** M4 — Analyse d'image : étapes de la section 9 en direct, checklist visuelle, ajout au dossier. */
export function ImageAnalysisPage() {
  const { t, i18n } = useTranslation()
  const [media, setMedia] = useState(() => takePendingMedia())
  const file = media?.file ?? null
  const { steps, finished } = useImageAnalysis(file)
  const sourceUrl = media?.sourceUrl ?? null
  // Vérifications déjà publiées sur la même image (possible quand l'image a une adresse publique).
  const [published, setPublished] = useState<{ url: string; claims: FactCheckClaim[]; available: boolean } | null>(null)
  useEffect(() => {
    if (!sourceUrl) return
    let cancelled = false
    analyseApi
      .factcheckImage(sourceUrl, i18n.resolvedLanguage)
      .then((result) => !cancelled && setPublished({ url: sourceUrl, claims: result.claims, available: result.available }))
      .catch(() => !cancelled && setPublished({ url: sourceUrl, claims: [], available: false }))
    return () => {
      cancelled = true
    }
  }, [sourceUrl, i18n.resolvedLanguage])
  const stateSummary = useStateSummary()
  const [showMap, setShowMap] = useState(false)
  const [visual, setVisual] = useState(emptyVisualChecklist)
  const [foundLinks, setFoundLinks] = useState('')
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  const engines = reverseSearchLinks(media?.sourceUrl ?? null)
  const reception = steps.reception.data
  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))

  if (!file) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <BackToHub />
        <FileDrop kind="image" onFile={(picked) => setMedia({ file: picked })} />
      </div>
    )
  }

  const meta = steps.metadata.data
  const provenance = steps.provenance.data
  const matches = steps.already_seen.data?.matches ?? []
  const rejected = reception?.rejected

  return (
    <div className="space-y-4">
      <BackToHub />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:items-start">
        {/* Mobile : aperçu → résultats → outils. Web : aperçu et outils à gauche, résultats à droite. */}
        <div className="lg:col-start-1 lg:row-start-1">
          <Card className="overflow-hidden">
            {previewUrl && <img src={previewUrl} alt={t('verifier.image.preview')} className="max-h-80 w-full bg-canvas object-contain" />}
            <div className="space-y-1 p-3 text-xs text-ink-muted">
              <p className="truncate font-semibold text-ink">{file.name}</p>
              {reception && (
                <p>
                  {reception.mime ?? '?'} · {formatBytes(reception.size)}
                  {reception.width > 0 && ` · ${reception.width}×${reception.height}`}
                </p>
              )}
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-3 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        {!rejected && (
          <SynthesisCard
            running={!finished}
            claims={published?.url === sourceUrl ? published?.claims : []}
            factcheckAvailable={!sourceUrl || published?.available !== false}
            findings={imageFindings({
              matches: matches.map((match) => ({ case_title: match.case_title, verdict: match.verdict, exact: match.exact })),
              metadata: meta
                ? { finding: meta.finding, software: meta.software, takenAt: meta.takenAt && formatDate(meta.takenAt), device: [meta.make, meta.model].filter(Boolean).join(' ') }
                : undefined,
              provenance: provenance?.available ? provenance : undefined,
              elaClue: steps.recompression.clue,
              ai: steps.ai_clue.state === 'done' ? steps.ai_clue.data : steps.ai_clue.state === 'unavailable' ? { available: false, error: steps.ai_clue.data?.error ?? 'service_unreachable' } : undefined,
              sourceUrl,
            })}
          />
        )}
        <ol className="space-y-3" aria-label={t('verifier.stepsTitle')}>
          <li>
            <StepCard
              index={1}
              title={t('verifier.image.step.reception')}
              state={steps.reception.state}
              tool={steps.reception.tool}
              durationMs={steps.reception.durationMs}
              limits={t('verifier.limits.reception')}
              summary={rejected ? <span className="text-danger">{t(`verifier.image.rejected.${rejected}`)}</span> : undefined}
            >
              {reception && !rejected && (
                <FactList
                  items={[
                    ['SHA-256', <code className="break-all font-mono text-[11px]">{reception.sha256}</code>],
                    [t('verifier.image.phash'), <code className="font-mono text-[11px]">{reception.phash}</code>],
                  ]}
                />
              )}
            </StepCard>
          </li>

          {!rejected && (
            <>
              <li>
                <StepCard
                  index={2}
                  title={t('verifier.image.step.already_seen')}
                  state={steps.already_seen.state}
                  clue={steps.already_seen.clue}
                  tool={steps.already_seen.tool}
                  durationMs={steps.already_seen.durationMs}
                  limits={t('verifier.limits.already_seen')}
                  summary={
                    steps.already_seen.data?.reason === 'no_database'
                      ? t('verifier.summary.needsDatabase')
                      : stateSummary(steps.already_seen.state) ??
                        (steps.already_seen.state === 'done' &&
                          (matches.length ? t('verifier.image.alreadySeen', { count: matches.length }) : t('verifier.image.notSeen')))
                  }
                >
                  {matches.length > 0 && (
                    <ul className="space-y-1.5">
                      {matches.map((match) => (
                        <li key={match.evidence_id} className="flex flex-wrap items-center gap-2 rounded-xl bg-canvas px-3 py-2 text-xs">
                          <span className="min-w-0 flex-1 font-semibold text-ink">{match.case_title}</span>
                          <CaseStatusBadge status={match.case_status} />
                          {match.verdict && <VerdictBadge verdict={match.verdict} />}
                          <span className="text-ink-muted">
                            {match.exact ? t('verifier.image.identical') : t('verifier.image.distance', { count: match.distance ?? 0 })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </StepCard>
              </li>

              <li>
                <StepCard
                  index={3}
                  title={t('verifier.image.step.metadata')}
                  state={steps.metadata.state}
                  clue={steps.metadata.clue}
                  tool={steps.metadata.tool}
                  durationMs={steps.metadata.durationMs}
                  limits={t('verifier.limits.metadata')}
                  summary={meta && t(`verifier.image.metadata.${meta.finding}`, { software: meta.software })}
                >
                  {meta && meta.finding !== 'stripped' && (
                    <div className="space-y-2">
                      <FactList
                        items={[
                          [t('verifier.image.takenAt'), meta.takenAt && formatDate(meta.takenAt)],
                          [t('verifier.image.device'), [meta.make, meta.model].filter(Boolean).join(' ')],
                          [t('verifier.image.software'), meta.software],
                          [t('verifier.image.gps'), meta.gps && `${meta.gps.latitude.toFixed(5)}, ${meta.gps.longitude.toFixed(5)}`],
                        ]}
                      />
                      {meta.gps && (
                        <>
                          <iframe
                            title={t('verifier.image.map')}
                            className="h-48 w-full rounded-xl border border-line"
                            loading="lazy"
                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${meta.gps.longitude - 0.01},${meta.gps.latitude - 0.01},${meta.gps.longitude + 0.01},${meta.gps.latitude + 0.01}&marker=${meta.gps.latitude},${meta.gps.longitude}`}
                          />
                          <a
                            href={`https://www.openstreetmap.org/?mlat=${meta.gps.latitude}&mlon=${meta.gps.longitude}#map=16/${meta.gps.latitude}/${meta.gps.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-cobalt"
                          >
                            <MapIcon className="size-3.5" aria-hidden />
                            {t('verifier.image.openMap')}
                          </a>
                        </>
                      )}
                    </div>
                  )}
                </StepCard>
              </li>

              <li>
                <StepCard
                  index={4}
                  title={t('verifier.image.step.provenance')}
                  state={steps.provenance.state}
                  clue={steps.provenance.clue}
                  tool={steps.provenance.tool}
                  durationMs={steps.provenance.durationMs}
                  limits={t('verifier.limits.provenance')}
                  summary={
                    stateSummary(steps.provenance.state) ??
                    (provenance &&
                      (!provenance.present
                        ? t('verifier.image.provenanceAbsent')
                        : provenance.ai_generated
                          ? t('verifier.image.provenanceAi')
                          : t('verifier.image.provenancePresent', { issuer: provenance.issuer ?? '?' })))
                  }
                >
                  {provenance?.present && (
                    <FactList
                      items={[
                        [t('verifier.image.generator'), provenance.claim_generator],
                        [t('verifier.image.signedBy'), provenance.issuer],
                        [t('verifier.image.signedAt'), provenance.signed_at && formatDate(provenance.signed_at)],
                        [t('verifier.image.signature'), provenance.valid ? t('verifier.image.signatureValid') : t('verifier.image.signatureInvalid')],
                      ]}
                    />
                  )}
                </StepCard>
              </li>

              <li>
                <StepCard
                  index={5}
                  title={t('verifier.image.step.recompression')}
                  state={steps.recompression.state}
                  clue={steps.recompression.clue}
                  tool={steps.recompression.tool}
                  durationMs={steps.recompression.durationMs}
                  limits={t('verifier.limits.recompression')}
                  summary={
                    steps.recompression.state === 'not_applicable'
                      ? t('verifier.image.elaJpegOnly')
                      : steps.recompression.clue && t(`verifier.image.ela.${steps.recompression.clue}`)
                  }
                >
                  {steps.recompression.data && (
                    <div className="space-y-2">
                      <button type="button" onClick={() => setShowMap((value) => !value)} className="min-h-8 text-xs font-semibold text-cobalt">
                        {showMap ? t('verifier.image.hideElaMap') : t('verifier.image.showElaMap')}
                      </button>
                      {showMap && (
                        <img src={steps.recompression.data.mapDataUrl} alt={t('verifier.image.elaMap')} className="w-full rounded-xl bg-black" />
                      )}
                    </div>
                  )}
                </StepCard>
              </li>

              <li>
                <StepCard
                  index={6}
                  title={t('verifier.image.step.reverse_search')}
                  state="done"
                  limits={t('verifier.limits.reverse_search')}
                  tool="Google Lens, TinEye, Yandex, Bing, InVID-WeVerify"
                  summary={engines[0].prefilled ? t('verifier.image.reversePrefilled') : t('verifier.image.reverseManual')}
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {engines.map((engine) => (
                        <a
                          key={engine.id}
                          href={engine.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-line px-3 text-xs font-semibold text-cobalt hover:bg-canvas"
                        >
                          {engine.name}
                          <ExternalLink className="size-3.5" aria-hidden />
                        </a>
                      ))}
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="found-links" className="text-xs font-semibold text-ink">
                        {t('verifier.image.foundLinks')}
                      </label>
                      <Textarea
                        id="found-links"
                        rows={2}
                        value={foundLinks}
                        onChange={(event) => setFoundLinks(event.target.value)}
                        placeholder={t('verifier.image.foundLinksPlaceholder')}
                      />
                    </div>
                  </div>
                </StepCard>
              </li>

              <li>
                <StepCard
                  index={7}
                  title={t('verifier.image.step.ai_clue')}
                  state={steps.ai_clue.state}
                  clue={steps.ai_clue.clue}
                  tool={steps.ai_clue.tool}
                  durationMs={steps.ai_clue.durationMs}
                  limits={t('verifier.limits.ai_clue')}
                  summary={
                    steps.ai_clue.state === 'unavailable' && steps.ai_clue.data && !steps.ai_clue.data.available
                      ? t('verifier.image.aiNotConfigured')
                      : stateSummary(steps.ai_clue.state) ??
                        (steps.ai_clue.data?.score !== undefined &&
                          t('verifier.image.aiScore', { percent: Math.round(steps.ai_clue.data.score * 100) }))
                  }
                />
              </li>
            </>
          )}
        </ol>
        </div>

        <div className="space-y-4 lg:col-start-1 lg:row-start-2">
          {!rejected && steps.reception.state === 'done' && (
            <>
              <VisualChecklist value={visual} onChange={setVisual} />
              <AttachToCase
                evidence={(origin) => ({
type: 'image',
                    file,
                    sha256: reception?.sha256,
                    phash: reception?.phash,
                    url: media?.sourceUrl ?? undefined,
                    origin: origin || media?.origin || null,
                    analysis: analysisRecord(steps, {
                      visual_checklist: visual,
                      found_links: foundLinks.split('\n').map((line) => line.trim()).filter(Boolean),
                    }),
                  })}
              />
            </>
          )}
        
        </div>
      </div>
    </div>
  )
}

export function BackToHub() {
  const { t } = useTranslation()
  return (
    <Link to="/verifier" className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-cobalt hover:underline">
      <ArrowLeft className="size-4" aria-hidden />
      {t('verifier.backToHub')}
    </Link>
  )
}

