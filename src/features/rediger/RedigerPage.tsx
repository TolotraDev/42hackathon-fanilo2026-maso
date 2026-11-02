import { Bold, Check, Italic, List, Quote, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, Textarea } from '@/components/ui'
import { cn } from '@/lib/cn'
import { readStorage, writeStorage } from '@/lib/storage'
import { countWords, estimateRadioSeconds } from '@/lib/text'

const FORMATS = ['radio', 'post', 'article', 'debunk'] as const
type Format = (typeof FORMATS)[number]

interface Draft {
  format: Format
  note: string
  title: string
  body: string
}

const DRAFT_STORAGE_KEY = 'maso.draft'
const EMPTY_DRAFT: Draft = { format: 'radio', note: '', title: '', body: '' }

function readDraft(): Draft {
  try {
    return { ...EMPTY_DRAFT, ...JSON.parse(readStorage(DRAFT_STORAGE_KEY) ?? '{}') }
  } catch {
    return EMPTY_DRAFT
  }
}

/** Marques de mise en forme (Markdown) insérées autour de la sélection. */
const TOOLS: Array<{ id: 'bold' | 'italic' | 'list' | 'quote'; icon: LucideIcon; before: string; after: string }> = [
  { id: 'bold', icon: Bold, before: '**', after: '**' },
  { id: 'italic', icon: Italic, before: '_', after: '_' },
  { id: 'list', icon: List, before: '\n- ', after: '' },
  { id: 'quote', icon: Quote, before: '\n> ', after: '' },
]

/** M11 — Éditeur d'article, sans IA (l'assistant borné arrive en MOD-07). Brouillon gardé hors ligne. */
export function RedigerPage() {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<Draft>(readDraft)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    writeStorage(DRAFT_STORAGE_KEY, JSON.stringify(draft))
  }, [draft])

  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }))

  const applyTool = (before: string, after: string) => {
    const area = bodyRef.current
    if (!area) return
    const { selectionStart: start, selectionEnd: end, value } = area
    update({ body: value.slice(0, start) + before + value.slice(start, end) + after + value.slice(end) })
    requestAnimationFrame(() => {
      area.focus()
      area.setSelectionRange(start + before.length, end + before.length)
    })
  }

  const words = countWords(`${draft.title} ${draft.body}`)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
      <Card className="overflow-hidden">
        <div className="flex items-center gap-1 border-b border-line px-2 py-1.5">
          {TOOLS.map(({ id, icon: Icon, before, after }) => (
            <button
              key={id}
              type="button"
              onClick={() => applyTool(before, after)}
              aria-label={t(`rediger.toolbar.${id}`)}
              title={t(`rediger.toolbar.${id}`)}
              className="flex size-10 items-center justify-center rounded-lg text-ink hover:bg-canvas"
            >
              <Icon className="size-4" aria-hidden />
            </button>
          ))}
        </div>
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
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2 text-xs text-ink-muted">
          <span>
            {t('rediger.words', { count: words })}
            {draft.format === 'radio' && ` · ${t('rediger.radioDuration', { seconds: estimateRadioSeconds(`${draft.title} ${draft.body}`) })}`}
          </span>
          <span className="inline-flex items-center gap-1">
            <Check className="size-3.5 text-success" aria-hidden />
            {t('rediger.savedLocally')}
          </span>
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="p-4">
          <p className="mb-2 font-display text-sm font-bold text-navy dark:text-ink">{t('rediger.format')}</p>
          <div className="grid grid-cols-2 gap-2">
            {FORMATS.map((format) => (
              <button
                key={format}
                type="button"
                aria-pressed={draft.format === format}
                onClick={() => update({ format })}
                className={cn(
                  'min-h-10 rounded-xl border px-2 text-xs font-semibold transition',
                  draft.format === format ? 'border-cobalt bg-cobalt text-white' : 'border-line text-ink-muted hover:text-ink',
                )}
              >
                {t(`rediger.formats.${format}`)}
              </button>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <label htmlFor="note" className="mb-2 block font-display text-sm font-bold text-navy dark:text-ink">
            {t('rediger.note')}
          </label>
          <Textarea
            id="note"
            rows={4}
            value={draft.note}
            onChange={(event) => update({ note: event.target.value })}
            placeholder={t('rediger.notePlaceholder')}
            className="bg-cobalt/8"
          />
        </Card>
      </div>
    </div>
  )
}
