import { Bold, Check, FileText, Italic, List, Quote, type LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card, Textarea } from '@/components/ui'
import { useCase, useCases } from '@/features/dossiers/CaseStoreProvider'
import { useServiceCapabilities } from '@/hooks/useServiceCapabilities'
import { cn } from '@/lib/cn'
import { DEFAULT_SETTINGS, fillTemplate, getSetting, type AppSettings } from '@/lib/settings'
import { readStorage, writeStorage } from '@/lib/storage'
import { countWords, estimateRadioSeconds } from '@/lib/text'
import { LANGUAGES, type Language } from '@/types/domain'
import { AssistantPanel } from './AssistantPanel'
import { buildExcerpts } from './excerpts'
import { GlossaryCard } from './GlossaryCard'

const FORMATS = ['radio', 'post', 'article', 'debunk'] as const
type Format = (typeof FORMATS)[number]

interface Draft {
  format: Format
  language: Language
  /** Dossier dont l'assistant et les modèles tirent leur contenu. */
  caseId: string
  note: string
  title: string
  body: string
}

const DRAFT_STORAGE_KEY = 'maso.draft'
const EMPTY_DRAFT: Draft = { format: 'radio', language: 'fr', caseId: '', note: '', title: '', body: '' }

function readDraft(): Draft {
  try {
    return { ...EMPTY_DRAFT, ...JSON.parse(readStorage(DRAFT_STORAGE_KEY) ?? '{}') }
  } catch {
    return EMPTY_DRAFT
  }
}

/** Marques de mise en forme (Markdown) insérées autour de la sélection. */
const TOOLS: Array<{
  id: 'bold' | 'italic' | 'list' | 'quote'
  icon: LucideIcon
  before: string
  after: string
}> = [
  { id: 'bold', icon: Bold, before: '**', after: '**' },
  { id: 'italic', icon: Italic, before: '_', after: '_' },
  { id: 'list', icon: List, before: '\n- ', after: '' },
  { id: 'quote', icon: Quote, before: '\n> ', after: '' },
]

/** Couleurs douces par format, pour différencier visuellement les tags. */
const FORMAT_TONES: Record<Format, string> = {
  radio: 'border-cobalt bg-cobalt text-white',
  post: 'border-emerald-500 bg-emerald-500 text-white',
  article: 'border-purple-500 bg-purple-500 text-white',
  debunk: 'border-red-500 bg-red-500 text-white',
}

const FORMAT_HOVER: Record<Format, string> = {
  radio: 'hover:border-cobalt/50 hover:text-cobalt',
  post: 'hover:border-emerald-500/50 hover:text-emerald-600',
  article: 'hover:border-purple-500/50 hover:text-purple-600',
  debunk: 'hover:border-red-500/50 hover:text-red-600',
}

/**
 * M11 / W11 — Rédiger : éditeur, modèles sans IA par format et langue, assistant borné au dossier
 * (masqué sans modèle), glossaire FR / MG. Brouillon gardé hors ligne.
 */
