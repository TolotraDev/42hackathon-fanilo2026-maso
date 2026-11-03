// Rapport public en PDF, généré sur l'appareil (bibliothèque W7 et page publique).
import type { TFunction } from 'i18next'
import { casePdf } from '@/features/dossiers/exportCase'
import type { PublicReport } from './types'

export function publicReportPdf(report: PublicReport, t: TFunction, formatDate: (iso: string) => string, url: string): Promise<Blob> {
  const sections = [
    { title: t('portail.report.verdict'), lines: [`${t(`verdict.${report.verdict}`)}${report.confidence ? ` — ${t('dossiers.verdict.confidence')} : ${t(`confidence.${report.confidence}`)}` : ''}`] },
    { title: t('portail.report.claim'), lines: [report.claim || '—'] },
    { title: t('portail.report.summary'), lines: [report.summary] },
    { title: t('portail.report.explanation'), lines: [report.explanation] },
    { title: t('portail.report.claims'), lines: report.claims.map((claim) => `• ${claim.text} [${claim.evidence.join(', ')}]`) },
    {
      title: t('portail.report.evidences'),
      lines: report.evidences.length
        ? report.evidences.map((evidence) =>
            `[${evidence.label}] ${t(`dossiers.evidenceType.${evidence.type}`)} — ${evidence.origin ?? ''} ${evidence.archive_url ?? evidence.url ?? ''} ${evidence.sha256 ? `SHA-256 ${evidence.sha256.slice(0, 16)}…` : ''}`.replace(/\s+/g, ' ').trim(),
          )
        : ['—'],
    },
    { title: t('portail.report.method'), lines: [report.method || '—'] },
    ...(report.corrections.length ? [{ title: t('portail.report.corrections'), lines: report.corrections.map((item) => `${formatDate(item.at)} — ${item.text}`) }] : []),
  ]
  const footer = [
    t('portail.report.publishedBy', { date: formatDate(report.published_at), newsroom: report.newsroom }),
    report.validated_by ? t('portail.report.validatedBy', { name: report.validated_by }) : '',
    `${report.public_id} — ${url}`,
    report.content_hash ? `${t('portail.verify.hash')} : ${report.content_hash}` : '',
  ]
    .filter(Boolean)
    .join('\n')
  return casePdf(report.title, sections, footer)
}

export function downloadBlob(blob: Blob, name: string) {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}
