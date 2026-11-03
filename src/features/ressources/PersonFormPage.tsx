import { Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Card, Input } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthProvider'
import { FormMessage } from '@/features/auth/FormMessage'
import { useAuthErrorMessage } from '@/features/auth/useAuthError'
import { isPersistenceAvailable } from '@/features/verifier/verificationApi'
import { splitList } from '@/lib/csv'
import { cn } from '@/lib/cn'
import { LANGUAGES, type Language } from '@/types/domain'
import { BackToResources } from './PersonPage'
import { createPerson, listDirectory, updatePerson } from './resourcesApi'
import { canManageResources, VISIBILITIES, type PersonInput } from './types'

const EMPTY: PersonInput = {
  fullName: '',
  position: '',
  organization: '',
  domains: [],
  region: '',
  languages: ['mg', 'fr'],
  phone: '',
  whatsapp: '',
  email: '',
  visibility: 'team',
  consent: false,
}

/** W9 — Ajouter (rédacteur en chef, admin) ou proposer (équipe) une personne-ressource ; la modifier. */
export function PersonFormPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { role } = useAuth()
  const errorMessage = useAuthErrorMessage()
  const manager = canManageResources(role)
  const editing = Boolean(id)
  const [form, setForm] = useState<PersonInput>(EMPTY)
  const [domainsText, setDomainsText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!id) return
    listDirectory(role)
      .then((people) => {
        const person = people.find((item) => item.id === id)
        if (!person) return
        setForm({
          fullName: person.fullName,
          position: person.position ?? '',
          organization: person.organization ?? '',
          domains: person.domains,
          region: person.region ?? '',
          languages: person.languages,
          phone: person.phone ?? '',
          whatsapp: person.whatsapp ?? '',
          email: person.email ?? '',
          visibility: person.visibility,
          consent: person.consent,
        })
        setDomainsText(person.domains.join(', '))
      })
      .catch((failure: unknown) => setError(errorMessage(failure)))
  }, [id, role, errorMessage])

  if (!isPersistenceAvailable()) {
    return (
      <div className="space-y-4">
        <BackToResources />
        <Card className="p-4 text-sm text-ink-muted">{t('verifier.summary.needsDatabase')}</Card>
      </div>
    )
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.consent) return setError(t('ressources.form.consentRequired'))
    setBusy(true)
    setError(null)
    try {
      const input = { ...form, domains: splitList(domainsText) }
      if (editing) {
        await updatePerson(id!, input)
        navigate(`/ressources/personnes/${id}`)
      } else {
        const created = await createPerson(input, manager)
        navigate(manager ? `/ressources/personnes/${created}` : '/ressources', { state: { proposed: !manager } })
      }
    } catch (failure) {
      setError(errorMessage(failure))
    } finally {
      setBusy(false)
    }
  }

  const field = (key: 'fullName' | 'position' | 'organization' | 'region' | 'phone' | 'whatsapp' | 'email', type = 'text', required = false) => (
    <div className="space-y-1.5">
      <label htmlFor={`person-${key}`} className="text-sm font-semibold text-ink">
        {t(`ressources.form.${key}`)}
      </label>
      <Input id={`person-${key}`} type={type} required={required} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
    </div>
  )

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <BackToResources />
      <form onSubmit={(event) => void submit(event)} className="space-y-4">
        <Card className="space-y-3 p-4">
          <h2 className="font-display text-base font-bold text-navy dark:text-ink">
            {editing ? t('ressources.person.edit') : manager ? t('ressources.addPerson') : t('ressources.proposePerson')}
          </h2>
          {!manager && !editing && <p className="text-xs text-ink-muted">{t('ressources.form.proposalHint')}</p>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {field('fullName', 'text', true)}
            {field('position')}
            {field('organization')}
            {field('region')}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="person-domains" className="text-sm font-semibold text-ink">{t('ressources.form.domains')}</label>
            <Input id="person-domains" value={domainsText} onChange={(event) => setDomainsText(event.target.value)} placeholder={t('ressources.form.domainsPlaceholder')} />
          </div>
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-semibold text-ink">{t('ressources.person.languages')}</legend>
            <div className="flex gap-3">
              {LANGUAGES.map((language) => (
                <label key={language} className="flex min-h-9 items-center gap-1.5 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={form.languages.includes(language)}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        languages: event.target.checked ? [...form.languages, language] : form.languages.filter((item): item is Language => item !== language),
                      })
                    }
                  />
                  {t(`language.${language}`)}
                </label>
              ))}
            </div>
          </fieldset>
        </Card>

        <Card className="space-y-3 p-4">
          <h3 className="font-display text-sm font-bold text-navy dark:text-ink">{t('ressources.form.contacts')}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {field('phone', 'tel')}
            {field('whatsapp', 'tel')}
            {field('email', 'email')}
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-ink">{t('ressources.person.visibility')}</legend>
            {VISIBILITIES.map((visibility) => (
              <label
                key={visibility}
                className={cn('flex cursor-pointer items-start gap-2 rounded-xl border p-3', form.visibility === visibility ? 'border-cobalt bg-cobalt/5' : 'border-line')}
              >
                <input type="radio" name="visibility" className="mt-1" checked={form.visibility === visibility} onChange={() => setForm({ ...form, visibility })} />
                <span>
                  <span className="block text-sm font-semibold text-ink">{t(`ressources.visibility.${visibility}`)}</span>
                  <span className="block text-xs text-ink-muted">{t(`ressources.visibilityHint.${visibility}`)}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <label className="flex cursor-pointer items-start gap-2 rounded-xl bg-canvas p-3 text-sm text-ink">
            <input type="checkbox" className="mt-1" checked={form.consent} onChange={(event) => setForm({ ...form, consent: event.target.checked })} />
            {t('ressources.form.consent')}
          </label>
        </Card>

        {error && <FormMessage tone="error">{error}</FormMessage>}
        <Button type="submit" block disabled={busy}>
          <Save className="size-4" aria-hidden />
          {editing ? t('verifier.source.save') : manager ? t('ressources.addPerson') : t('ressources.form.sendProposal')}
        </Button>
      </form>
    </div>
  )
}