export function RedigerPage() {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<Draft>(readDraft)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    writeStorage(DRAFT_STORAGE_KEY, JSON.stringify(draft))
  }, [draft])

  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }))

  const { cases } = useCases()
  const { detail } = useCase(draft.caseId || undefined)
  const { capabilities } = useServiceCapabilities()
  const [templates, setTemplates] = useState<AppSettings['templates']>(DEFAULT_SETTINGS.templates)
  useEffect(() => {
    getSetting('templates').then(setTemplates, () => undefined)
  }, [])
  const excerpts = useMemo(() => (detail ? buildExcerpts(detail) : []), [detail])
  const record = detail?.case

  const appendToBody = (text: string) => update({ body: draft.body.trim() ? `${draft.body.trimEnd()}

${text}` : text })

  const insertTemplate = () =>
    appendToBody(
      fillTemplate(templates[draft.format][draft.language], {
        claim: record?.claim,
        title: draft.title || record?.title,
        verdict: record?.verdict ? t(`verdict.${record.verdict}`, { lng: draft.language }) : undefined,
      }),
    )

  const applyTool = (before: string, after: string) => {
    const area = bodyRef.current
    if (!area) return
    const { selectionStart: start, selectionEnd: end, value } = area
    update({
      body: value.slice(0, start) + before + value.slice(start, end) + after + value.slice(end),
    })
    requestAnimationFrame(() => {
      area.focus()
      area.setSelectionRange(start + before.length, end + before.length)
    })
  }

  const words = countWords(`${draft.title} ${draft.body}`)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
      {/* Éditeur principal */}
      <Card
        className="dashboard-rise overflow-hidden border-t-4 border-t-white/20 shadow-sm"
        style={{ '--i': 0 } as CSSProperties}
      >
        {/* Barre d'outils */}
        <div className="flex items-center gap-1 border-b border-line bg-canvas/30 px-2 py-1.5">
          {TOOLS.map(({ id, icon: Icon, before, after }) => (
            <button
              key={id}
              type="button"
              onClick={() => applyTool(before, after)}
              aria-label={t(`rediger.toolbar.${id}`)}
              title={t(`rediger.toolbar.${id}`)}
              className="flex size-10 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-cobalt/10 hover:text-cobalt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt"
            >
              <Icon className="size-4" aria-hidden />
            </button>
          ))}
        </div>

        {/* Zone de saisie */}
        <div className="space-y-3 p-4">
          <input
            value={draft.title}
            onChange={(event) => update({ title: event.target.value })}
            placeholder={t('rediger.titlePlaceholder')}
            aria-label={t('rediger.titlePlaceholder')}
            className="w-full bg-transparent font-display text-xl font-extrabold text-ink placeholder:text-ink-muted/60 focus:outline-none"
          />
          <textarea
            ref={bodyRef}
            value={draft.body}
            onChange={(event) => update({ body: event.target.value })}
            placeholder={t('rediger.bodyPlaceholder')}
            aria-label={t('rediger.bodyPlaceholder')}
            rows={14}
            className="w-full resize-y bg-transparent text-sm leading-relaxed text-ink placeholder:text-ink-muted/60 focus:outline-none"
          />
        </div>

        {/* Pied de carte */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-canvas/30 px-4 py-2 text-xs text-ink-muted">
          <span>
            {t('rediger.words', { count: words })}
            {draft.format === 'radio' &&
              ` · ${t('rediger.radioDuration', { seconds: estimateRadioSeconds(`${draft.title} ${draft.body}`) })}`}
          </span>
          <span className="inline-flex items-center gap-1 font-medium text-success">
            <Check className="size-3.5" aria-hidden />
            {t('rediger.savedLocally')}
          </span>
        </div>
      </Card>

      {/* Colonne de droite */}
      <div className="space-y-4">
        {/* Choix du format */}
        <Card
          className="dashboard-rise space-y-2 border-t-4 border-t-white/20 p-4 shadow-sm"
          style={{ '--i': 1 } as CSSProperties}
        >
          <p className="font-display text-sm font-bold text-navy dark:text-ink">
            {t('rediger.format')}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {FORMATS.map((format) => (
              <button
                key={format}
                type="button"
                aria-pressed={draft.format === format}
                onClick={() => update({ format })}
                className={cn(
                  'min-h-10 rounded-xl border px-2 text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt',
                  draft.format === format
                    ? FORMAT_TONES[format]
                    : cn('border-line bg-surface text-ink-muted', FORMAT_HOVER[format]),
                )}
              >
                {t(`rediger.formats.${format}`)}
              </button>
            ))}
          </div>
        </Card>

        {/* Dossier source, langue et modèle sans IA */}
        <Card className="dashboard-rise space-y-3 p-4 shadow-sm" style={{ '--i': 2 } as CSSProperties}>
          <div className="space-y-1.5">
            <label htmlFor="draft-case" className="block font-display text-sm font-bold text-navy dark:text-ink">
              {t('rediger.case')}
            </label>
            <select
              id="draft-case"
              value={draft.caseId}
              onChange={(event) => update({ caseId: event.target.value })}
              className="min-h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-cobalt focus:outline-none"
            >
              <option value="">{t('rediger.noCase')}</option>
              {(cases ?? []).map((item) => (
                <option key={item.id} value={item.id}>{item.title}</option>
              ))}
            </select>
          </div>
          <div role="group" aria-label={t('rediger.language')} className="grid grid-cols-3 gap-1.5">
            {LANGUAGES.map((lng) => (
              <button
                key={lng}
                type="button"
                lang={lng}
                aria-pressed={draft.language === lng}
                onClick={() => update({ language: lng })}
                className={cn(
                  'min-h-9 rounded-lg border text-xs font-bold uppercase transition',
                  draft.language === lng ? 'border-cobalt bg-cobalt text-white' : 'border-line text-ink-muted hover:border-cobalt/50',
                )}
              >
                {lng}
              </button>
            ))}
          </div>
          <Button variant="secondary" block className="min-h-10" onClick={insertTemplate}>
            <FileText className="size-4" aria-hidden />
            {t('rediger.useTemplate')}
          </Button>
        </Card>

        {/* Assistant : seulement avec un dossier choisi et un modèle disponible (sinon masqué). */}
        {capabilities?.assistant && record && (
          <AssistantPanel
            caseId={record.id}
            claim={record.claim}
            excerpts={excerpts}
            format={draft.format}
            language={draft.language}
            onInsert={appendToBody}
          />
        )}

        <GlossaryCard />

        {/* Note rapide */}
        <Card
          className="dashboard-rise space-y-2 border-t-4 border-t-white/20 p-4 shadow-sm"
          style={{ '--i': 3 } as CSSProperties}
        >
          <label
            htmlFor="note"
            className="block font-display text-sm font-bold text-navy dark:text-ink"
          >
            {t('rediger.note')}
          </label>
          <Textarea
            id="note"
            rows={4}
            value={draft.note}
            onChange={(event) => update({ note: event.target.value })}
            placeholder={t('rediger.notePlaceholder')}
            className="bg-cobalt/5 focus:bg-surface"
          />
        </Card>
      </div>
    </div>
  )
}