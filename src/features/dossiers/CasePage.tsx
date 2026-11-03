import { ArrowLeft, ClipboardCopy, CloudOff, FileDown, RotateCw, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Badge, Button, Card, CaseStatusBadge } from '@/components/ui'
import { FormMessage } from '@/features/auth/FormMessage'
import { cn } from '@/lib/cn'
import { AnalysisTab } from './AnalysisTab'
import { useCase, useCaseStore } from './CaseStoreProvider'
import { DecisionPanel } from './DecisionPanel'
import { casePdf, caseSections, caseText } from './exportCase'
import type { CaseDetail, Mutation } from './model'
import { SyncBadge } from './SyncBadge'
import { ChecklistTab, ContactsTab, EvidencesTab, FiguresTab, HistoryTab, ReportTab, SourcesTab, SummaryTab } from './tabs'
import { useCaseErrorMessage } from './useCaseError'

export function BackToCases() {
  const { t } = useTranslation()
  return (
    <Link to="/dossiers" className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-cobalt hover:underline">
      <ArrowLeft className="size-4" aria-hidden />
      {t('dossiers.back')}
    </Link>
  )
}

export type Feedback = { tone: 'error' | 'success'; text: string } | null

/** Enregistre une modification (sur l'appareil, puis envoyée) et affiche le résultat. */
export function useCaseAction() {
  const { store } = useCaseStore()
  const errorMessage = useCaseErrorMessage()
  const [feedback, setFeedback] = useState<Feedback>(null)
  const run = useCallback(
    async (mutation: Mutation, success: string) => {
      if (!store) return false
      setFeedback(null)
      try {
        await store.mutate(mutation)
        setFeedback({ tone: 'success', text: success })
        return true
      } catch (error) {
        setFeedback({ tone: 'error', text: errorMessage(error) })
        return false
      }
    },
    [store, errorMessage],
  )
  return { run, feedback, setFeedback }
}

const TABS = ['summary', 'analysis', 'evidences', 'sources', 'contacts', 'figures', 'checklist', 'report', 'history'] as const
type Tab = (typeof TABS)[number]

function tabCount(detail: CaseDetail, tab: Tab): string | null {
  switch (tab) {
    case 'evidences':
      return String(detail.evidences.length)
    case 'analysis':
      return null
    case 'sources':
      return String(detail.sources.length)
    case 'contacts':
      return String(detail.requests.length)
    case 'figures':
      return String(detail.evidences.filter((evidence) => evidence.analysis?.kind === 'statistic_comparison').length)
    case 'checklist':
      return `${detail.case.checklistDone}/${detail.case.checklistTotal}`
    default:
      return null
  }
}

