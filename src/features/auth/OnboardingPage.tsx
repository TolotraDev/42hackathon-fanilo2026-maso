import { FolderCheck, ShieldCheck, WifiOff, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { Button, Card } from '@/components/ui'
import { InstallApp } from '@/components/InstallApp'
import { cn } from '@/lib/cn'
import { AuthLayout } from './AuthLayout'
import { markOnboarded } from './onboarding'

const SLIDES: Array<{ id: 's1' | 's2' | 's3'; icon: LucideIcon }> = [
  { id: 's1', icon: ShieldCheck },
  { id: 's2', icon: FolderCheck },
  { id: 's3', icon: WifiOff },
]

/** M1 — Présentation en 3 écrans, choix de la langue et invitation à installer la PWA. */
export function OnboardingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const slide = SLIDES[index]
  const Icon = slide.icon
  const isLast = index === SLIDES.length - 1

  const finish = () => {
    markOnboarded()
    navigate('/connexion', { replace: true })
  }

  return (
    <AuthLayout>
      <Card className="space-y-6 p-6 text-center">
        <div className="flex justify-end">
          <button type="button" onClick={finish} className="min-h-9 px-2 text-sm font-semibold text-ink-muted hover:text-ink">
            {t('onboarding.skip')}
          </button>
        </div>

        <span className="mx-auto flex size-20 items-center justify-center rounded-3xl bg-cobalt/10 text-cobalt">
          <Icon className="size-10" aria-hidden />
        </span>
        <div className="space-y-2" aria-live="polite">
          <h1 className="font-display text-xl font-extrabold text-navy dark:text-ink">{t(`onboarding.${slide.id}Title`)}</h1>
          <p className="text-sm leading-relaxed text-ink-muted">{t(`onboarding.${slide.id}Text`)}</p>
        </div>

        {index === 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-ink-muted">{t('onboarding.chooseLanguage')}</p>
            <LanguageSwitcher className="justify-center" />
          </div>
        )}
        {isLast && <InstallApp variant="secondary" block />}

        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-1.5" role="img" aria-label={t('onboarding.step', { current: index + 1, total: SLIDES.length })}>
            {SLIDES.map((item, dot) => (
              <span key={item.id} className={cn('h-2 rounded-full transition-all', dot === index ? 'w-6 bg-cobalt' : 'w-2 bg-line')} />
            ))}
          </div>
          <Button onClick={isLast ? finish : () => setIndex(index + 1)} className="min-w-32">
            {isLast ? t('onboarding.start') : t('onboarding.next')}
          </Button>
        </div>
      </Card>
    </AuthLayout>
  )
}
