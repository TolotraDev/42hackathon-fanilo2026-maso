import { AlertTriangle, BadgeCheck, ExternalLink, Globe2, Plus, Scale } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge, Button, Card, Input } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthProvider'
import { FormMessage } from '@/features/auth/FormMessage'
import { useAuthErrorMessage } from '@/features/auth/useAuthError'
import { AttachToCase } from '@/features/verifier/AttachToCase'
import { isPersistenceAvailable } from '@/features/verifier/verificationApi'
import { cn } from '@/lib/cn'
import { loadWithPack } from '@/lib/offlineCache'
import { CsvImport } from './CsvImport'
import { PackNotice } from './PackNotice'
import { BackToResources } from './PersonPage'
import { addIndicators, listIndicators, validateIndicator } from './resourcesApi'
import { compare, groupIndicators, isStale, parseNumber, STALE_AFTER_YEARS } from './rules'
import {
  canManageResources,
  STAT_THEMES,
  type Indicator,
  type IndicatorInput,
  type StatTheme,
} from './types'
import type { PackState } from './useResources'
import { fetchWorldBank, WORLD_BANK_CATALOG } from './worldBank'

const SELECT =
  'min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink transition-colors duration-150 hover:border-cobalt/50 focus:border-cobalt focus:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/20'

