import { AlertTriangle, BadgeCheck, ExternalLink, Globe2, Plus, Scale } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge, Button, Card, Input } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthProvider'
import { FormMessage } from '@/features/auth/FormMessage'
import { useAuthErrorMessage } from '@/features/auth/useAuthError'
import { AttachToCase } from '@/features/verifier/AttachToCase'
import { addEvidence, isPersistenceAvailable } from '@/features/verifier/verificationApi'
import { cn } from '@/lib/cn'
import { loadWithPack } from '@/lib/offlineCache'
import { CsvImport } from './CsvImport'
import { PackNotice } from './PackNotice'
import { BackToResources } from './PersonPage'
import { addIndicators, listIndicators, validateIndicator } from './resourcesApi'
import { compare, groupIndicators, isStale, parseNumber, STALE_AFTER_YEARS } from './rules'
import { canManageResources, STAT_THEMES, type Indicator, type IndicatorInput, type StatTheme } from './types'
import type { PackState } from './useResources'
import { fetchWorldBank, WORLD_BANK_CATALOG } from './worldBank'

const SELECT = 'min-h-11 w-full rounded-xl border border-line bg-canvas px-2 text-sm text-ink focus:border-cobalt focus:outline-none'

function useNumberFormat() {
  const { i18n } = useTranslation()
  return (value: number) =>
    new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 1 }).format(value)
}

