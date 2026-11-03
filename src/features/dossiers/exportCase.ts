// Export d'un dossier en texte et en PDF, entièrement sur l'appareil (fonctionne hors ligne, section 13).
import type { TFunction } from 'i18next'
import type { CaseDetail } from './model'

interface Section {
  title: string
  lines: string[]
}

export function caseSections(detail: CaseDetail, t: TFunction, names: (id: string | null) => string, formatDate: (iso: string) => string): Section[] {
  const { case: record } = detail
  const evidenceLabel = (id: string) => {
    const index = detail.evidences.findIndex((evidence) => evidence.id === id)
    return index >= 0 ? `[P${index + 1}]` : ''
  }
  return [
    {
      title: t('dossiers.tab.summary'),
      lines: [
        `${t('dossiers.field.claim')} : ${record.claim || '—'}`,
        `${t('dossiers.field.status')} : ${t(`caseStatus.${record.status}`)}`,
        `${t('dossiers.field.category')} : ${record.category ?? '—'} · ${t('dossiers.field.region')} : ${record.region ?? '—'}`,
        `${t('dossiers.field.assignee')} : ${names(record.assignedTo)}`,
      ],
    },
    {
      title: t('dossiers.verdict.title'),
      lines: record.verdict
        ? [
            `${t(`verdict.${record.verdict}`)} — ${t('dossiers.verdict.confidence')} : ${t(`confidence.${record.confidence ?? 'low'}`)}`,
            `${record.justification ?? ''} ${record.justificationEvidenceIds.map(evidenceLabel).join(' ')}`.trim(),
          ]
        : [t('dossiers.verdict.none')],
    },
    {
      title: t('dossiers.tab.evidences'),
      lines: detail.evidences.length
        ? detail.evidences.map(
            (evidence, index) =>
              `[P${index + 1}] ${t(`dossiers.evidenceType.${evidence.type}`)} — ${evidence.origin ?? ''} ${evidence.url ?? ''} ${evidence.sha256 ? `SHA-256 ${evidence.sha256.slice(0, 16)}…` : ''}`.replace(/\s+/g, ' ').trim(),
          )
        : ['—'],
    },
    {
      title: t('dossiers.tab.sources'),
      lines: detail.sources.length ? detail.sources.map((source) => `${source.name}${source.score !== null ? ` — ${source.score}/10` : ''}`) : ['—'],
    },
    {
      title: t('dossiers.tab.checklist'),
      lines: detail.checklist.map(
        (item) => `${t(`dossiers.checklistState.${item.state}`)} — ${t(`dossiers.question.${item.question}`)}${item.explanation ? ` : ${item.explanation}` : ''} ${item.evidenceIds.map(evidenceLabel).join(' ')}`.trim(),
      ),
    },
    {
      title: t('dossiers.tab.report'),
      lines: detail.report
        ? [detail.report.summary, detail.report.explanation, detail.report.method ? `${t('dossiers.report.method')} : ${detail.report.method}` : ''].filter(Boolean)
        : ['—'],
    },
    {
      title: t('dossiers.export.comments'),
      lines: detail.comments.length ? detail.comments.map((comment) => `${formatDate(comment.createdAt)} — ${names(comment.authorId)} : ${comment.body}`) : ['—'],
    },
    {
      title: t('dossiers.tab.history'),
      lines: detail.history.length
        ? detail.history.map((entry) => `${formatDate(entry.changedAt)} — ${t(`caseStatus.${entry.fromStatus}`)} → ${t(`caseStatus.${entry.toStatus}`)} (${names(entry.changedBy)}) : ${entry.reason}`)
        : ['—'],
    },
  ]
}

export function caseText(title: string, sections: Section[], footer: string): string {
  return [title, '', ...sections.flatMap((section) => [section.title.toUpperCase(), ...section.lines, '']), footer].join('\n')
}

/** Les polices standard des PDF ne couvrent pas tous les caractères : on remplace ceux qui poseraient problème. */
export const pdfSafe = (text: string) =>
  text
    .replace(/[   ]/g, ' ')
    .replace(/→/g, '->')
    .replace(/≈/g, '~')
    .replace(/[^\x20-\x7e -ÿ–—‘’“”…€Œœ\n]/g, '?')

export async function casePdf(title: string, sections: Section[], footer: string): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 18
  const width = pdf.internal.pageSize.getWidth() - margin * 2
  const bottom = pdf.internal.pageSize.getHeight() - margin
  let y = margin

  const write = (text: string, size: number, style: 'normal' | 'bold', color: [number, number, number] = [20, 33, 46]) => {
    pdf.setFont('helvetica', style)
    pdf.setFontSize(size)
    pdf.setTextColor(...color)
    for (const line of pdf.splitTextToSize(pdfSafe(text), width) as string[]) {
      if (y > bottom) {
        pdf.addPage()
        y = margin
      }
      pdf.text(line, margin, y)
      y += size * 0.45
    }
  }

  write('MASO', 10, 'bold', [25, 118, 210])
  y += 2
  write(title, 16, 'bold', [10, 47, 79])
  y += 4
  for (const section of sections) {
    write(section.title.toUpperCase(), 10, 'bold', [10, 47, 79])
    y += 1
    for (const line of section.lines) write(line, 10, 'normal')
    y += 4
  }
  write(footer, 8, 'normal', [91, 107, 123])
  return pdf.output('blob')
}
