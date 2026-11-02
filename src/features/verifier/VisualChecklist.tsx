import { useTranslation } from 'react-i18next'
import { Card, Input } from '@/components/ui'

export const VISUAL_ITEMS = ['shadows', 'weather', 'signs', 'language', 'plates', 'vegetation'] as const
export type VisualItem = (typeof VISUAL_ITEMS)[number]
export const VISUAL_STATES = ['unchecked', 'consistent', 'inconsistent', 'not_applicable'] as const
export type VisualState = (typeof VISUAL_STATES)[number]
export type VisualChecklistValue = Record<VisualItem, { state: VisualState; note: string }>

export const emptyVisualChecklist = (): VisualChecklistValue =>
  Object.fromEntries(VISUAL_ITEMS.map((item) => [item, { state: 'unchecked', note: '' }])) as VisualChecklistValue

const SELECT = 'min-h-10 rounded-lg border border-line bg-canvas px-2 text-xs text-ink focus:border-cobalt focus:outline-none'

/** Checklist visuelle (M4) : ce que le journaliste observe lui-même sur l'image. */
export function VisualChecklist({ value, onChange }: { value: VisualChecklistValue; onChange: (next: VisualChecklistValue) => void }) {
  const { t } = useTranslation()
  return (
    <Card className="p-4">
      <p className="font-display text-sm font-bold text-navy dark:text-ink">{t('verifier.visual.title')}</p>
      <p className="mb-3 text-xs text-ink-muted">{t('verifier.visual.hint')}</p>
      <ul className="space-y-3">
        {VISUAL_ITEMS.map((item) => (
          <li key={item} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor={`visual-${item}`} className="text-sm text-ink">
                {t(`verifier.visual.${item}`)}
              </label>
              <select
                id={`visual-${item}`}
                className={SELECT}
                value={value[item].state}
                onChange={(event) => onChange({ ...value, [item]: { ...value[item], state: event.target.value as VisualState } })}
              >
                {VISUAL_STATES.map((state) => (
                  <option key={state} value={state}>
                    {t(`verifier.visual.state.${state}`)}
                  </option>
                ))}
              </select>
            </div>
            {value[item].state !== 'unchecked' && value[item].state !== 'not_applicable' && (
              <Input
                aria-label={`${t(`verifier.visual.${item}`)} — ${t('verifier.visual.note')}`}
                placeholder={t('verifier.visual.note')}
                value={value[item].note}
                onChange={(event) => onChange({ ...value, [item]: { ...value[item], note: event.target.value } })}
                className="min-h-10"
              />
            )}
          </li>
        ))}
      </ul>
    </Card>
  )
}
