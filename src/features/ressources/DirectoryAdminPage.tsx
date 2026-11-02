import { BadgeCheck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router-dom'
import { Avatar, Badge, Button, Card, SectionTitle } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthProvider'
import { FormMessage } from '@/features/auth/FormMessage'
import { useAuthErrorMessage } from '@/features/auth/useAuthError'
import { isPersistenceAvailable } from '@/features/verifier/verificationApi'
import { splitList } from '@/lib/csv'
import { LANGUAGES, type Language } from '@/types/domain'
import { CsvImport } from './CsvImport'
import { BackToResources } from './PersonPage'
import { createPerson, validatePerson } from './resourcesApi'
import { needsRevalidation } from './rules'
import { canManageResources, VISIBILITIES, type DirectoryPerson, type PersonInput, type Visibility } from './types'
import { useDirectory } from './useResources'

const COLUMNS = ['nom', 'fonction', 'organisation', 'domaines', 'region', 'langues', 'telephone', 'whatsapp', 'email', 'visibilite', 'consentement']
const EXAMPLE = ['Rado Exemple', 'Hydrologue', 'Université (fictif)', 'climat|inondations', 'Analamanga', 'mg|fr', '+261 00 00 000 99', '', 'rado@example.org', 'team', 'oui']

function status(person: DirectoryPerson): { key: string; tone: 'success' | 'warning' | 'danger' | 'neutral' } {
  if (!person.active || !person.consent) return { key: 'withdrawn', tone: 'danger' }
  if (!person.validated) return { key: 'pending', tone: 'warning' }
  if (needsRevalidation(person)) return { key: 'revalidate', tone: 'warning' }
  return { key: 'valid', tone: 'success' }
}

/** W9 — Gestion de l'annuaire : validation, validation périodique, retraits, import CSV. */
export function DirectoryAdminPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const errorMessage = useAuthErrorMessage()
  const { people, reload } = useDirectory()
  const [feedback, setFeedback] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const { role } = useAuth()

  if (!canManageResources(role)) return <Navigate to="/ressources" replace />
  if (!isPersistenceAvailable()) {
    return (
      <div className="space-y-4">
        <BackToResources />
        <Card className="p-4 text-sm text-ink-muted">{t('verifier.summary.needsDatabase')}</Card>
      </div>
    )
  }

  const toItem = (row: Record<string, string>): PersonInput | string => {
    if (!row.nom) return t('ressources.csv.missing', { column: 'nom' })
    const consent = /^(oui|yes|eny|1|true)$/i.test(row.consentement ?? '')
    if (!consent) return t('ressources.form.consentRequired')
    const visibility = (VISIBILITIES as readonly string[]).includes(row.visibilite) ? (row.visibilite as Visibility) : 'team'
    return {
      fullName: row.nom,
      position: row.fonction ?? '',
      organization: row.organisation ?? '',
      domains: splitList(row.domaines),
      region: row.region ?? '',
      languages: splitList(row.langues).filter((item): item is Language => (LANGUAGES as readonly string[]).includes(item)),
      phone: row.telephone ?? '',
      whatsapp: row.whatsapp ?? '',
      email: row.email ?? '',
      visibility,
      consent,
    }
  }

  const sorted = [...(people ?? [])].sort((a, b) => status(a).key.localeCompare(status(b).key) || a.fullName.localeCompare(b.fullName))

  return (
    <div className="space-y-4">
      <BackToResources />
      {feedback && <FormMessage tone={feedback.tone}>{feedback.text}</FormMessage>}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <section>
          <SectionTitle>{t('ressources.admin.title')}</SectionTitle>
          <p className="mb-3 text-xs text-ink-muted">{t('ressources.admin.hint', { days: 180 })}</p>
          <Card className="divide-y divide-line">
            {sorted.map((person) => {
              const state = status(person)
              return (
                <div key={person.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                  <button type="button" onClick={() => navigate(`/ressources/personnes/${person.id}`)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <Avatar name={person.fullName} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink">{person.fullName}</span>
                      <span className="block truncate text-xs text-ink-muted">{[person.position, person.organization].filter(Boolean).join(' · ')}</span>
                    </span>
                  </button>
                  <div className="flex items-center gap-2">
                    <Badge tone={state.tone}>{t(`ressources.status.${state.key}`)}</Badge>
                    {(state.key === 'pending' || state.key === 'revalidate') && (
                      <Button
                        variant="secondary"
                        className="min-h-9 text-xs"
                        disabled={busy}
                        onClick={async () => {
                          setBusy(true)
                          try {
                            await validatePerson(person.id)
                            await reload()
                            setFeedback({ tone: 'success', text: t('ressources.person.validated') })
                          } catch (error) {
                            setFeedback({ tone: 'error', text: errorMessage(error) })
                          } finally {
                            setBusy(false)
                          }
                        }}
                      >
                        <BadgeCheck className="size-4" aria-hidden />
                        {state.key === 'pending' ? t('ressources.person.validate') : t('ressources.person.revalidate')}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </Card>
        </section>
        <CsvImport<PersonInput>
          title={t('ressources.admin.import')}
          columns={COLUMNS}
          example={EXAMPLE}
          templateName="maso-annuaire-modele.csv"
          toItem={toItem}
          onImport={async (items) => {
            for (const item of items) await createPerson(item, true)
            await reload()
            return items.length
          }}
        />
      </div>
    </div>
  )
}
