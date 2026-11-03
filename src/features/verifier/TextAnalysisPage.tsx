import { ArrowLeft, BarChart3, FileText, Quote, Search, TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { Badge, Button, Card, SectionTitle, Textarea, VerdictBadge } from '@/components/ui'
import { listIndicators } from '@/features/ressources/resourcesApi'
import type { Indicator } from '@/features/ressources/types'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { analyseApi, type FactCheckClaim } from '@/lib/analyseApi'
import { textFindings } from '@/lib/analysis/synthesis'
import { analyzeText, type TextAnalysis } from '@/lib/analysis/textClaims'
import { matchesQuery } from '@/lib/text'
import type { Language, Verdict } from '@/types/domain'
import { AttachToCase } from './AttachToCase'
import { SynthesisCard } from './SynthesisCard'
import { isPersistenceAvailable, searchLibrary } from './verificationApi'

const MAX_TEXT = 5000

/** Mots significatifs du nom d'un indicateur, pour le rapprocher d'une phrase du texte. */
const keywords = (name: string) =>
  name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4)

interface FigureMatch {
  raw: string
  value: number
  context: string
  indicator: Indicator
  percent: number | null
}

function matchFigures(analysis: TextAnalysis, indicators: Indicator[]): FigureMatch[] {
  const matches: FigureMatch[] = []
  for (const figure of analysis.figures) {
    const indicator = indicators.find((item) => keywords(item.name).some((word) => matchesQuery(word, figure.context)))
    if (!indicator) continue
    const percent = indicator.value === 0 ? null : Math.round(((figure.value - indicator.value) / indicator.value) * 1000) / 10
    matches.push({ ...figure, indicator, percent })
  }
  return matches
}