function IndicatorCard({ latest, history, manager, onValidate }: { latest: Indicator; history: Indicator[]; manager: boolean; onValidate: (id: string) => void }) {
  const { t, i18n } = useTranslation()
  const format = useNumberFormat()
  const stale = isStale(latest)
  const updated = new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium' }).format(new Date(latest.sourceUpdatedAt))
  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">{latest.name}</h3>
        {stale && (
          <Badge tone="warning">
            <AlertTriangle className="size-3.5" aria-hidden />
            {t('ressources.stats.stale')}
          </Badge>
        )}
      </div>
      <p>
        <span className="font-display text-2xl font-extrabold text-navy dark:text-ink">{format(latest.value)}</span>{' '}
        <span className="text-xs text-ink-muted">{latest.unit}</span>
      </p>
      <p className="text-xs text-ink">{t('ressources.stats.year', { year: latest.year })}</p>
      {stale && <p className="text-xs text-ink-muted">{t('ressources.stats.staleHint', { years: STALE_AFTER_YEARS })}</p>}
      {history.length > 1 && (
        <div className="h-24" aria-label={t('ressources.stats.chart', { name: latest.name })} role="img">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={history.map((item) => ({ year: item.year, value: item.value }))} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: 'rgb(var(--ink-muted))' }} tickLine={false} axisLine={false} />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip
                formatter={(value) => [`${format(Number(value))} ${latest.unit ?? ''}`, latest.name]}
                labelFormatter={(year) => String(year)}
                contentStyle={{ fontSize: 12, borderRadius: 12 }}
              />
              <Line type="monotone" dataKey="value" stroke="rgb(var(--cobalt))" strokeWidth={2} dot={{ r: 2.5 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="mt-auto space-y-1 border-t border-line pt-2 text-[11px] text-ink-muted">
        <p>
          {t('ressources.stats.source')} :{' '}
          {latest.sourceUrl ? (
            <a href={latest.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-semibold text-cobalt hover:underline">
              {latest.source}
              <ExternalLink className="size-3" aria-hidden />
            </a>
          ) : (
            latest.source
          )}
        </p>
        <p>{t('ressources.stats.updated', { date: updated })}</p>
        {!latest.validated && (
          <p className="flex items-center gap-2">
            <Badge tone="warning">{t('ressources.stats.notValidated')}</Badge>
            {manager && (
              <button type="button" onClick={() => onValidate(latest.id)} className="inline-flex min-h-8 items-center gap-1 font-semibold text-cobalt">
                <BadgeCheck className="size-3.5" aria-hidden />
                {t('ressources.person.validate')}
              </button>
            )}
          </p>
        )}
      </div>
    </Card>
  )
}

/** M10 / W10 — Statistiques officielles : sourcées, datées, comparables à une affirmation. */
export function StatisticsPage() {
  const { t } = useTranslation()
  const { role } = useAuth()
  const errorMessage = useAuthErrorMessage()
  const format = useNumberFormat()
  const [indicators, setIndicators] = useState<Indicator[] | null>(null)
  const [pack, setPack] = useState<PackState>({ offline: false, savedAt: null })
  const [theme, setTheme] = useState<StatTheme | ''>('')
  const [feedback, setFeedback] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [comparison, setComparison] = useState({ key: '', claimed: '', claim: '' })
  const [worldBankCode, setWorldBankCode] = useState('all')
  const [manual, setManual] = useState({ theme: 'demography' as StatTheme, name: '', value: '', unit: '', year: '', source: '', sourceUrl: '', sourceUpdatedAt: '' })
  const isGuest = role === 'public'
  const canEdit = isPersistenceAvailable() && !isGuest
  const manager = canManageResources(role)

  const load = useCallback(async () => {
    try {
      const result = await loadWithPack('statistics', listIndicators)
      setIndicators(result.data)
      setPack({ offline: result.offline, savedAt: result.savedAt })
    } catch (failure) {
      setFeedback({ tone: 'error', text: errorMessage(failure) })
    }
  }, [errorMessage])

  useEffect(() => {
    void load()
  }, [load])

  const groups = useMemo(() => groupIndicators(indicators ?? []), [indicators])
  const visible = groups.filter((group) => !theme || group.latest.theme === theme)
  const selected = groups.find((group) => group.key === comparison.key)?.latest
  const claimed = parseNumber(comparison.claimed)
  const result = selected && claimed !== null ? compare(claimed, selected.value) : null

  const act = async (action: () => Promise<string>) => {
    setBusy(true)
    setFeedback(null)
    try {
      const text = await action()
      await load() // le message n'apparaît qu'une fois les chiffres à jour
      setFeedback({ tone: 'success', text })
    } catch (failure) {
      setFeedback({ tone: 'error', text: errorMessage(failure) })
    } finally {
      setBusy(false)
    }
  }

  const importWorldBank = () =>
    act(async () => {
      const codes = worldBankCode === 'all' ? WORLD_BANK_CATALOG.map((item) => item.code) : [worldBankCode]
      const rows = (await Promise.all(codes.map(fetchWorldBank))).flat()
      return t('ressources.csv.imported', { count: await addIndicators(rows) })
    })

  const saveManual = (event: React.FormEvent) => {
    event.preventDefault()
    const value = parseNumber(manual.value)
    const year = Number(manual.year)
    if (value === null || !Number.isInteger(year)) return setFeedback({ tone: 'error', text: t('ressources.stats.invalidNumber') })
    void act(async () => {
      await addIndicators([{ ...manual, code: null, value, year }])
      setManual({ ...manual, name: '', value: '', year: '' })
      return t('ressources.stats.saved')
    })
  }

  return (
    <div className="space-y-4">
      <BackToResources />
      <PackNotice pack={pack} />
      {feedback && <FormMessage tone={feedback.tone}>{feedback.text}</FormMessage>}

      <div className="flex flex-wrap gap-2">
        {(['', ...STAT_THEMES] as const).map((value) => (
          <button
            key={value || 'all'}
            type="button"
            aria-pressed={theme === value}
            onClick={() => setTheme(value)}
            className={cn(
              'min-h-9 rounded-full border px-3.5 text-xs font-semibold transition',
              theme === value ? 'border-cobalt bg-cobalt text-white' : 'border-line bg-surface text-ink-muted hover:text-ink',
            )}
          >
            {value ? t(`ressources.theme.${value}`) : t('veille.all')}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem] xl:grid-rows-[auto_1fr] xl:items-start">
        {/* Mobile : comparer en premier (outil principal), puis les chiffres, puis les imports. */}
        <div className="space-y-4 xl:col-start-2 xl:row-start-1">
          <Card className="space-y-3 p-4">
            <p className="flex items-center gap-2 font-display text-sm font-bold text-navy dark:text-ink">
              <Scale className="size-4 text-cobalt" aria-hidden />
              {t('ressources.stats.compareTitle')}
            </p>
            <p className="text-xs text-ink-muted">{t('ressources.stats.compareHint')}</p>
            <select aria-label={t('ressources.stats.indicator')} className={SELECT} value={comparison.key} onChange={(event) => setComparison({ ...comparison, key: event.target.value })}>
              <option value="">{t('ressources.stats.indicator')}</option>
              {groups.map((group) => (
                <option key={group.key} value={group.key}>{group.latest.name}</option>
              ))}
            </select>
            <Input
              inputMode="decimal"
              aria-label={t('ressources.stats.claimedValue')}
              placeholder={t('ressources.stats.claimedValue')}
              value={comparison.claimed}
              onChange={(event) => setComparison({ ...comparison, claimed: event.target.value })}
            />
            {result && selected && (
              <div className="space-y-1 rounded-xl bg-canvas p-3 text-sm text-ink" aria-live="polite">
                <p>
                  {t(`ressources.stats.compare.${result.direction}`, {
                    claimed: format(result.claimed),
                    official: format(result.official),
                    unit: selected.unit ?? '',
                    percent: result.percent === null ? '—' : format(Math.abs(result.percent)),
                    year: selected.year,
                    source: selected.source,
                  })}
                </p>
                {isStale(selected) && <p className="text-xs text-warning">{t('ressources.stats.staleHint', { years: STALE_AFTER_YEARS })}</p>}
              </div>
            )}
          </Card>

          {result && selected && canEdit && role !== 'admin' && (
            <AttachToCase
              onAttach={async (caseId, origin) => {
                await addEvidence({
                  caseId,
                  type: 'analysis',
                  url: selected.sourceUrl ?? undefined,
                  origin: origin || null,
                  analysis: {
                    version: 1,
                    kind: 'statistic_comparison',
                    analysed_at: new Date().toISOString(),
                    claimed: result.claimed,
                    official: { value: selected.value, unit: selected.unit, year: selected.year, source: selected.source, source_url: selected.sourceUrl, source_updated_at: selected.sourceUpdatedAt, indicator: selected.name, code: selected.code },
                    difference: result.difference,
                    percent: result.percent,
                  },
                })
              }}
            />
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:col-start-1 xl:row-span-2 xl:row-start-1 2xl:grid-cols-3">
          {indicators === null && <p className="text-sm text-ink-muted">{t('auth.loading')}</p>}
          {visible.map((group) => (
            <IndicatorCard
              key={group.key}
              latest={group.latest}
              history={group.history}
              manager={manager && canEdit}
              onValidate={(id) => void act(async () => { await validateIndicator(id); return t('ressources.stats.saved') })}
            />
          ))}
          {indicators !== null && visible.length === 0 && <p className="text-sm text-ink-muted">{t('common.noResult')}</p>}
        </div>

        <div className="space-y-4 xl:col-start-2 xl:row-start-2">
          {canEdit && (
            <>
              <Card className="space-y-3 p-4">
                <p className="flex items-center gap-2 font-display text-sm font-bold text-navy dark:text-ink">
                  <Globe2 className="size-4 text-cobalt" aria-hidden />
                  {t('ressources.stats.worldBankTitle')}
                </p>
                <p className="text-xs text-ink-muted">{t('ressources.stats.worldBankHint')}</p>
                <select aria-label={t('ressources.stats.indicator')} className={SELECT} value={worldBankCode} onChange={(event) => setWorldBankCode(event.target.value)}>
                  <option value="all">{t('ressources.stats.allIndicators', { count: WORLD_BANK_CATALOG.length })}</option>
                  {WORLD_BANK_CATALOG.map((item) => (
                    <option key={item.code} value={item.code}>{item.name}</option>
                  ))}
                </select>
                <Button block disabled={busy} onClick={() => void importWorldBank()}>
                  <Globe2 className="size-4" aria-hidden />
                  {t('ressources.stats.import')}
                </Button>
              </Card>

              <Card className="p-4">
                <form onSubmit={saveManual} className="space-y-2">
                  <p className="flex items-center gap-2 font-display text-sm font-bold text-navy dark:text-ink">
                    <Plus className="size-4 text-cobalt" aria-hidden />
                    {t('ressources.stats.manualTitle')}
                  </p>
                  <p className="text-xs text-ink-muted">{t('ressources.stats.manualHint')}</p>
                  <select aria-label={t('ressources.stats.theme')} className={SELECT} value={manual.theme} onChange={(event) => setManual({ ...manual, theme: event.target.value as StatTheme })}>
                    {STAT_THEMES.map((value) => (
                      <option key={value} value={value}>{t(`ressources.theme.${value}`)}</option>
                    ))}
                  </select>
                  {(['name', 'value', 'unit', 'year', 'source', 'sourceUrl', 'sourceUpdatedAt'] as const).map((key) => (
                    <Input
                      key={key}
                      aria-label={t(`ressources.stats.field.${key}`)}
                      placeholder={t(`ressources.stats.field.${key}`)}
                      required={key !== 'unit' && key !== 'sourceUrl'}
                      type={key === 'sourceUpdatedAt' ? 'date' : key === 'sourceUrl' ? 'url' : 'text'}
                      inputMode={key === 'value' || key === 'year' ? 'decimal' : undefined}
                      value={manual[key]}
                      onChange={(event) => setManual({ ...manual, [key]: event.target.value })}
                    />
                  ))}
                  <Button type="submit" block disabled={busy}>
                    {t('ressources.stats.save')}
                  </Button>
                </form>
              </Card>

              <CsvImport<IndicatorInput>
                title={t('ressources.stats.csvTitle')}
                columns={['theme', 'nom', 'valeur', 'unite', 'annee', 'source', 'lien', 'mise_a_jour']}
                example={['health', 'Cas de paludisme déclarés', '1234', 'cas', '2024', 'Ministère de la Santé (exemple)', 'https://exemple.org', '2025-01-15']}
                templateName="maso-statistiques-modele.csv"
                toItem={(row) => {
                  if (!(STAT_THEMES as readonly string[]).includes(row.theme)) return t('ressources.csv.invalidType', { types: STAT_THEMES.join(', ') })
                  const value = parseNumber(row.valeur ?? '')
                  const year = Number(row.annee)
                  if (!row.nom || value === null || !Number.isInteger(year)) return t('ressources.stats.invalidNumber')
                  if (!row.source || !/^\d{4}-\d{2}-\d{2}$/.test(row.mise_a_jour ?? '')) return t('ressources.stats.sourceRequired')
                  return { code: null, theme: row.theme as StatTheme, name: row.nom, value, unit: row.unite || null, year, source: row.source, sourceUrl: row.lien || null, sourceUpdatedAt: row.mise_a_jour }
                }}
                onImport={async (items) => {
                  const count = await addIndicators(items)
                  await load()
                  return count
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