/** M13 / W5 — Dossier : onglets, checklist, verdict, export ; utilisable hors ligne. */
export function CasePage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams()
  const { store, syncStates, team } = useCaseStore()
  const { detail, offline } = useCase(id)
  const [params] = useSearchParams()
  const [tab, setTab] = useState<Tab>(() => TABS.find((value) => value === params.get('onglet')) ?? 'summary')
  // Mise en analyse, renvoi au journaliste, analyse à vérifier : on ouvre directement le rapport d'analyse.
  const status = detail?.case.status
  const requested = params.get('onglet')
  useEffect(() => {
    if (!requested && status && ['in_analysis', 'to_verify', 'correction_requested'].includes(status)) setTab('analysis')
  }, [status, requested])
  const [errors, setErrors] = useState<string[]>([])
  const [exportMessage, setExportMessage] = useState<Feedback>(null)
  const sync = (id && syncStates[id]) || 'synced'

  useEffect(() => {
    if (store && id && sync === 'error') void store.errors(id).then(setErrors)
    else setErrors([])
  }, [store, id, sync])

  if (detail === undefined) return <p className="py-10 text-center text-sm text-ink-muted">{t('auth.loading')}</p>
  if (detail === null) {
    return (
      <div className="space-y-4">
        <BackToCases />
        <Card className="p-4 text-sm text-ink-muted">{t('dossiers.notFound')}</Card>
      </div>
    )
  }

  const names = (userId: string | null) => team.find((member) => member.id === userId)?.fullName ?? (userId ? t('dossiers.member') : '—')
  const formatDate = (iso: string) => new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
  const exportParts = () => {
    const footer = t('dossiers.export.footer', { date: formatDate(new Date().toISOString()), status: t(`caseStatus.${detail.case.status}`) })
    return { sections: caseSections(detail, t, names, formatDate), footer }
  }
  const incomplete = detail.checklist.length === 0

  return (
    <div className="space-y-4">
      <BackToCases />

      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="font-display text-lg font-bold leading-snug text-navy dark:text-ink">{detail.case.title}</h2>
          <div className="flex flex-wrap items-center gap-1.5">
            <CaseStatusBadge status={detail.case.status} />
            <Badge tone={detail.case.priority === 1 ? 'danger' : detail.case.priority === 2 ? 'warning' : 'neutral'}>{t(`dossiers.priority.${detail.case.priority}`)}</Badge>
            <SyncBadge state={sync} />
          </div>
        </div>
        {detail.case.claim && <p className="rounded-xl bg-canvas px-3 py-2 text-sm italic text-ink">« {detail.case.claim} »</p>}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            className="min-h-10 text-xs"
            onClick={async () => {
              const { sections, footer } = exportParts()
              const blob = await casePdf(detail.case.title, sections, footer)
              const link = document.createElement('a')
              link.href = URL.createObjectURL(blob)
              link.download = `MASO-dossier-${detail.case.id.slice(0, 8)}.pdf`
              link.click()
              URL.revokeObjectURL(link.href)
              setExportMessage({ tone: 'success', text: t('dossiers.export.pdfDone') })
            }}
          >
            <FileDown className="size-4" aria-hidden />
            {t('dossiers.export.pdf')}
          </Button>
          <Button
            variant="secondary"
            className="min-h-10 text-xs"
            onClick={async () => {
              const { sections, footer } = exportParts()
              await navigator.clipboard.writeText(caseText(detail.case.title, sections, footer))
              setExportMessage({ tone: 'success', text: t('dossiers.export.copied') })
            }}
          >
            <ClipboardCopy className="size-4" aria-hidden />
            {t('dossiers.export.copy')}
          </Button>
        </div>
        {exportMessage && <FormMessage tone={exportMessage.tone}>{exportMessage.text}</FormMessage>}
        {offline && (
          <p role="status" className="flex items-center gap-2 rounded-xl bg-warning/20 px-3 py-2 text-xs text-ink">
            <CloudOff className="size-4 shrink-0" aria-hidden />
            {incomplete ? t('dossiers.offlineIncomplete') : t('dossiers.offlineCase')}
          </p>
        )}
        {sync === 'error' && store && id && (
          <div className="space-y-2 rounded-xl bg-danger/10 p-3 text-xs text-danger" role="alert">
            <p className="font-semibold">{t('dossiers.sync.errorHint')}</p>
            <ul className="list-disc pl-4">
              {errors.map((error) => {
                const [kind, code] = error.split(':')
                return <li key={error}>{t(`dossiers.mutation.${kind}`)} : {t(`dossiers.error.${code}`, { defaultValue: code })}</li>
              })}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" className="min-h-9 text-xs" onClick={() => void store.retry(id)}>
                <RotateCw className="size-3.5" aria-hidden />
                {t('dossiers.sync.retry')}
              </Button>
              <Button
                variant="ghost"
                className="min-h-9 text-xs text-danger hover:bg-danger/10"
                onClick={() => window.confirm(t('dossiers.sync.discardConfirm')) && void store.discardPending(id)}
              >
                <Trash2 className="size-3.5" aria-hidden />
                {t('dossiers.sync.discard')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
        <div className="min-w-0 space-y-3">
          <div role="tablist" aria-label={t('dossiers.tabs')} className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
            {TABS.map((value) => {
              const count = tabCount(detail, value)
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={tab === value}
                  onClick={() => setTab(value)}
                  className={cn(
                    'flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition',
                    tab === value ? 'border-cobalt bg-cobalt text-white' : 'border-line bg-surface text-ink-muted hover:text-ink',
                  )}
                >
                  {t(`dossiers.tab.${value}`)}
                  {count !== null && <span className={cn('rounded-full px-1.5', tab === value ? 'bg-white/20' : 'bg-line')}>{count}</span>}
                </button>
              )
            })}
          </div>
          <div role="tabpanel">
            {tab === 'summary' && <SummaryTab detail={detail} />}
            {tab === 'analysis' && <AnalysisTab detail={detail} />}
            {tab === 'evidences' && <EvidencesTab detail={detail} />}
            {tab === 'sources' && <SourcesTab detail={detail} />}
            {tab === 'contacts' && <ContactsTab detail={detail} />}
            {tab === 'figures' && <FiguresTab detail={detail} />}
            {tab === 'checklist' && <ChecklistTab detail={detail} />}
            {tab === 'report' && <ReportTab detail={detail} />}
            {tab === 'history' && <HistoryTab detail={detail} names={names} formatDate={formatDate} />}
          </div>
        </div>
        <div className="xl:sticky xl:top-20">
          <DecisionPanel detail={detail} names={names} />
        </div>
      </div>
    </div>
  )
}
