import { useTranslation } from 'react-i18next'
import { CASE_STATUS_TONES, VERDICT_TONES, type AlertLevel, type CaseStatus, type Tone, type Verdict } from '@/types/domain'
import { Badge } from './Badge'

export function VerdictBadge({ verdict, solid = true }: { verdict: Verdict; solid?: boolean }) {
  const { t } = useTranslation()
  return (
    <Badge tone={VERDICT_TONES[verdict]} solid={solid}>
      {t(`verdict.${verdict}`)}
    </Badge>
  )
}

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  const { t } = useTranslation()
  return <Badge tone={CASE_STATUS_TONES[status]}>{t(`caseStatus.${status}`)}</Badge>
}

const ALERT_LEVEL_TONES: Record<AlertLevel, Tone> = { low: 'neutral', medium: 'warning', high: 'danger' }

export function AlertLevelBadge({ level }: { level: AlertLevel }) {
  const { t } = useTranslation()
  return <Badge tone={ALERT_LEVEL_TONES[level]}>{t(`alertLevel.${level}`)}</Badge>
}
