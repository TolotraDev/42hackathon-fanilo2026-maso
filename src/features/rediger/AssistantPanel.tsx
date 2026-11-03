import { CircleAlert, History, Sparkles, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Card } from '@/components/ui'
import { analyseApi, ServiceError, type AssistFormat, type AssistFunction, type AssistResult } from '@/lib/analyseApi'
import { readStorage, writeStorage } from '@/lib/storage'
import { supabase } from '@/lib/supabase'
import type { Language } from '@/types/domain'
import type { Excerpt } from './excerpts'

const FUNCTIONS: AssistFunction[] = ['draft', 'angles', 'headlines', 'questions', 'context']
const HISTORY_KEY = 'maso.assistant.history'
const HISTORY_SIZE = 10

export interface Generation {
  caseId: string
  function: AssistFunction
  result: AssistResult
}

function readHistory(): Generation[] {
  try {
    return JSON.parse(readStorage(HISTORY_KEY) ?? '[]') as Generation[]
  } catch {
    return []
  }
}

/** Journal serveur des générations (section 10, règle 7) : modèle, consigne, extraits, sortie, conformité. */
async function logGeneration(caseId: string, fn: AssistFunction, result: AssistResult) {
  if (!supabase) return
  await supabase.from('ai_suggestions').insert({
    case_id: caseId,
    function: fn,
    model: result.model,
    prompt_version: result.prompt_version,
    prompt: result.prompt,
    cited_excerpts: result.cited_excerpts,
    output: { sentences: result.sentences, removed: result.removed, missing: result.missing },
    compliant: result.compliant,
  })
}

/** Texte prêt à insérer : phrases conformes, identifiants d'extraits conservés pour la relecture. */
export function generationText(result: AssistResult, mention: string): string {
  const body = result.abstained ? result.abstention ?? '' : result.sentences.map((sentence) => sentence.text).join(' ')
  return `${body}\n\n— ${mention}`
}

/** M11 / W11 — Assistant borné au dossier. Masqué quand aucun modèle n'est configuré (section 10, règle 9). */
export function AssistantPanel({
  caseId,
  claim,
  excerpts,
  format,
  language,
  onInsert,
}: {
  caseId: string
  claim: string
  excerpts: Excerpt[]
  format: AssistFormat
  language: Language
  onInsert: (text: string) => void
}) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState<AssistFunction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<Generation[]>(readHistory)
  const [current, setCurrent] = useState<Generation | null>(null)
  const byId = new Map(excerpts.map((excerpt) => [excerpt.id, excerpt]))

  const run = async (fn: AssistFunction) => {
    setBusy(fn)
    setError(null)
    try {
      const result = await analyseApi.assist({ function: fn, format, language, claim, excerpts: excerpts.map(({ id, text }) => ({ id, text })) })
      const generation = { caseId, function: fn, result }
      setCurrent(generation)
      const next = [generation, ...history].slice(0, HISTORY_SIZE)
      setHistory(next)
      writeStorage(HISTORY_KEY, JSON.stringify(next))
      void logGeneration(caseId, fn, result).catch(() => undefined)
    } catch (failure) {
      setError(failure instanceof ServiceError && failure.reason === 'offline' ? t('rediger.assistant.offline') : t('rediger.assistant.error'))
    } finally {
      setBusy(null)
    }
  }

  const caseHistory = history.filter((item) => item.caseId === caseId && item !== current)

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 font-display text-sm font-bold text-navy dark:text-ink">
          <Sparkles className="size-4 text-cobalt" aria-hidden />
          {t('rediger.assistant.title')}
        </p>
        <Badge tone="info">{t('rediger.assistant.excerpts', { count: excerpts.length })}</Badge>
      </div>
      <p className="text-xs text-ink-muted">{t('rediger.assistant.hint')}</p>

      {excerpts.length === 0 ? (
        <p className="rounded-xl bg-warning/10 px-3 py-2 text-xs text-ink">{t('rediger.assistant.noExcerpts')}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {FUNCTIONS.map((fn) => (
            <Button key={fn} variant={fn === 'draft' ? 'primary' : 'secondary'} className="min-h-10 px-2 text-xs" disabled={busy !== null} onClick={() => void run(fn)}>
              {busy === fn ? t('rediger.assistant.running') : t(`rediger.assistant.fn.${fn}`)}
            </Button>
          ))}
        </div>
      )}

      {error && <p className="text-xs font-semibold text-danger">{error}</p>}

      {current && (
        <div className="space-y-2 rounded-xl border border-line bg-canvas p-3" aria-live="polite">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-warning">
            <TriangleAlert className="size-3.5" aria-hidden />
            {t('rediger.assistant.mention')}
          </p>
          {current.result.abstained ? (
            <p className="text-sm font-semibold text-ink">{current.result.abstention}</p>
          ) : (
            <ul className="space-y-1.5 text-sm text-ink">
              {current.result.sentences.map((sentence, index) => (
                <li key={index}>
                  {sentence.text.replace(/\s*\[[PSCRK]\d+\]/g, '')}{' '}
                  {sentence.citations.map((id) => (
                    <abbr key={id} title={byId.get(id)?.text} className="mr-1 cursor-help rounded bg-cobalt/10 px-1 text-[11px] font-bold text-cobalt no-underline">
                      {id}
                    </abbr>
                  ))}
                </li>
              ))}
            </ul>
          )}
          {current.result.missing.length > 0 && (
            <div className="text-xs text-ink-muted">
              <p className="font-semibold text-ink">{t('rediger.assistant.missing')}</p>
              <ul className="list-inside list-disc">
                {current.result.missing.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}
          {current.result.removed.length > 0 && (
            <details className="text-xs text-ink-muted">
              <summary className="cursor-pointer font-semibold text-danger">
                <CircleAlert className="mr-1 inline size-3.5" aria-hidden />
                {t('rediger.assistant.removed', { count: current.result.removed.length })}
              </summary>
              <ul className="mt-1 space-y-1">
                {current.result.removed.map((item, index) => (
                  <li key={index}>
                    <span className="line-through">{item.text}</span> — {t(`rediger.assistant.reason.${item.reason}`)}
                    {item.detail && ` (${item.detail})`}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <p className="text-[11px] text-ink-muted">{t('rediger.assistant.model', { model: current.result.model, version: current.result.prompt_version })}</p>
          <Button variant="secondary" block className="min-h-10" onClick={() => onInsert(generationText(current.result, t('rediger.assistant.mention')))}>
            {t('rediger.assistant.insert')}
          </Button>
        </div>
      )}

      {caseHistory.length > 0 && (
        <details className="text-xs">
          <summary className="flex cursor-pointer items-center gap-1.5 font-semibold text-ink-muted">
            <History className="size-3.5" aria-hidden />
            {t('rediger.assistant.history', { count: caseHistory.length })}
          </summary>
          <ul className="mt-2 space-y-1">
            {caseHistory.map((item) => (
              <li key={item.result.generated_at}>
                <button type="button" onClick={() => setCurrent(item)} className="text-left text-cobalt hover:underline">
                  {t(`rediger.assistant.fn.${item.function}`)} · {new Date(item.result.generated_at).toLocaleString()}
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  )
}
