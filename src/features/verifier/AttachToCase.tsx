import { FolderPlus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card, CaseStatusBadge, Input, SegmentedControl, Textarea } from '@/components/ui'
import { FormMessage } from '@/features/auth/FormMessage'
import { useCases, useCaseStore } from '@/features/dossiers/CaseStoreProvider'
import type { EvidenceRecord } from '@/features/dossiers/model'
import { useCaseErrorMessage } from '@/features/dossiers/useCaseError'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { cn } from '@/lib/cn'

/** Ce que l'analyse ajoute au dossier : le fichier original (intact), son empreinte et le résultat. */
export interface EvidenceDraft {
  type: EvidenceRecord['type']
  file?: Blob
  url?: string | null
  archiveUrl?: string | null
  sha256?: string | null
  phash?: string | null
  origin?: string | null
  analysis: unknown
}

interface AttachToCaseProps {
  /** Construit la preuve à partir de l'origine saisie par le journaliste. */
  evidence: (origin: string) => EvidenceDraft
  defaultClaim?: string
}

/**
 * « Ajouter au dossier » (M3, M4, M10) : dossier existant ou nouveau.
 * Fonctionne sans réseau : la preuve et son fichier restent sur l'appareil jusqu'au retour de la connexion.
 */
export function AttachToCase({ evidence, defaultClaim = '' }: AttachToCaseProps) {
  const { t } = useTranslation()
  const online = useOnlineStatus()
  const { store } = useCaseStore()
  const { cases } = useCases()
  const errorMessage = useCaseErrorMessage()
  const open = (cases ?? []).filter((item) => !['validated', 'published', 'closed'].includes(item.status))
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [caseId, setCaseId] = useState('')
  const [title, setTitle] = useState('')
  const [claim, setClaim] = useState(defaultClaim)
  const [origin, setOrigin] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)
  const effectiveMode = cases !== null && open.length === 0 ? 'new' : mode

  if (!store) {
    return (
      <Card className="p-4 text-sm text-ink-muted">
        <p className="font-semibold text-ink">{t('verifier.attach.title')}</p>
        <p className="mt-1">{t('verifier.attach.staffOnly')}</p>
      </Card>
    )
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      let target = open.find((item) => item.id === caseId)?.id ?? null
      let targetTitle = open.find((item) => item.id === caseId)?.title ?? ''
      if (effectiveMode === 'new') {
        target = crypto.randomUUID()
        targetTitle = title.trim()
        await store.mutate({ kind: 'create_case', caseId: target, input: { title, claim, category: '', region: '', priority: 2, dueDate: null } })
      }
      if (!target) throw new Error('no_case')
      const draft = evidence(origin.trim())
      const blobId = draft.file ? crypto.randomUUID() : null
      if (draft.file && blobId) await store.saveBlob(blobId, draft.file)
      await store.mutate({
        kind: 'add_evidence',
        caseId: target,
        evidence: {
          id: crypto.randomUUID(),
          type: draft.type,
          url: draft.url ?? null,
          archiveUrl: draft.archiveUrl ?? null,
          storagePath: null,
          sha256: draft.sha256 ?? null,
          phash: draft.phash ?? null,
          origin: draft.origin ?? null,
          analysis: (draft.analysis as Record<string, unknown>) ?? null,
          addedBy: null,
          createdAt: new Date().toISOString(),
          localBlobId: blobId,
        },
      })
      const done = t('verifier.attach.done', { title: targetTitle })
      setMessage({ tone: 'success', text: online || store.mode === 'local' ? done : `${done} ${t('verifier.attach.queued')}` })
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
        {!online && store.mode === 'remote' && <p className="text-xs text-ink-muted">{t('verifier.attach.offlineHint')}</p>}
        <SegmentedControl
          label={t('verifier.attach.title')}
          value={effectiveMode}
          onChange={setMode}
          options={[
            { value: 'existing', label: t('verifier.attach.existing') },
            { value: 'new', label: t('verifier.attach.new') },
          ]}
        />
        {effectiveMode === 'existing' ? (
          <fieldset className="max-h-56 min-w-0 space-y-1 overflow-y-auto">
            <legend className="sr-only">{t('verifier.attach.existing')}</legend>
            {open.map((item) => (
              <label
                key={item.id}
                className={cn('flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2', caseId === item.id ? 'border-cobalt bg-cobalt/5' : 'border-line')}
              >
                <input type="radio" name="case" value={item.id} checked={caseId === item.id} onChange={() => setCaseId(item.id)} />
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{item.title}</span>
                <CaseStatusBadge status={item.status} />
              </label>
            ))}
          </fieldset>
        ) : (
          <div className="space-y-2">
            <label htmlFor="case-title" className="text-sm font-semibold text-ink">{t('verifier.attach.caseTitle')}</label>
            <Input id="case-title" required value={title} onChange={(event) => setTitle(event.target.value)} />
            <label htmlFor="case-claim" className="text-sm font-semibold text-ink">{t('verifier.attach.claim')}</label>
            <Textarea id="case-claim" rows={2} value={claim} onChange={(event) => setClaim(event.target.value)} />
          </div>
        )}
        <div className="space-y-1.5">
          <label htmlFor="evidence-origin" className="text-sm font-semibold text-ink">{t('verifier.attach.origin')}</label>
          <Input id="evidence-origin" value={origin} onChange={(event) => setOrigin(event.target.value)} placeholder={t('verifier.attach.originPlaceholder')} />
        </div>
        {message && <FormMessage tone={message.tone}>{message.text}</FormMessage>}
        <Button type="submit" block disabled={busy || (effectiveMode === 'existing' && !caseId)}>
          <FolderPlus className="size-4" aria-hidden />
          {t('verifier.attach.submit')}
        </Button>
      </form>
    </Card>
  )
}
