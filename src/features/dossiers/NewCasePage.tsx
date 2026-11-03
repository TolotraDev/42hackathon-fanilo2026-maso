import { FolderPlus, Megaphone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Card, Input, Textarea } from '@/components/ui'
import { alertsApi, type PublicAlert } from '@/features/accueil/alertsApi'
import { FormMessage } from '@/features/auth/FormMessage'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useCaseStore } from './CaseStoreProvider'
import { BackToCases } from './CasePage'
import type { NewCaseInput } from './model'
import { useCaseErrorMessage } from './useCaseError'

const SELECT = 'min-h-11 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink focus:border-cobalt focus:outline-none'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** Nouveau dossier — fonctionne aussi sans réseau (envoyé au retour de la connexion). Peut partir d'un signalement du public. */
export function NewCasePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const online = useOnlineStatus()
  const { store } = useCaseStore()
  const errorMessage = useCaseErrorMessage()
  const [form, setForm] = useState<NewCaseInput>({ title: '', claim: '', category: '', region: '', priority: 2, dueDate: null })
  const [error, setError] = useState<string | null>(null)
  const [params] = useSearchParams()
  const alertId = params.get('alerte')
  const [alert, setAlert] = useState<PublicAlert | null>(null)

  // Prise en charge depuis la veille (flux RSS) : le titre et l'affirmation sont pré-remplis.
  useEffect(() => {
    const title = params.get('titre')
    if (!title || alertId) return
    setForm((current) => ({ ...current, title: title.slice(0, 120), claim: params.get('affirmation') ?? '', region: params.get('region') ?? '' }))
  }, [params, alertId])

  useEffect(() => {
    if (!alertId) return
    void alertsApi()
      .get(alertId)
      .then((found) => {
        if (!found) return
        setAlert(found)
        const text = found.text ?? found.url ?? ''
        setForm((current) => ({ ...current, title: text.slice(0, 80), claim: found.text ?? '', region: found.region ?? '' }))
      })
      .catch(() => null)
  }, [alertId])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!store) return
    try {
      const id = crypto.randomUUID()
      await store.mutate({ kind: 'create_case', caseId: id, input: { ...form, alertId: alert?.id ?? null } })
      if (alert) {
        if (store.mode === 'local') await alertsApi().markTaken(alert.id, id)
        // Le fichier et le lien du signalement deviennent les premières preuves du dossier.
        const file = alert.hasFile ? await alertsApi().file(alert).catch(() => null) : null
        const origin = t('dossiers.fromAlert', { code: alert.trackingCode })
        const base = { archiveUrl: null, storagePath: null, analysis: null, addedBy: null, createdAt: new Date().toISOString() }
        if (file && IMAGE_TYPES.includes(file.type)) {
          const blobId = crypto.randomUUID()
          await store.saveBlob(blobId, file)
          await store.mutate({ kind: 'add_evidence', caseId: id, evidence: { ...base, id: crypto.randomUUID(), type: 'image', url: null, sha256: alert.sha256, phash: alert.phash, origin, localBlobId: blobId } })
        }
        if (alert.url) {
          await store.mutate({ kind: 'add_evidence', caseId: id, evidence: { ...base, id: crypto.randomUUID(), type: 'link', url: alert.url, sha256: null, phash: null, origin } })
        }
      }
      navigate(`/dossiers/${id}`, { replace: true })
    } catch (failure) {
      setError(errorMessage(failure))
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <BackToCases />
      <Card className="p-4">
        <form onSubmit={(event) => void submit(event)} className="space-y-3">
          <h2 className="font-display text-base font-bold text-navy dark:text-ink">{t('dossiers.new')}</h2>
          {!online && <FormMessage tone="success">{t('dossiers.offlineCreate')}</FormMessage>}
          {alert && (
            <p className="flex items-start gap-2 rounded-xl bg-cobalt/8 px-3 py-2 text-sm text-ink">
              <Megaphone className="mt-0.5 size-4 shrink-0 text-cobalt" aria-hidden />
              {t('dossiers.fromAlertHint', { code: alert.trackingCode, count: alert.occurrences })}
            </p>
          )}
          <div className="space-y-1.5">
            <label htmlFor="case-title" className="text-sm font-semibold text-ink">{t('verifier.attach.caseTitle')}</label>
            <Input id="case-title" required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="case-claim" className="text-sm font-semibold text-ink">{t('dossiers.field.claim')}</label>
            <Textarea id="case-claim" rows={3} value={form.claim} onChange={(event) => setForm({ ...form, claim: event.target.value })} placeholder={t('dossiers.field.claimPlaceholder')} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="case-category" className="text-sm font-semibold text-ink">{t('dossiers.field.category')}</label>
              <Input id="case-category" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder={t('dossiers.field.categoryPlaceholder')} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="case-region" className="text-sm font-semibold text-ink">{t('dossiers.field.region')}</label>
              <Input id="case-region" value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="case-priority" className="text-sm font-semibold text-ink">{t('dossiers.field.priority')}</label>
              <select id="case-priority" className={SELECT} value={form.priority} onChange={(event) => setForm({ ...form, priority: Number(event.target.value) as 1 | 2 | 3 })}>
                {[1, 2, 3].map((priority) => (
                  <option key={priority} value={priority}>{t(`dossiers.priority.${priority}`)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="case-due" className="text-sm font-semibold text-ink">{t('dossiers.field.dueDate')}</label>
              <Input id="case-due" type="date" value={form.dueDate ?? ''} onChange={(event) => setForm({ ...form, dueDate: event.target.value || null })} />
            </div>
          </div>
          {error && <FormMessage tone="error">{error}</FormMessage>}
          <Button type="submit" block>
            <FolderPlus className="size-4" aria-hidden />
            {t('dossiers.create')}
          </Button>
        </form>
      </Card>
    </div>
  )
}
