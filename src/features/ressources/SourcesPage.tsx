import { BadgeCheck, Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useShellSearch } from '@/components/layout/AppShell'
import { Badge, Card, Input, SectionTitle } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthProvider'
import { FormMessage } from '@/features/auth/FormMessage'
import { useAuthErrorMessage } from '@/features/auth/useAuthError'
import { qualifySourceScore } from '@/features/verifier/LinkAnalysisPage'
import { isPersistenceAvailable, SOURCE_TYPES, type SourceType } from '@/features/verifier/verificationApi'
import { normalizeUrl } from '@/lib/analysis/url'
import { loadWithPack } from '@/lib/offlineCache'
import { matchesQuery } from '@/lib/text'
import { CsvImport } from './CsvImport'
import { PackNotice } from './PackNotice'
import { BackToResources } from './PersonPage'
import { addSources, listSources } from './resourcesApi'
import type { SourceSummary } from './types'
import type { PackState } from './useResources'

const SELECT = 'min-h-11 rounded-xl border border-line bg-canvas px-2 text-sm text-ink focus:border-cobalt focus:outline-none'
const SCORE_TONES = { none: 'success', weak: 'warning', to_examine: 'danger' } as const

/** W8 — Annuaire des médias et sources : fiches, score de fiabilité explicable, import CSV. */
export function SourcesPage() {
  const { t, i18n } = useTranslation()
  const formatScore = (score: number) => new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 1 }).format(score)
  const navigate = useNavigate()
  const errorMessage = useAuthErrorMessage()
  const shellQuery = useShellSearch()
  const [sources, setSources] = useState<SourceSummary[] | null>(null)
  const [pack, setPack] = useState<PackState>({ offline: false, savedAt: null })
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [type, setType] = useState<SourceType | ''>('')

  const load = useCallback(async () => {
    try {
      const result = await loadWithPack('sources', listSources)
      setSources(result.data)
      setPack({ offline: result.offline, savedAt: result.savedAt })
    } catch (failure) {
      setError(errorMessage(failure))
    }
  }, [errorMessage])

  useEffect(() => {
    void load()
  }, [load])

  const { role } = useAuth()
  if (role === 'public') return <Navigate to="/ressources" replace />

  const visible = (sources ?? []).filter(
    (source) => (!type || source.type === type) && matchesQuery(`${query} ${shellQuery}`.trim(), source.name, source.domain ?? ''),
  )

  return (
    <div className="space-y-4">
      <BackToResources />
      <PackNotice pack={pack} />
      {error && <FormMessage tone="error">{error}</FormMessage>}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <section className="space-y-3">
          <SectionTitle
            action={
              isPersistenceAvailable() && (
                <Link to="/ressources/sources/nouvelle" className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-cobalt hover:bg-cobalt/10">
                  <Plus className="size-4" aria-hidden />
                  {t('verifier.source.create')}
                </Link>
              )
            }
          >
            {t('ressources.mediaDirectory')}
          </SectionTitle>
          <Card className="flex flex-col gap-2 p-3 sm:flex-row">
            <Input type="search" aria-label={t('common.searchPlaceholder')} placeholder={t('common.searchPlaceholder')} value={query} onChange={(event) => setQuery(event.target.value)} />
            <select aria-label={t('verifier.source.type')} className={SELECT} value={type} onChange={(event) => setType(event.target.value as SourceType | '')}>
              <option value="">{t('verifier.source.type')}</option>
              {SOURCE_TYPES.map((value) => (
                <option key={value} value={value}>{t(`verifier.source.types.${value}`)}</option>
              ))}
            </select>
          </Card>
          <Card className="divide-y divide-line">
            {visible.map((source) => {
              const clue = qualifySourceScore(source.score)
              return (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => isPersistenceAvailable() && navigate(`/ressources/sources/${source.id}`)}
                  className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-canvas"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{source.name}</span>
                    <span className="block truncate text-xs text-ink-muted">
                      {t(`verifier.source.types.${source.type}`)}
                      {source.domain && ` · ${source.domain}`}
                    </span>
                  </span>
                  {source.verified && (
                    <Badge tone="success">
                      <BadgeCheck className="size-3.5" aria-hidden />
                      {t('verifier.source.verified')}
                    </Badge>
                  )}
                  <Badge tone={clue ? SCORE_TONES[clue] : 'neutral'}>{source.score === null ? t('ressources.sources.noScore') : `${formatScore(source.score)}/10`}</Badge>
                </button>
              )
            })}
            {sources !== null && visible.length === 0 && <p className="px-4 py-6 text-center text-sm text-ink-muted">{t('common.noResult')}</p>}
          </Card>
          <p className="text-xs text-ink-muted">{t('verifier.limits.directory')}</p>
        </section>
        {isPersistenceAvailable() && (
          <CsvImport<{ type: SourceType; name: string; url: string | null; created_on: string | null }>
            title={t('ressources.sources.import')}
            columns={['nom', 'type', 'adresse', 'date_creation']}
            example={['Radio Exemple (fictif)', 'media', 'https://radio.example', '2010-05-01']}
            templateName="maso-sources-modele.csv"
            toItem={(row) => {
              if (!row.nom) return t('ressources.csv.missing', { column: 'nom' })
              if (!(SOURCE_TYPES as readonly string[]).includes(row.type)) return t('ressources.csv.invalidType', { types: SOURCE_TYPES.join(', ') })
              const url = row.adresse ? normalizeUrl(row.adresse) : null
              if (row.adresse && !url) return t('verifier.link.invalid')
              const date = /^\d{4}-\d{2}-\d{2}$/.test(row.date_creation ?? '') ? row.date_creation : null
              return { type: row.type as SourceType, name: row.nom, url, created_on: date }
            }}
            onImport={async (items) => {
              const count = await addSources(items)
              await load()
              return count
            }}
          />
        )}
      </div>
    </div>
  )
}
