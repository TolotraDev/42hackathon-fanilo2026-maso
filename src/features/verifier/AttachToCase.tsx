import { FolderPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card, CaseStatusBadge, Input, SegmentedControl, Textarea } from '@/components/ui'
import { FormMessage } from '@/features/auth/FormMessage'
import { useAuthErrorMessage } from '@/features/auth/useAuthError'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { cn } from '@/lib/cn'
import { createCase, isPersistenceAvailable, listOpenCases, type CaseSummary } from './verificationApi'

interface AttachToCaseProps {
  /** Enregistre la preuve dans le dossier choisi ; l'origine est saisie par le journaliste. */
  onAttach: (caseId: string, origin: string) => Promise<void>
  defaultClaim?: string
}

/** « Ajouter au dossier » : rattacher la preuve à un dossier existant ou en créer un (M3, M4). */
export function AttachToCase({ onAttach, defaultClaim = '' }: AttachToCaseProps) {
  const { t } = useTranslation()
  const online = useOnlineStatus()
  const errorMessage = useAuthErrorMessage()
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [cases, setCases] = useState<CaseSummary[]>([])
  const [caseId, setCaseId] = useState('')
  const [title, setTitle] = useState('')
  const [claim, setClaim] = useState(defaultClaim)
  const [origin, setOrigin] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)

  useEffect(() => {
    if (!isPersistenceAvailable() || !online) return
    listOpenCases()
      .then((rows) => {
        setCases(rows)
        if (rows.length === 0) setMode('new')
      })
      .catch((error: unknown) => setMessage({ tone: 'error', text: errorMessage(error) }))
  }, [online, errorMessage])

  if (!isPersistenceAvailable()) {
    return (
      <Card className="p-4 text-sm text-ink-muted">
        <p className="font-semibold text-ink">{t('verifier.attach.title')}</p>
        <p className="mt-1">{t('verifier.attach.needsDatabase')}</p>
      </Card>
    )
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      let target = cases.find((item) => item.id === caseId) ?? null
      if (mode === 'new') target = await createCase(title, claim)
      if (!target) throw new Error('no_case')
      await onAttach(target.id, origin.trim())
      setMessage({ tone: 'success', text: t('verifier.attach.done', { title: target.title }) })
    } catch (error) {
      setMessage({ tone: 'error', text: errorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="p-4">
      <form onSubmit={(event) => void submit(event)} className="space-y-3">
        <p className="font-display text-sm font-bold text-navy dark:text-ink">{t('verifier.attach.title')}</p>
        {!online && <FormMessage tone="error">{t('verifier.attach.offline')}</FormMessage>}
        <SegmentedControl
          label={t('verifier.attach.title')}
          value={mode}
          onChange={setMode}
          options={[
            { value: 'existing', label: t('verifier.attach.existing') },
            { value: 'new', label: t('verifier.attach.new') },
          ]}
        />
        {mode === 'existing' ? (
          <fieldset className="max-h-56 min-w-0 space-y-1 overflow-y-auto">
            <legend className="sr-only">{t('verifier.attach.existing')}</legend>
            {cases.map((item) => (
              <label
                key={item.id}
                className={cn(
                  'flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2',
                  caseId === item.id ? 'border-cobalt bg-cobalt/5' : 'border-line',
                )}
              >
                <input type="radio" name="case" value={item.id} checked={caseId === item.id} onChange={() => setCaseId(item.id)} />
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{item.title}</span>
                <CaseStatusBadge status={item.status} />
              </label>
            ))}
            {cases.length === 0 && <p className="text-sm text-ink-muted">{t('verifier.attach.noOpenCase')}</p>}
          </fieldset>
        ) : (
          <div className="space-y-2">
            <label htmlFor="case-title" className="text-sm font-semibold text-ink">
              {t('verifier.attach.caseTitle')}
            </label>
            <Input id="case-title" required value={title} onChange={(event) => setTitle(event.target.value)} />
            <label htmlFor="case-claim" className="text-sm font-semibold text-ink">
              {t('verifier.attach.claim')}
            </label>
            <Textarea id="case-claim" rows={2} value={claim} onChange={(event) => setClaim(event.target.value)} />
          </div>
        )}
        <div className="space-y-1.5">
          <label htmlFor="evidence-origin" className="text-sm font-semibold text-ink">
            {t('verifier.attach.origin')}
          </label>
          <Input
            id="evidence-origin"
            value={origin}
            onChange={(event) => setOrigin(event.target.value)}
            placeholder={t('verifier.attach.originPlaceholder')}
          />
        </div>
        {message && <FormMessage tone={message.tone}>{message.text}</FormMessage>}
        <Button type="submit" block disabled={busy || !online || (mode === 'existing' && !caseId)}>
          <FolderPlus className="size-4" aria-hidden />
          {t('verifier.attach.submit')}
        </Button>
      </form>
    </Card>
  )
}
