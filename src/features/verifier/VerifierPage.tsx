import { Clock3, FileText, Image, Link2, Video, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card, Input, SectionTitle, VerdictBadge } from '@/components/ui'
import { VERDICTS } from '@/types/domain'

const INPUTS: Array<{ id: 'image' | 'video' | 'link' | 'text'; icon: LucideIcon }> = [
  { id: 'image', icon: Image },
  { id: 'video', icon: Video },
  { id: 'link', icon: Link2 },
  { id: 'text', icon: FileText },
]

const STEPS = [
  { title: 'verifier.step.claim', hint: 'verifier.step.claimHint' },
  { title: 'verifier.step.existing', hint: 'verifier.step.existingHint' },
  { title: 'verifier.step.clues', hint: 'verifier.step.clueHint' },
] as const

/** M3 — Hub Vérifier (maquette « Fact-checking tool »). Le moteur d'analyse arrive en MOD-03. */
export function VerifierPage() {
  const { t } = useTranslation()
  const [claim, setClaim] = useState('')
  const [submitted, setSubmitted] = useState<string | null>(null)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
      <div className="space-y-4">
        <Card className="p-4">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (claim.trim()) setSubmitted(claim.trim())
            }}
            className="space-y-3"
          >
            <label htmlFor="claim" className="block font-display text-sm font-bold text-navy dark:text-ink">
              {t('verifier.claimLabel')}
            </label>
            <Input id="claim" value={claim} onChange={(event) => setClaim(event.target.value)} placeholder={t('verifier.claimPlaceholder')} />
            <Button type="submit" block disabled={!claim.trim()}>
              {t('verifier.submit')}
            </Button>
          </form>
        </Card>

        <section>
          <SectionTitle>{t('verifier.importTitle')}</SectionTitle>
          <div className="grid grid-cols-4 gap-2">
            {INPUTS.map(({ id, icon: Icon }) => (
              <Card key={id} className="flex flex-col items-center gap-1.5 px-1 py-3 text-xs font-semibold text-ink">
                <span className="flex size-10 items-center justify-center rounded-xl bg-cobalt/10 text-cobalt">
                  <Icon className="size-5" aria-hidden />
                </span>
                {t(`verifier.input.${id}`)}
              </Card>
            ))}
          </div>
        </section>

        <Card className="p-4">
          <SectionTitle>{t('verifier.stepsTitle')}</SectionTitle>
          {submitted && <p className="mb-3 rounded-xl bg-canvas px-3 py-2 text-sm italic text-ink">« {submitted} »</p>}
          <ol className="space-y-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-cobalt text-xs font-bold text-white">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{t(step.title)}</p>
                  <p className="text-xs text-ink-muted">{t(step.hint)}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 self-start text-xs text-ink-muted">
                  <Clock3 className="size-3.5" aria-hidden />
                  {t('verifier.stepState.pending')}
                </span>
              </li>
            ))}
          </ol>
          {submitted && <p className="mt-3 text-xs text-ink-muted">{t('common.comingWith', { module: 'MOD-03' })}</p>}
        </Card>
      </div>

      <Card className="p-4">
        <SectionTitle>{t('verifier.verdictScale')}</SectionTitle>
        <p className="mb-3 text-xs text-ink-muted">{t('verifier.verdictScaleHint')}</p>
        <ul className="divide-y divide-line">
          {VERDICTS.map((verdict) => (
            <li key={verdict} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-start sm:gap-3">
              <span className="sm:w-36 sm:shrink-0">
                <VerdictBadge verdict={verdict} />
              </span>
              <span className="text-sm text-ink">{t(`verdictDefinition.${verdict}`)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
