import { ArrowLeft, Download, Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button, Card, Input, SectionTitle, SegmentedControl, Textarea } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthProvider'
import { FormMessage } from '@/features/auth/FormMessage'
import { toCsv } from '@/lib/csv'
import { deleteGlossaryTerm, listGlossary, saveGlossaryTerm, type GlossaryTerm } from '@/lib/glossary'
import { DEFAULT_SETTINGS, getSetting, setSetting, type AppSettings, type TemplateFormat } from '@/lib/settings'
import { LANGUAGES, type Language, type Profile } from '@/types/domain'
import { auditAvailable, changedFields, listAudit, type AuditEntry, type AuditFilters } from './auditApi'

type Tab = 'veille' | 'templates' | 'glossary' | 'audit' | 'legal'
type Feedback = { tone: 'error' | 'success'; text: string } | null

const TABS: Tab[] = ['veille', 'templates', 'glossary', 'audit', 'legal']
const FORMATS: TemplateFormat[] = ['radio', 'post', 'article', 'debunk']
const SELECT = 'min-h-10 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink focus:border-cobalt focus:outline-none'
const lines = (text: string) => text.split('\n').map((line) => line.trim()).filter(Boolean)

function useSave() {
  const { t } = useTranslation()
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [busy, setBusy] = useState(false)
  const save = async (action: () => Promise<void>) => {
    setBusy(true)
    setFeedback(null)
    try {
      await action()
      setFeedback({ tone: 'success', text: t('settings.saved') })
    } catch {
      setFeedback({ tone: 'error', text: t('settings.saveError') })
    } finally {
      setBusy(false)
    }
  }
  return { feedback, busy, save }
}

