import { CircleAlert, Copy, MessageCircle, Share2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, VerdictBadge } from '@/components/ui'
import type { ReportCard } from './types'

export function useFormatDate() {
  const { i18n } = useTranslation()
  return (iso: string, withTime = false) =>
    new Intl.DateTimeFormat(i18n.resolvedLanguage, withTime ? { dateStyle: 'long', timeStyle: 'short' } : { dateStyle: 'long' }).format(new Date(iso))
}

/** Adresse publique d'un rapport (lien partagé, QR). */
export const reportUrl = (publicId: string) => `${window.location.origin}/portail/rapports/${publicId}`
export const verifyUrl = (publicId: string) => `${window.location.origin}/portail/verifier/${publicId}`

/** Carte d'un rapport publié : le verdict est toujours écrit. */
export function ReportCardView({ card, to }: { card: ReportCard; to?: string }) {
  const { t } = useTranslation()
  const formatDate = useFormatDate()
  return (
    <Link to={to ?? `/portail/rapports/${card.public_id}`} className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-cobalt">
      <Card className="h-full space-y-2 p-4 transition hover:border-cobalt">
        <div className="flex flex-wrap items-center gap-1.5">
          <VerdictBadge verdict={card.verdict} />
          {card.reason && <Badge tone="info">{t(`portail.reason.${card.reason}`)}</Badge>}
          {card.corrected && <Badge>{t('portail.corrected')}</Badge>}
        </div>
        <h3 className="font-display text-base font-bold leading-snug text-navy dark:text-ink">{card.title}</h3>
        {card.claim && <p className="line-clamp-2 text-sm italic text-ink-muted">« {card.claim} »</p>}
        <p className="line-clamp-3 text-sm text-ink">{card.summary}</p>
        <p className="text-xs text-ink-muted">
          {[formatDate(card.published_at), card.newsroom, card.region, card.theme].filter(Boolean).join(' · ')} · {card.public_id}
        </p>
      </Card>
    </Link>
  )
}

/** QR code d'une adresse (généré sur l'appareil). */
export function QrImage({ value, label, size = 160 }: { value: string; label: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    void import('qrcode').then(({ toDataURL }) =>
      toDataURL(value, { margin: 1, width: size * 2, errorCorrectionLevel: 'M', color: { dark: '#0A2F4F', light: '#FFFFFF' } }).then((url) => !cancelled && setSrc(url)),
    )
    return () => {
      cancelled = true
    }
  }, [value, size])
  return src ? <img src={src} alt={label} width={size} height={size} className="rounded-xl bg-white p-1" /> : <div style={{ width: size, height: size }} className="rounded-xl bg-line" />
}

/** Aperçu du partage (Facebook / WhatsApp) et boutons de partage. */
export function SharePanel({ title, description, url }: { title: string; description: string; url: string }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const text = `${title}\n${url}`
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-line bg-canvas" aria-label={t('portail.share.preview')}>
        <div className="flex items-center gap-2 bg-navy px-3 py-2 text-xs font-bold uppercase tracking-wide text-white">
          <img src="/favicon.svg" alt="" className="size-5 rounded" />
          MASO
        </div>
        <div className="space-y-1 p-3">
          <p className="text-[11px] uppercase text-ink-muted">{new URL(url).host}</p>
          <p className="text-sm font-bold text-ink">{title}</p>
          <p className="line-clamp-2 text-xs text-ink-muted">{description}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#25D366] px-3 text-sm font-semibold text-[#0b3d1f] hover:brightness-105"
        >
          <MessageCircle className="size-4" aria-hidden />
          WhatsApp
        </a>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#1877F2] px-3 text-sm font-semibold text-white hover:brightness-110"
        >
          <Share2 className="size-4" aria-hidden />
          Facebook
        </a>
        <Button
          variant="secondary"
          className="min-h-10"
          onClick={() =>
            void navigator.clipboard.writeText(url).then(
              () => setCopied(true),
              () => setCopied(false),
            )
          }
        >
          <Copy className="size-4" aria-hidden />
          {copied ? t('portail.share.copied') : t('portail.share.copy')}
        </Button>
      </div>
    </div>
  )
}

/** Rappel permanent du portail : aucun verdict n'est produit par une machine. */
export function HumanNotice() {
  const { t } = useTranslation()
  return (
    <p className="flex items-start gap-2 rounded-xl bg-cobalt/8 px-3 py-2 text-xs text-ink">
      <CircleAlert className="mt-0.5 size-4 shrink-0 text-cobalt" aria-hidden />
      {t('portail.humanNotice')}
    </p>
  )
}

export function usePortalError() {
  const { t } = useTranslation()
  return (error: unknown) => {
    const code = (error as { code?: string })?.code ?? 'unknown'
    return t(`portail.error.${code}`, { defaultValue: t('portail.error.unknown') })
  }
}
