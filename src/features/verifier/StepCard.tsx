import { ChevronDown, CircleCheck, CircleMinus, Clock3, CloudOff, LoaderCircle, PlugZap, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, Card } from '@/components/ui'
import type { StepState } from '@/lib/analysis/types'
import { cn } from '@/lib/cn'
import type { ClueLevel, Tone } from '@/types/domain'

const STATE_ICONS: Record<StepState, LucideIcon> = {
  pending: Clock3,
  running: LoaderCircle,
  done: CircleCheck,
  not_applicable: CircleMinus,
  waiting_network: CloudOff,
  unavailable: PlugZap,
}

const CLUE_TONES: Record<ClueLevel, Tone> = { none: 'neutral', weak: 'warning', to_examine: 'danger' }

/** Indice qualifié (section 9) : toujours écrit, la couleur n'est qu'un renfort. */
export function ClueBadge({ clue }: { clue: ClueLevel }) {
  const { t } = useTranslation()
  return <Badge tone={CLUE_TONES[clue]}>{t(`clue.${clue}`)}</Badge>
}

export function StepStateLabel({ state }: { state: StepState }) {
  const { t } = useTranslation()
  const Icon = STATE_ICONS[state]
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 text-xs', state === 'done' ? 'text-success' : 'text-ink-muted')}>
      <Icon className={cn('size-3.5', state === 'running' && 'animate-spin')} aria-hidden />
      {t(`verifier.stepState.${state}`)}
    </span>
  )
}

interface StepCardProps {
  index: number
  title: string
  state: StepState
  clue?: ClueLevel
  /** Résumé en une phrase, toujours visible. */
  summary?: React.ReactNode
  /** Limites du test, en langage simple. */
  limits?: string
  tool?: string
  durationMs?: number
  children?: React.ReactNode
}

/** Une étape d'analyse affichée en direct : état, indice, résultat, limites et outil utilisé. */
export function StepCard({ index, title, state, clue, summary, limits, tool, durationMs, children }: StepCardProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const finished = state === 'done'
  return (
    <Card className="p-4" aria-busy={state === 'running'}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
            finished ? 'bg-cobalt text-white' : 'bg-line text-ink-muted',
          )}
        >
          {index}
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-ink">{title}</h3>
            <div className="flex items-center gap-2">
              {finished && clue && <ClueBadge clue={clue} />}
              <StepStateLabel state={state} />
            </div>
          </div>
          {summary && <div className="text-sm text-ink">{summary}</div>}
          {finished && children}
          {(limits || tool) && (
            <div>
              <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                className="inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-cobalt"
              >
                {t('verifier.limitsAndTool')}
                <ChevronDown className={cn('size-3.5 transition', open && 'rotate-180')} aria-hidden />
              </button>
              {open && (
                <div className="mt-1 space-y-1 rounded-xl bg-canvas px-3 py-2 text-xs text-ink-muted">
                  {limits && <p>{limits}</p>}
                  {tool && (
                    <p>
                      {t('verifier.tool')} : {tool}
                      {durationMs !== undefined && ` · ${(durationMs / 1000).toFixed(1)} s`}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

/** Tableau de faits (libellé / valeur) dans une étape. */
export function FactList({ items }: { items: Array<[string, React.ReactNode]> }) {
  const visible = items.filter(([, value]) => value !== null && value !== undefined && value !== '')
  if (visible.length === 0) return null
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
      {visible.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-ink-muted">{label}</dt>
          <dd className="break-words text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
