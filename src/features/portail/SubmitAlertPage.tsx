import { CheckCircle2, Copy, Megaphone, ShieldQuestion } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button, Card, Input, SectionTitle, Textarea } from '@/components/ui'
import { FormMessage } from '@/features/auth/FormMessage'
import { FileDrop } from '@/features/verifier/FileDrop'
import { MADAGASCAR_REGIONS } from '@/lib/regions'
import type { Language } from '@/types/domain'
import { fingerprint, linkClues, type FileFingerprint } from './clues'
import { HumanNotice, ReportCardView, usePortalError } from './components'
import { PORTAL_SELECT } from './PortalHomePage'
import { MAX_ALERT_FILE_BYTES, portalApi } from './portalApi'
import type { AlertReceipt } from './types'

const PLATFORMS = ['facebook', 'whatsapp', 'tiktok', 'youtube', 'x', 'radio', 'other'] as const
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

/** W0 — Signaler sans compte : fichier ou lien, texte, plateforme, contact facultatif, code de suivi. */
export function SubmitAlertPage() {
  const { t, i18n } = useTranslation()
  const portalError = usePortalError()
  const empty = { text: '', url: '', platform: '', region: '', contact: '', trap: '' }
  const [form, setForm] = useState(empty)
  const [file, setFile] = useState<File | null>(null)
  const [print, setPrint] = useState<FileFingerprint | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<AlertReceipt | null>(null)
  const [copied, setCopied] = useState(false)

  const pickFile = async (picked: File | null) => {
    setFile(null)
    setPrint(null)
    setFileError(null)
    if (!picked) return
    if (!ACCEPTED.includes(picked.type)) return setFileError(t('portail.submit.fileType'))
    if (picked.size > MAX_ALERT_FILE_BYTES) return setFileError(t('portail.submit.fileSize'))
    setFile(picked)
    setPrint(await fingerprint(picked).catch(() => null))
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const result = await portalApi().submit({
        ...form,
        language: (i18n.resolvedLanguage ?? 'fr') as Language,
        file,
        sha256: print?.sha256 ?? null,
        phash: print?.phash ?? null,
      })
      setReceipt(result)
    } catch (caught) {
      setError(portalError(caught))
    } finally {
      setBusy(false)
    }
  }

  if (receipt) {
    const link = form.url ? linkClues(form.url) : null
    return (
      <div className="space-y-4" aria-live="polite">
        {receipt.matches.length > 0 ? (
          <Card className="space-y-3 border-success p-4">
            <p className="flex items-center gap-2 font-display text-lg font-bold text-success">
              <CheckCircle2 className="size-5" aria-hidden />
              {t('portail.submit.alreadyChecked')}
            </p>
            <p className="text-sm text-ink">{t('portail.submit.alreadyCheckedHint')}</p>
            <div className="grid gap-3 md:grid-cols-2">
              {receipt.matches.map((card) => <ReportCardView key={card.public_id} card={card} />)}
            </div>
          </Card>
        ) : (
          <Card className="space-y-3 p-4">
            <p className="flex items-center gap-2 font-display text-lg font-bold text-navy dark:text-ink">
              <ShieldQuestion className="size-5 text-cobalt" aria-hidden />
              {t('portail.submit.notVerified')}
            </p>
            <p className="text-sm text-ink">{t('portail.submit.forwarded')}</p>
            {(print || link) && (
              <div className="space-y-1.5 rounded-xl bg-canvas p-3 text-sm text-ink">
                <p className="text-xs font-semibold uppercase text-ink-muted">{t('portail.submit.clues')}</p>
                {print && <p>{t(`verifier.image.metadata.${print.finding}`, { software: print.software ?? '' })}</p>}
                {link?.clues.map((clue) => <p key={clue}>{t(`portail.submit.link.${clue}`, { domain: link.domain })}</p>)}
                <p className="text-xs text-ink-muted">{t('portail.submit.cluesHint')}</p>
              </div>
            )}
          </Card>
        )}
        <Card className="space-y-2 p-4">
          <SectionTitle>{t('portail.submit.trackingCode')}</SectionTitle>
          {receipt.duplicate && <p className="text-sm text-ink">{t('portail.submit.duplicate')}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-2xl font-bold tracking-widest text-navy dark:text-ink" aria-label={t('portail.submit.trackingCode')}>{receipt.tracking_code}</p>
            <Button variant="secondary" className="min-h-10" onClick={() => void navigator.clipboard.writeText(receipt.tracking_code).then(() => setCopied(true), () => undefined)}>
              <Copy className="size-4" aria-hidden />
              {copied ? t('portail.share.copied') : t('portail.submit.copyCode')}
            </Button>
          </div>
          <p className="text-xs text-ink-muted">{t('portail.submit.trackingHint')}</p>
          <Link to={`/portail/suivi/${receipt.tracking_code}`} className="text-sm font-semibold text-cobalt hover:underline">{t('portail.submit.trackNow')}</Link>
        </Card>
        <Button variant="secondary" onClick={() => { setReceipt(null); setForm(empty); setFile(null); setPrint(null); setCopied(false) }}>
          {t('portail.submit.another')}
        </Button>
        <HumanNotice />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 font-display text-xl font-extrabold text-navy dark:text-ink">
          <Megaphone className="size-5 text-cobalt" aria-hidden />
          {t('portail.submit.title')}
        </h1>
        <p className="text-sm text-ink-muted">{t('portail.submit.subtitle')}</p>
      </div>
      <Card className="p-4">
        <form className="space-y-4" onSubmit={(event) => void submit(event)}>
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-ink">{t('portail.submit.file')}</p>
            {file ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-canvas px-3 py-2 text-sm text-ink">
                <span className="min-w-0 flex-1 truncate">{file.name} — {Math.round(file.size / 1024)} Ko</span>
                <Button variant="ghost" className="min-h-9 text-xs" onClick={() => void pickFile(null)}>{t('portail.submit.removeFile')}</Button>
              </div>
            ) : (
              <FileDrop kind="image" onFile={(picked) => void pickFile(picked)} />
            )}
            {fileError && <FormMessage tone="error">{fileError}</FormMessage>}
            <p className="text-xs text-ink-muted">{t('portail.submit.fileHint')}</p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="alert-url" className="text-sm font-semibold text-ink">{t('portail.submit.url')}</label>
            <Input id="alert-url" type="url" inputMode="url" maxLength={2048} value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="https://" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="alert-text" className="text-sm font-semibold text-ink">{t('portail.submit.text')}</label>
            <Textarea id="alert-text" rows={4} maxLength={2000} value={form.text} onChange={(event) => setForm({ ...form, text: event.target.value })} placeholder={t('portail.submit.textPlaceholder')} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="alert-platform" className="text-sm font-semibold text-ink">{t('portail.submit.platform')}</label>
              <select id="alert-platform" className={PORTAL_SELECT} value={form.platform} onChange={(event) => setForm({ ...form, platform: event.target.value })}>
                <option value="">—</option>
                {PLATFORMS.map((platform) => (
                  <option key={platform} value={platform}>{t(`portail.platform.${platform}`)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="alert-region" className="text-sm font-semibold text-ink">{t('portail.filter.region')}</label>
              <select id="alert-region" className={PORTAL_SELECT} value={form.region} onChange={(event) => setForm({ ...form, region: event.target.value })}>
                <option value="">—</option>
                {MADAGASCAR_REGIONS.map((region) => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="alert-contact" className="text-sm font-semibold text-ink">{t('portail.submit.contact')}</label>
            <Input id="alert-contact" maxLength={200} value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} />
            <p className="text-xs text-ink-muted">{t('portail.submit.contactHint')}</p>
          </div>
          {/* Champ piège : invisible pour les personnes, rempli par les robots (anti-abus). */}
          <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label htmlFor="alert-website">Website</label>
            <input id="alert-website" tabIndex={-1} autoComplete="off" value={form.trap} onChange={(event) => setForm({ ...form, trap: event.target.value })} />
          </div>
          {error && <FormMessage tone="error">{error}</FormMessage>}
          <Button type="submit" block disabled={busy || (!file && !form.url.trim() && !form.text.trim())}>
            <Megaphone className="size-4" aria-hidden />
            {busy ? t('portail.submit.sending') : t('portail.submit.send')}
          </Button>
          <p className="text-xs text-ink-muted">{t('portail.submit.privacy')}</p>
        </form>
      </Card>
      <HumanNotice />
    </div>
  )
}