// Couleurs par thème (basées sur les clés exactes de ton type StatTheme)
const THEME_COLORS: Record<StatTheme, { hex: string; border: string; bg: string; text: string }> = {
  demography: { hex: '#1976D2', border: 'border-t-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
  health: { hex: '#D64545', border: 'border-t-red-500', bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400' },
  education: { hex: '#8B5CF6', border: 'border-t-purple-500', bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400' },
  economy: { hex: '#2E9E5B', border: 'border-t-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  climate: { hex: '#0EA5E9', border: 'border-t-sky-500', bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400' }, // Remplacé environment par climate
  elections: { hex: '#F59E0B', border: 'border-t-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
}

function useNumberFormat() {
  const { i18n } = useTranslation()
  return useMemo(
    () => (value: number) =>
      new Intl.NumberFormat(i18n.resolvedLanguage, {
        maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 1,
      }).format(value),
    [i18n.resolvedLanguage],
  )
}

// --- TOOLTIP PERSONNALISÉ ---
function CustomTooltip({ active, payload, label, unit }: any) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="rounded-xl border border-line bg-surface p-3 shadow-lg backdrop-blur-sm z-50">
      <p className="mb-1 text-xs font-semibold text-ink-muted">{label}</p>
      <p className="font-display text-sm font-bold text-cobalt">
        {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(payload[0].value)} {unit}
      </p>
    </div>
  )
}

// --- CARTE D'INDICATEUR ---
function IndicatorCard({
  latest,
  history,
  manager,
  onValidate,
  index,
}: {
  latest: Indicator
  history: Indicator[]
  manager: boolean
  onValidate: (id: string) => void
  index: number
}) {
  const { t, i18n } = useTranslation()
  const format = useNumberFormat()
  const stale = isStale(latest)
  const updated = new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium' }).format(
    new Date(latest.sourceUpdatedAt),
  )

  // Récupère la couleur du thème ou un fallback
  const colors = THEME_COLORS[latest.theme as StatTheme] || THEME_COLORS.demography

  return (
    <Card
      className={cn(
        'dashboard-rise group flex flex-col p-5 transition-all duration-200 hover:shadow-md',
        'border-t-4', colors.border
      )}
      style={{ '--i': Math.min(index, 8) } as CSSProperties}
    >
      {/* En-tête : Titre et Badge */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <span className={cn("inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider mb-1", colors.bg, colors.text)}>
            {t(`ressources.theme.${latest.theme}`)}
          </span>
          <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-tight text-ink transition-colors group-hover:text-cobalt">
            {latest.name}
          </h3>
        </div>
        {stale && (
          <Badge tone="warning" className="shrink-0">
            <AlertTriangle className="mr-1 size-3" aria-hidden />
            {t('ressources.stats.stale')}
          </Badge>
        )}
      </div>

      {/* Valeur principale mise en avant */}
      <div className="mb-4 flex items-baseline gap-1.5">
        <span className="font-display text-3xl font-extrabold tracking-tight text-navy dark:text-ink">
          {format(latest.value)}
        </span>
        <span className="text-sm font-medium text-ink-muted">{latest.unit}</span>
      </div>

      {/* Métadonnées (Année, Avertissement) */}
      <div className="mb-4 space-y-1">
        <p className="text-xs font-medium text-ink">
          {t('ressources.stats.year', { year: latest.year })}
        </p>
        {stale && (
          <p className="text-[11px] leading-tight text-warning/90">
            {t('ressources.stats.staleHint', { years: STALE_AFTER_YEARS })}
          </p>
        )}
      </div>

      {/* Graphique (si historique) */}
      {history.length > 1 && (
        <div
          className="mb-4 h-24 w-full -ml-2"
          aria-label={t('ressources.stats.chart', { name: latest.name })}
          role="img"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={history.map((item) => ({ year: item.year, value: item.value }))}
              margin={{ top: 5, right: 5, left: 5, bottom: 0 }}
            >
              <XAxis
                dataKey="year"
                tick={{ fontSize: 10, fill: 'rgb(var(--ink-muted))' }}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip
                content={<CustomTooltip unit={latest.unit} />}
                cursor={{ stroke: colors.hex, strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={colors.hex}
                strokeWidth={2.5}
                dot={{ r: 3, fill: 'rgb(var(--surface))', strokeWidth: 2, stroke: colors.hex }}
                activeDot={{ r: 5, fill: colors.hex, strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Pied de carte : Source */}
      <div className="mt-auto space-y-1.5 border-t border-line/60 pt-3 text-[11px] text-ink-muted">
        <p className="line-clamp-2">
          {t('ressources.stats.source')} :{' '}
          {latest.sourceUrl ? (
            <a
              href={latest.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-medium text-cobalt hover:text-cobalt/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt rounded"
            >
              {latest.source}
              <ExternalLink className="size-3 shrink-0" aria-hidden />
            </a>
          ) : (
            <span className="font-medium text-ink">{latest.source}</span>
          )}
        </p>
        <p>{t('ressources.stats.updated', { date: updated })}</p>
        
        {!latest.validated && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge tone="warning">{t('ressources.stats.notValidated')}</Badge>
            {manager && (
              <button
                type="button"
                onClick={() => onValidate(latest.id)}
                className="inline-flex min-h-7 items-center gap-1.5 rounded-lg bg-cobalt/10 px-2 text-xs font-semibold text-cobalt transition-colors hover:bg-cobalt/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt"
              >
                <BadgeCheck className="size-3.5" aria-hidden />
                {t('ressources.person.validate')}
              </button>
            )}
          </div>
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
  const [feedback, setFeedback] = useState<{ tone: 'error' | 'success'; text: string } | null>(
    null,
  )
  const [busy, setBusy] = useState(false)
  const [comparison, setComparison] = useState({ key: '', claimed: '', claim: '' })
  const [worldBankCode, setWorldBankCode] = useState('all')
  const [manual, setManual] = useState({
    theme: 'demography' as StatTheme,
    name: '',
    value: '',
    unit: '',
    year: '',
    source: '',
    sourceUrl: '',
    sourceUpdatedAt: '',
  })

  const isGuest = role === 'public'
  const canEdit = isPersistenceAvailable() && !isGuest
  const manager = canManageResources(role)

  const load = useCallback(async () => {
    setFeedback(null)
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
  const visible = useMemo(
    () => groups.filter((group) => !theme || group.latest.theme === theme),
    [groups, theme],
  )
  const selected = groups.find((group) => group.key === comparison.key)?.latest
  const claimed = parseNumber(comparison.claimed)
  const result = selected && claimed !== null ? compare(claimed, selected.value) : null

  const act = async (action: () => Promise<string>) => {
    setBusy(true)
    setFeedback(null)
    try {
      const text = await action()
      await load()
      setFeedback({ tone: 'success', text })
    } catch (failure) {
      setFeedback({ tone: 'error', text: errorMessage(failure) })
    } finally {
      setBusy(false)
    }
  }

  const importWorldBank = () =>
    act(async () => {
      const codes =
        worldBankCode === 'all' ? WORLD_BANK_CATALOG.map((item) => item.code) : [worldBankCode]
      const rows = (await Promise.all(codes.map(fetchWorldBank))).flat()
      return t('ressources.csv.imported', { count: await addIndicators(rows) })
    })

  const saveManual = (event: React.FormEvent) => {
    event.preventDefault()
    const value = parseNumber(manual.value)
    const year = Number(manual.year)
    if (value === null || !Number.isInteger(year))
      return setFeedback({ tone: 'error', text: t('ressources.stats.invalidNumber') })
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

      {/* Chips de thème colorées */}
      <div className="dashboard-fade flex flex-wrap gap-2">
        {(['', ...STAT_THEMES] as const).map((value) => {
          const isActive = theme === value
          const themeColor = value ? THEME_COLORS[value as StatTheme]?.hex : '#1976D2'
          
          return (
            <button
              key={value || 'all'}
              type="button"
              aria-pressed={isActive}
              onClick={() => setTheme(value)}
              style={isActive ? { backgroundColor: themeColor, borderColor: themeColor } : undefined}
              className={cn(
                'min-h-9 rounded-full border px-3.5 text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt',
                isActive
                  ? 'text-white shadow-sm'
                  : 'border-line bg-surface text-ink-muted hover:border-cobalt/40 hover:text-cobalt',
              )}
            >
              {value ? t(`ressources.theme.${value}`) : t('veille.all')}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem] xl:grid-rows-[auto_1fr] xl:items-start">
        {/* Colonne de droite (outils) */}
        <div className="space-y-4 xl:col-start-2 xl:row-start-1">
          <Card className="dashboard-rise space-y-3 p-4" style={{ '--i': 0 } as CSSProperties}>
            <p className="flex items-center gap-2 font-display text-sm font-bold text-navy dark:text-ink">
              <Scale className="size-4 text-cobalt" aria-hidden />
              {t('ressources.stats.compareTitle')}
            </p>
            <p className="text-xs text-ink-muted">{t('ressources.stats.compareHint')}</p>
            <select
              aria-label={t('ressources.stats.indicator')}
              className={SELECT}
              value={comparison.key}
              onChange={(event) => setComparison({ ...comparison, key: event.target.value })}
            >
              <option value="">{t('ressources.stats.indicator')}</option>
              {groups.map((group) => (
                <option key={group.key} value={group.key}>
                  {group.latest.name}
                </option>
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
              <div
                className="dashboard-fade space-y-1 rounded-xl border border-cobalt/20 bg-cobalt/5 p-3 text-sm text-ink"
                aria-live="polite"
              >
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
                {isStale(selected) && (
                  <p className="text-xs text-warning">
                    {t('ressources.stats.staleHint', { years: STALE_AFTER_YEARS })}
                  </p>
                )}
              </div>
            )}
          </Card>

          {result && selected && canEdit && role !== 'admin' && (
            <AttachToCase
              evidence={(origin) => ({
                type: 'analysis',
                url: selected.sourceUrl ?? undefined,
                origin: origin || null,
                analysis: {
                  version: 1,
                  kind: 'statistic_comparison',
                  analysed_at: new Date().toISOString(),
                  claimed: result.claimed,
                  official: {
                    value: selected.value,
                    unit: selected.unit,
                    year: selected.year,
                    source: selected.source,
                    source_url: selected.sourceUrl,
                    source_updated_at: selected.sourceUpdatedAt,
                    indicator: selected.name,
                    code: selected.code,
                  },
                  difference: result.difference,
                  percent: result.percent,
                },
              })}
            />
          )}
        </div>

        {/* Colonne centrale : cartes d'indicateurs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:col-start-1 xl:row-span-2 xl:row-start-1 2xl:grid-cols-3">
          {indicators === null &&
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={`skeleton-${i}`} className="flex flex-col gap-2 p-4">
                <div className="h-4 w-2/3 animate-pulse rounded bg-line" />
                <div className="h-8 w-1/2 animate-pulse rounded bg-line" />
                <div className="h-16 w-full animate-pulse rounded bg-line" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-line" />
              </Card>
            ))}

          {visible.map((group, index) => (
            <IndicatorCard
              key={group.key}
              latest={group.latest}
              history={group.history}
              manager={manager && canEdit}
              index={index}
              onValidate={(id) =>
                void act(async () => {
                  await validateIndicator(id)
                  return t('ressources.stats.saved')
                })
              }
            />
          ))}

          {indicators !== null && visible.length === 0 && (
            <Card className="dashboard-fade col-span-full flex flex-col items-center justify-center p-8 text-center text-ink-muted">
              <AlertTriangle className="mb-2 size-8 text-line" />
              <p className="text-sm">{t('common.noResult')}</p>
            </Card>
          )}
        </div>

        {/* Colonne de droite (imports) */}
        <div className="space-y-4 xl:col-start-2 xl:row-start-2">
          {canEdit && (
            <>
              <Card
                className="dashboard-rise space-y-3 p-4 border-t-4 border-t-emerald-500"
                style={{ '--i': 5 } as CSSProperties}
              >
                <p className="flex items-center gap-2 font-display text-sm font-bold text-navy dark:text-ink">
                  <Globe2 className="size-4 text-emerald-500" aria-hidden />
                  {t('ressources.stats.worldBankTitle')}
                </p>
                <p className="text-xs text-ink-muted">{t('ressources.stats.worldBankHint')}</p>
                <select
                  aria-label={t('ressources.stats.indicator')}
                  className={SELECT}
                  value={worldBankCode}
                  onChange={(event) => setWorldBankCode(event.target.value)}
                >
                  <option value="all">
                    {t('ressources.stats.allIndicators', { count: WORLD_BANK_CATALOG.length })}
                  </option>
                  {WORLD_BANK_CATALOG.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <Button block disabled={busy} onClick={() => void importWorldBank()} className="bg-emerald-600 hover:bg-emerald-700 text-white border-transparent">
                  <Globe2 className="size-4" aria-hidden />
                  {t('ressources.stats.import')}
                </Button>
              </Card>

              <Card
                className="dashboard-rise p-4 border-t-4 border-t-purple-500"
                style={{ '--i': 6 } as CSSProperties}
              >
                <form onSubmit={saveManual} className="space-y-2">
                  <p className="flex items-center gap-2 font-display text-sm font-bold text-navy dark:text-ink">
                    <Plus className="size-4 text-purple-500" aria-hidden />
                    {t('ressources.stats.manualTitle')}
                  </p>
                  <p className="text-xs text-ink-muted">{t('ressources.stats.manualHint')}</p>
                  <select
                    aria-label={t('ressources.stats.theme')}
                    className={SELECT}
                    value={manual.theme}
                    onChange={(event) =>
                      setManual({ ...manual, theme: event.target.value as StatTheme })
                    }
                  >
                    {STAT_THEMES.map((value) => (
                      <option key={value} value={value}>
                        {t(`ressources.theme.${value}`)}
                      </option>
                    ))}
                  </select>
                  {(
                    [
                      'name',
                      'value',
                      'unit',
                      'year',
                      'source',
                      'sourceUrl',
                      'sourceUpdatedAt',
                    ] as const
                  ).map((key) => (
                    <Input
                      key={key}
                      aria-label={t(`ressources.stats.field.${key}`)}
                      placeholder={t(`ressources.stats.field.${key}`)}
                      required={key !== 'unit' && key !== 'sourceUrl'}
                      type={
                        key === 'sourceUpdatedAt'
                          ? 'date'
                          : key === 'sourceUrl'
                            ? 'url'
                            : 'text'
                      }
                      inputMode={key === 'value' || key === 'year' ? 'decimal' : undefined}
                      value={manual[key]}
                      onChange={(event) => setManual({ ...manual, [key]: event.target.value })}
                    />
                  ))}
                  <Button type="submit" block disabled={busy} className="bg-purple-600 hover:bg-purple-700 text-white border-transparent">
                    {t('ressources.stats.save')}
                  </Button>
                </form>
              </Card>

              <div
                className="dashboard-rise"
                style={{ '--i': 7 } as CSSProperties}
              >
                <CsvImport<IndicatorInput>
                  title={t('ressources.stats.csvTitle')}
                  columns={[
                    'theme',
                    'nom',
                    'valeur',
                    'unite',
                    'annee',
                    'source',
                    'lien',
                    'mise_a_jour',
                  ]}
                  example={[
                    'health',
                    'Cas de paludisme déclarés',
                    '1234',
                    'cas',
                    '2024',
                    'Ministère de la Santé (exemple)',
                    'https://exemple.org',
                    '2025-01-15',
                  ]}
                  templateName="maso-statistiques-modele.csv"
                  toItem={(row) => {
                    if (!(STAT_THEMES as readonly string[]).includes(row.theme))
                      return t('ressources.csv.invalidType', { types: STAT_THEMES.join(', ') })
                    const value = parseNumber(row.valeur ?? '')
                    const year = Number(row.annee)
                    if (!row.nom || value === null || !Number.isInteger(year))
                      return t('ressources.stats.invalidNumber')
                    if (
                      !row.source ||
                      !/^\d{4}-\d{2}-\d{2}$/.test(row.mise_a_jour ?? '')
                    )
                      return t('ressources.stats.sourceRequired')
                    return {
                      code: null,
                      theme: row.theme as StatTheme,
                      name: row.nom,
                      value,
                      unit: row.unite || null,
                      year,
                      source: row.source,
                      sourceUrl: row.lien || null,
                      sourceUpdatedAt: row.mise_a_jour,
                    }
                  }}
                  onImport={async (items) => {
                    const count = await addIndicators(items)
                    await load()
                    return count
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}