function VeilleSettings() {
  const { t } = useTranslation()
  const { feedback, busy, save } = useSave()
  const [sources, setSources] = useState('')
  const [high, setHigh] = useState('')
  const [medium, setMedium] = useState('')

  useEffect(() => {
    void getSetting('veille_sources').then((value) => setSources(value.join('\n')))
    void getSetting('alert_rules').then((value) => {
      setHigh(value.high.join('\n'))
      setMedium(value.medium.join('\n'))
    })
  }, [])

  const invalid = lines(sources).filter((url) => !/^https?:\/\//.test(url))

  return (
    <Card className="space-y-4 p-4">
      <div className="space-y-1.5">
        <label htmlFor="settings-sources" className="text-sm font-semibold text-ink">{t('settings.veille.sources')}</label>
        <p className="text-xs text-ink-muted">{t('settings.veille.sourcesHint')}</p>
        <Textarea id="settings-sources" rows={5} value={sources} onChange={(event) => setSources(event.target.value)} className="font-mono text-xs" />
        {invalid.length > 0 && <p className="text-xs text-danger">{t('settings.veille.invalid', { url: invalid[0] })}</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="settings-high" className="text-sm font-semibold text-danger">{t('settings.veille.high')}</label>
          <Textarea id="settings-high" rows={6} value={high} onChange={(event) => setHigh(event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="settings-medium" className="text-sm font-semibold text-warning">{t('settings.veille.medium')}</label>
          <Textarea id="settings-medium" rows={6} value={medium} onChange={(event) => setMedium(event.target.value)} />
        </div>
      </div>
      <p className="text-xs text-ink-muted">{t('settings.veille.rulesHint')}</p>
      {feedback && <FormMessage tone={feedback.tone}>{feedback.text}</FormMessage>}
      <Button
        disabled={busy || invalid.length > 0}
        onClick={() =>
          void save(async () => {
            await setSetting('veille_sources', lines(sources).slice(0, 10))
            await setSetting('alert_rules', { high: lines(high), medium: lines(medium) })
          })
        }
      >
        <Save className="size-4" aria-hidden />
        {t('settings.save')}
      </Button>
    </Card>
  )
}

function TemplateSettings() {
  const { t } = useTranslation()
  const { feedback, busy, save } = useSave()
  const [templates, setTemplates] = useState<AppSettings['templates']>(DEFAULT_SETTINGS.templates)
  const [format, setFormat] = useState<TemplateFormat>('radio')

  useEffect(() => {
    void getSetting('templates').then(setTemplates)
  }, [])

  const update = (language: Language, value: string) => setTemplates((current) => ({ ...current, [format]: { ...current[format], [language]: value } }))

  return (
    <Card className="space-y-3 p-4">
      <SegmentedControl<TemplateFormat> label={t('rediger.format')} value={format} onChange={setFormat} options={FORMATS.map((value) => ({ value, label: t(`rediger.formats.${value}`) }))} />
      <p className="text-xs text-ink-muted">{t('settings.templates.hint')}</p>
      {LANGUAGES.map((language) => (
        <div key={language} className="space-y-1.5">
          <label htmlFor={`template-${language}`} className="text-sm font-semibold text-ink">{t(`language.${language}`)}</label>
          <Textarea id={`template-${language}`} lang={language} rows={4} value={templates[format][language]} onChange={(event) => update(language, event.target.value)} />
        </div>
      ))}
      {feedback && <FormMessage tone={feedback.tone}>{feedback.text}</FormMessage>}
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={() => void save(() => setSetting('templates', templates))}>
          <Save className="size-4" aria-hidden />
          {t('settings.save')}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => setTemplates(DEFAULT_SETTINGS.templates)}>
          {t('settings.reset')}
        </Button>
      </div>
    </Card>
  )
}

const EMPTY_TERM = { fr: '', mg: '', en: '', context: '' }

function GlossarySettings() {
  const { t } = useTranslation()
  const { feedback, busy, save } = useSave()
  const [terms, setTerms] = useState<GlossaryTerm[]>([])
  const [form, setForm] = useState<{ id?: string; fr: string; mg: string; en: string; context: string }>(EMPTY_TERM)

  const load = useCallback(() => listGlossary().then(setTerms, () => setTerms([])), [])
  useEffect(() => {
    void load()
  }, [load])

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    void save(async () => {
      await saveGlossaryTerm({ id: form.id, fr: form.fr.trim(), mg: form.mg.trim(), en: form.en.trim() || null, context: form.context.trim() || null })
      setForm(EMPTY_TERM)
      await load()
    })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
      <Card className="p-4">
        <form onSubmit={submit} className="space-y-2">
          <SectionTitle>{form.id ? t('settings.glossary.edit') : t('settings.glossary.add')}</SectionTitle>
          {(['fr', 'mg', 'en', 'context'] as const).map((field) => (
            <div key={field} className="space-y-1">
              <label htmlFor={`term-${field}`} className="text-xs font-semibold text-ink">{t(`settings.glossary.${field}`)}</label>
              <Input id={`term-${field}`} required={field === 'fr' || field === 'mg'} value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} className="min-h-10" />
            </div>
          ))}
          {feedback && <FormMessage tone={feedback.tone}>{feedback.text}</FormMessage>}
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              <Plus className="size-4" aria-hidden />
              {t('settings.save')}
            </Button>
            {form.id && <Button variant="secondary" onClick={() => setForm(EMPTY_TERM)}>{t('settings.cancel')}</Button>}
          </div>
        </form>
      </Card>
      <Card className="divide-y divide-line">
        {terms.map((term) => (
          <div key={term.id} className="flex items-center gap-2 px-4 py-2.5 text-sm">
            <div className="min-w-0 flex-1">
              <p className="text-ink"><span className="font-semibold">{term.fr}</span> · <span lang="mg" className="text-cobalt">{term.mg}</span>{term.en && <span className="text-ink-muted"> · {term.en}</span>}</p>
              {term.context && <p className="text-xs text-ink-muted">{term.context}</p>}
            </div>
            <Button variant="ghost" className="min-h-9 px-2" aria-label={t('settings.glossary.edit')} onClick={() => setForm({ id: term.id, fr: term.fr, mg: term.mg, en: term.en ?? '', context: term.context ?? '' })}>
              <Pencil className="size-4" aria-hidden />
            </Button>
            <Button variant="ghost" className="min-h-9 px-2 text-danger" aria-label={t('settings.glossary.delete')} disabled={busy} onClick={() => void save(async () => { await deleteGlossaryTerm(term.id); await load() })}>
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        ))}
      </Card>
    </div>
  )
}

const ENTITIES = ['cases', 'reports', 'editorial_decisions', 'evidences', 'profiles', 'resource_people', 'sources', 'alerts', 'app_settings', 'glossary_terms', 'ai_suggestions']

function AuditLog() {
  const { t, i18n } = useTranslation()
  const { service } = useAuth()
  const [filters, setFilters] = useState<AuditFilters>({})
  const [entries, setEntries] = useState<AuditEntry[] | null>(null)
  const [error, setError] = useState(false)
  const [users, setUsers] = useState<Profile[]>([])

  useEffect(() => {
    service.admin.listUsers().then(setUsers, () => undefined)
  }, [service])

  useEffect(() => {
    setError(false)
    listAudit(filters).then(setEntries, () => setError(true))
  }, [filters])

  const names = useMemo(() => new Map(users.map((user) => [user.id, user.fullName || user.email])), [users])
  const who = (id: string | null) => (id ? names.get(id) ?? id.slice(0, 8) : t('settings.audit.system'))
  const when = (iso: string) => new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(iso))

  const exportCsv = () => {
    const csv = toCsv([
      ['date', 'utilisateur', 'action', 'entité', 'identifiant', 'avant', 'après'],
      ...(entries ?? []).map((entry) => [entry.createdAt, who(entry.userId), entry.action, entry.entity, entry.entityId, JSON.stringify(entry.before ?? ''), JSON.stringify(entry.after ?? '')]),
    ])
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }))
    link.download = `maso-journal-audit-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  if (!auditAvailable()) return <Card className="p-4 text-sm text-ink-muted">{t('settings.audit.demo')}</Card>

  return (
    <div className="space-y-3">
      <Card className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto] lg:items-end">
        <div className="space-y-1">
          <label htmlFor="audit-entity" className="text-xs font-semibold text-ink">{t('settings.audit.entity')}</label>
          <select id="audit-entity" className={SELECT} value={filters.entity ?? ''} onChange={(event) => setFilters({ ...filters, entity: event.target.value || undefined })}>
            <option value="">{t('portail.filter.all')}</option>
            {ENTITIES.map((entity) => <option key={entity} value={entity}>{entity}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="audit-action" className="text-xs font-semibold text-ink">{t('settings.audit.action')}</label>
          <select id="audit-action" className={SELECT} value={filters.action ?? ''} onChange={(event) => setFilters({ ...filters, action: event.target.value || undefined })}>
            <option value="">{t('portail.filter.all')}</option>
            {['insert', 'update', 'delete'].map((action) => <option key={action} value={action}>{t(`settings.audit.actions.${action}`)}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="audit-from" className="text-xs font-semibold text-ink">{t('settings.audit.from')}</label>
          <Input id="audit-from" type="date" className="min-h-10" value={filters.from ?? ''} onChange={(event) => setFilters({ ...filters, from: event.target.value || undefined })} />
        </div>
        <div className="space-y-1">
          <label htmlFor="audit-to" className="text-xs font-semibold text-ink">{t('settings.audit.to')}</label>
          <Input id="audit-to" type="date" className="min-h-10" value={filters.to ?? ''} onChange={(event) => setFilters({ ...filters, to: event.target.value || undefined })} />
        </div>
        <Button variant="secondary" className="min-h-10" disabled={!entries?.length} onClick={exportCsv}>
          <Download className="size-4" aria-hidden />
          {t('settings.audit.export')}
        </Button>
      </Card>
      {error && <FormMessage tone="error">{t('settings.audit.error')}</FormMessage>}
      {entries?.length === 0 && <Card className="p-4 text-sm text-ink-muted">{t('common.noResult')}</Card>}
      <Card className="divide-y divide-line">
        {entries?.map((entry) => {
          const changes = changedFields(entry)
          return (
            <details key={entry.id} className="px-4 py-2.5 text-sm">
              <summary className="cursor-pointer list-none">
                <span className="font-semibold text-ink">{who(entry.userId)}</span>
                <span className="text-ink-muted"> · {t(`settings.audit.actions.${entry.action}`, { defaultValue: entry.action })} · </span>
                <span className="font-mono text-xs text-ink">{entry.entity}</span>
                <span className="float-right text-xs text-ink-muted">{when(entry.createdAt)}</span>
              </summary>
              <div className="mt-2 space-y-1 text-xs">
                {entry.entityId && <p className="font-mono text-ink-muted">{entry.entityId}</p>}
                {changes.length === 0 && <p className="text-ink-muted">{t('settings.audit.noChange')}</p>}
                {changes.slice(0, 20).map((change) => (
                  <p key={change.field} className="break-all">
                    <span className="font-semibold text-ink">{change.field}</span> :{' '}
                    <span className="text-danger line-through">{JSON.stringify(change.before) ?? '—'}</span> →{' '}
                    <span className="text-success">{JSON.stringify(change.after) ?? '—'}</span>
                  </p>
                ))}
              </div>
            </details>
          )
        })}
      </Card>
    </div>
  )
}

function LegalSettings() {
  const { t } = useTranslation()
  const { feedback, busy, save } = useSave()
  const [legal, setLegal] = useState('')
  useEffect(() => {
    void getSetting('legal').then(setLegal)
  }, [])
  return (
    <Card className="space-y-3 p-4">
      <label htmlFor="settings-legal" className="text-sm font-semibold text-ink">{t('settings.legal.label')}</label>
      <Textarea id="settings-legal" rows={8} value={legal} onChange={(event) => setLegal(event.target.value)} />
      {feedback && <FormMessage tone={feedback.tone}>{feedback.text}</FormMessage>}
      <Button disabled={busy} onClick={() => void save(() => setSetting('legal', legal))}>
        <Save className="size-4" aria-hidden />
        {t('settings.save')}
      </Button>
    </Card>
  )
}

/** W13 — Paramètres : sources de veille et niveaux d'alerte, modèles, glossaire, journal d'audit, mentions légales. */
export function SettingsPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('veille')

  return (
    <div className="space-y-4">
      <Link to="/admin" className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-cobalt hover:underline">
        <ArrowLeft className="size-4" aria-hidden />
        {t('nav.admin')}
      </Link>
      <div>
        <h1 className="font-display text-xl font-extrabold text-navy dark:text-ink">{t('settings.title')}</h1>
        <p className="text-sm text-ink-muted">{t('settings.hint')}</p>
      </div>
      <div className="overflow-x-auto">
        <SegmentedControl<Tab> label={t('settings.title')} value={tab} onChange={setTab} className="min-w-max" options={TABS.map((value) => ({ value, label: t(`settings.tab.${value}`) }))} />
      </div>
      {tab === 'veille' && <VeilleSettings />}
      {tab === 'templates' && <TemplateSettings />}
      {tab === 'glossary' && <GlossarySettings />}
      {tab === 'audit' && <AuditLog />}
      {tab === 'legal' && <LegalSettings />}
    </div>
  )
}