/** M6 — Analyse de texte et de rumeur : affirmations, entités, chiffres, signaux. Indices, jamais de verdict. */
export function TextAnalysisPage() {
  const { t, i18n } = useTranslation()
  const online = useOnlineStatus()
  const [params] = useSearchParams()
  // Texte transmis par « Vérifier » (contenu collé) ou par l'analyse d'un lien : analysé dès l'ouverture.
  const [text, setText] = useState(() => params.get('texte') ?? '')
  const autoRun = useRef(Boolean(params.get('texte')))
  const [factcheckOn, setFactcheckOn] = useState(true)
  const [analysis, setAnalysis] = useState<TextAnalysis | null>(null)
  const [indicators, setIndicators] = useState<Indicator[]>([])
  const [existing, setExisting] = useState<{ library: Array<{ id: string; title: string; verdict: Verdict | null }>; claims: FactCheckClaim[] } | null>(null)

  useEffect(() => {
    listIndicators().then(setIndicators, () => undefined)
  }, [])

  const figures = useMemo(() => (analysis ? matchFigures(analysis, indicators) : []), [analysis, indicators])

  const run = async () => {
    const result = analyzeText(text.slice(0, MAX_TEXT))
    setAnalysis(result)
    setExisting(null)
    // Vérifications existantes : bibliothèque MASO et Google Fact Check, sur les deux premières affirmations.
    const query = (result.claims[0]?.text ?? text).slice(0, 200)
    if (!online || query.trim().length < 3) return
    const language = (i18n.resolvedLanguage ?? 'fr') as Language
    const queries = [...new Set([query, ...result.claims.slice(1, 2).map((claim) => claim.text.slice(0, 200))])]
    const noFactcheck = { available: false, claims: [] as FactCheckClaim[] }
    const [library, ...factchecks] = await Promise.all([
      isPersistenceAvailable() ? searchLibrary(result.entities.places[0] ?? query.split(' ').slice(0, 4).join(' ')).catch(() => []) : Promise.resolve([]),
      ...queries.map((item) => analyseApi.factcheck(item, language).catch(() => noFactcheck)),
    ])
    const claims = factchecks.flatMap((item) => item.claims).filter((claim, index, all) => all.findIndex((other) => other.url === claim.url) === index)
    setFactcheckOn(factchecks.some((item) => item.available))
    setExisting({ library, claims })
  }

  useEffect(() => {
    if (!autoRun.current || text.trim().length < 10) return
    autoRun.current = false
    void run()
  }, [])

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Link to="/verifier" className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-cobalt hover:underline">
        <ArrowLeft className="size-4" aria-hidden />
        {t('nav.verifier')}
      </Link>

      <Card className="space-y-3 p-4">
        <h1 className="flex items-center gap-2 font-display text-lg font-extrabold text-navy dark:text-ink">
          <FileText className="size-5 text-cobalt" aria-hidden />
          {t('textAnalysis.title')}
        </h1>
        <p className="text-sm text-ink-muted">{t('textAnalysis.hint')}</p>
        <label htmlFor="text-input" className="sr-only">{t('textAnalysis.input')}</label>
        <Textarea id="text-input" rows={7} maxLength={MAX_TEXT} value={text} onChange={(event) => setText(event.target.value)} placeholder={t('textAnalysis.placeholder')} />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-ink-muted">{text.length} / {MAX_TEXT}</span>
          <Button disabled={text.trim().length < 10} onClick={() => void run()}>
            <Search className="size-4" aria-hidden />
            {t('textAnalysis.analyse')}
          </Button>
        </div>
      </Card>

      {analysis && (
        <>
          <SynthesisCard
            running={online && !existing}
            claims={existing?.claims}
            factcheckAvailable={factcheckOn}
            findings={textFindings({
              signals: analysis.signals.map((signal) => signal.id),
              claims: analysis.claims.length,
              figures: figures.map((figure) => ({
                raw: figure.raw,
                percent: figure.percent,
                indicator: figure.indicator.name,
                official: figure.indicator.value,
                year: figure.indicator.year,
                source: figure.indicator.source,
              })),
            })}
          />
          <p className="flex items-start gap-2 rounded-xl bg-cobalt/10 px-3 py-2 text-xs text-ink">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-cobalt" aria-hidden />
            {t('textAnalysis.noVerdict')}
          </p>

          <section className="space-y-2">
            <SectionTitle>{t('textAnalysis.signals')}</SectionTitle>
            {analysis.signals.length === 0 ? (
              <Card className="p-4 text-sm text-ink-muted">{t('textAnalysis.noSignal')}</Card>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {analysis.signals.map((signal) => (
                  <Card key={signal.id} className="space-y-1 border-l-4 border-l-warning p-3">
                    <p className="text-sm font-bold text-ink">{t(`textAnalysis.signal.${signal.id}.title`)}</p>
                    <p className="text-xs text-ink-muted">{t(`textAnalysis.signal.${signal.id}.text`)}</p>
                    {signal.matches[0] !== '—' && <p className="text-xs italic text-ink">« {signal.matches.slice(0, 3).join(' · ')} »</p>}
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <SectionTitle>{t('textAnalysis.claims', { count: analysis.claims.length })}</SectionTitle>
            {analysis.claims.length === 0 && <Card className="p-4 text-sm text-ink-muted">{t('textAnalysis.noClaim')}</Card>}
            {analysis.claims.map((claim, index) => (
              <Card key={index} className="space-y-2 p-3">
                <p className="text-sm text-ink">{claim.text}</p>
                <div className="flex flex-wrap gap-1.5">
                  {claim.numbers.map((value) => <Badge key={`n${value}`} tone="info">{t('textAnalysis.entity.number')} : {value}</Badge>)}
                  {claim.dates.map((value) => <Badge key={`d${value}`} tone="info">{t('textAnalysis.entity.date')} : {value}</Badge>)}
                  {claim.places.map((value) => <Badge key={`p${value}`} tone="success">{t('textAnalysis.entity.place')} : {value}</Badge>)}
                  {claim.names.map((value) => <Badge key={`m${value}`} tone="warning">{t('textAnalysis.entity.name')} : {value}</Badge>)}
                  {claim.quotes.map((value) => (
                    <Badge key={`q${value}`}>
                      <Quote className="mr-1 inline size-3" aria-hidden />
                      {value.slice(0, 40)}
                    </Badge>
                  ))}
                </div>
              </Card>
            ))}
          </section>

          <section className="space-y-2">
            <SectionTitle>{t('textAnalysis.figures')}</SectionTitle>
            {figures.length === 0 ? (
              <Card className="p-4 text-sm text-ink-muted">{t('textAnalysis.noFigure')}</Card>
            ) : (
              figures.map((figure) => (
                <Card key={`${figure.raw}-${figure.indicator.id}`} className="space-y-1 p-3 text-sm">
                  <p className="flex items-center gap-2 font-semibold text-ink">
                    <BarChart3 className="size-4 text-cobalt" aria-hidden />
                    {figure.indicator.name}
                  </p>
                  <p className="text-ink">
                    {t('textAnalysis.figureLine', {
                      claimed: figure.raw,
                      official: figure.indicator.value.toLocaleString(i18n.resolvedLanguage),
                      unit: figure.indicator.unit ?? '',
                      year: figure.indicator.year,
                      percent: figure.percent === null ? '—' : `${figure.percent > 0 ? '+' : ''}${figure.percent}`,
                    })}
                  </p>
                  <p className="text-xs text-ink-muted">{figure.indicator.source}</p>
                </Card>
              ))
            )}
          </section>

          <section className="space-y-2">
            <SectionTitle>{t('textAnalysis.existing')}</SectionTitle>
            {!online && <Card className="p-4 text-sm text-ink-muted">{t('verifier.summary.waitingNetwork')}</Card>}
            {online && !existing && <Card className="p-4 text-sm text-ink-muted">{t('auth.loading')}</Card>}
            {existing && existing.library.length + existing.claims.length === 0 && <Card className="p-4 text-sm text-ink-muted">{t('verifier.noExisting')}</Card>}
            {existing?.library.map((hit) => (
              <Link key={hit.id} to={`/dossiers/${hit.id}`} className="block">
                <Card className="flex items-center justify-between gap-2 p-3 text-sm hover:border-cobalt">
                  <span className="font-semibold text-ink">{hit.title}</span>
                  {hit.verdict && <VerdictBadge verdict={hit.verdict} />}
                </Card>
              </Link>
            ))}
            {existing?.claims.map((claim, index) => (
              <a key={index} href={claim.url ?? undefined} target="_blank" rel="noreferrer noopener" className="block">
                <Card className="space-y-1 p-3 text-sm hover:border-cobalt">
                  <p className="font-semibold text-ink">{claim.text}</p>
                  <p className="text-xs text-ink-muted">{[claim.publisher, claim.rating, claim.date?.slice(0, 10)].filter(Boolean).join(' · ')}</p>
                </Card>
              </a>
            ))}
          </section>

          <AttachToCase
            defaultClaim={analysis.claims[0]?.text ?? ''}
            evidence={(origin) => ({
              type: 'text',
              origin: origin || null,
              analysis: {
                version: 1,
                kind: 'text',
                analysed_at: new Date().toISOString(),
                note: text.slice(0, 600),
                text: text.slice(0, MAX_TEXT),
                claims: analysis.claims,
                signals: analysis.signals,
                figures: figures.map(({ raw, indicator, percent }) => ({ raw, indicator: indicator.name, official: indicator.value, year: indicator.year, source: indicator.source, percent })),
              },
            })}
          />
        </>
      )}
    </div>
  )
}
