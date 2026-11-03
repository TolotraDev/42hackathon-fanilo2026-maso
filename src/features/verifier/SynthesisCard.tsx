import { CircleAlert, CircleCheck, ExternalLink, Info, LoaderCircle, ShieldAlert, ShieldCheck, ShieldQuestion, ShieldOff, TriangleAlert, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge, Card } from '@/components/ui'
import type { FactCheckClaim } from '@/lib/analyseApi'
import { ratingKind, vigilance, type Finding, type FindingLevel, type Vigilance } from '@/lib/analysis/synthesis'
import { findingText } from '@/lib/analysis/findingText'
import { cn } from '@/lib/cn'
import type { Tone } from '@/types/domain'

const LEVEL_ICONS: Record<FindingLevel, LucideIcon> = { alert: CircleAlert, caution: TriangleAlert, ok: CircleCheck, info: Info }
const LEVEL_COLORS: Record<FindingLevel, string> = { alert: 'text-danger', caution: 'text-warning', ok: 'text-success', info: 'text-ink-muted' }
type Displayed = Vigilance | 'running' | 'unreadable'
const VIGILANCE: Record<Displayed, { icon: LucideIcon; tone: Tone; border: string }> = {
  high: { icon: ShieldAlert, tone: 'danger', border: 'border-l-danger' },
  medium: { icon: ShieldQuestion, tone: 'warning', border: 'border-l-warning' },
  low: { icon: ShieldCheck, tone: 'success', border: 'border-l-success' },
  running: { icon: LoaderCircle, tone: 'neutral', border: 'border-l-line' },
  unreadable: { icon: ShieldOff, tone: 'neutral', border: 'border-l-line' },
}
const RATING_TONES = { false: 'danger', misleading: 'warning', true: 'success', other: 'neutral' } as const

interface SynthesisCardProps {
  findings: Finding[]
  /** Vérifications déjà publiées par des médias (Google Fact Check), avec leur note et leur lien. */
  claims?: FactCheckClaim[]
  /** Certaines étapes tournent encore : la synthèse se complète. */
  running?: boolean
  /** Message quand la recherche de vérifications publiées n'est pas configurée. */
  factcheckAvailable?: boolean
  /** Le contenu lui-même n'a pas pu être lu (publication privée) : aucune conclusion rassurante possible. */
  unreadable?: boolean
}

/** « Ce que disent les indices » : niveau de vigilance, vérifications existantes et indices, chacun avec sa source. */
export function SynthesisCard({ findings, claims = [], running = false, factcheckAvailable = true, unreadable = false }: SynthesisCardProps) {
  const { t } = useTranslation()
  const computed = vigilance(findings, claims)
  // Jamais de badge rassurant tant que l'analyse tourne ou que le contenu n'a pas pu être lu.
  const level: Displayed = computed !== 'low' ? computed : unreadable ? 'unreadable' : running ? 'running' : 'low'
  const { icon: Icon, tone, border } = VIGILANCE[level]
  const order: FindingLevel[] = ['alert', 'caution', 'ok', 'info']
  const sorted = [...findings].sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level))
  const text = (finding: Finding) => findingText(t, finding)

  return (
    <Card className={cn('space-y-3 border-l-4 p-4', border)} aria-live="polite" aria-busy={running}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-base font-bold text-navy dark:text-ink">{t('synthesis.title')}</h2>
        <Badge tone={tone} solid>
          <Icon className={cn('size-3.5', level === 'running' && 'animate-spin')} aria-hidden />
          {t(`synthesis.vigilance.${level}`)}
        </Badge>
      </div>
      <p className="text-sm text-ink">{t(`synthesis.vigilanceHint.${level}`)}</p>

      {claims.length > 0 && (
        <div className="space-y-2 rounded-xl bg-canvas p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">{t('synthesis.alreadyChecked', { count: claims.length })}</p>
          <ul className="space-y-2">
            {claims.slice(0, 6).map((claim, index) => (
              <li key={`${claim.url}-${index}`} className="text-sm">
                <div className="flex flex-wrap items-center gap-1.5">
                  {claim.rating && <Badge tone={RATING_TONES[ratingKind(claim.rating)]}>{claim.rating}</Badge>}
                  <span className="font-semibold text-ink">{claim.publisher ?? '—'}</span>
                  {claim.date && <span className="text-xs text-ink-muted">{claim.date.slice(0, 10)}</span>}
                </div>
                {claim.text && <p className="text-xs text-ink-muted">« {claim.text} »</p>}
                {claim.url && (
                  <a href={claim.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-xs font-semibold text-cobalt hover:underline">
                    <ExternalLink className="size-3.5" aria-hidden />
                    {t('synthesis.readCheck')}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {!factcheckAvailable && <p className="text-xs text-ink-muted">{t('synthesis.factcheckOff')}</p>}

      <ul className="space-y-1.5">
        {sorted.map((finding, index) => {
          const FindingIcon = LEVEL_ICONS[finding.level]
          return (
            <li key={`${finding.key}-${index}`} className="flex items-start gap-2 text-sm">
              <FindingIcon className={cn('mt-0.5 size-4 shrink-0', LEVEL_COLORS[finding.level])} aria-label={t(`synthesis.level.${finding.level}`)} />
              <span className="min-w-0 text-ink">
                {text(finding)}
                {finding.source && (
                  <span className="text-xs text-ink-muted">
                    {' '}— {t('synthesis.source')} :{' '}
                    {finding.source.url ? (
                      <a href={finding.source.url} target="_blank" rel="noreferrer noopener" className="text-cobalt hover:underline">{finding.source.name}</a>
                    ) : (
                      finding.source.name
                    )}
                  </span>
                )}
              </span>
            </li>
          )
        })}
      </ul>
      {running && <p className="text-xs text-ink-muted">{t('synthesis.running')}</p>}
      <p className="border-t border-line pt-2 text-xs text-ink-muted">{t('synthesis.human')}</p>
    </Card>
  )
}
