// Extraits numérotés envoyés à l'assistant (section 10) : seul le contenu du dossier, rien d'autre.
// [P] preuves · [S] sources · [C] chiffres cités · [R] personnes-ressources · [K] checklist.
import type { CaseDetail } from '@/features/dossiers/model'

export type ExcerptKind = 'P' | 'S' | 'C' | 'R' | 'K'

export interface Excerpt {
  id: string
  kind: ExcerptKind
  text: string
}

const MAX_TEXT = 600
const clip = (text: string) => (text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT - 1)}…` : text)
const join = (...parts: Array<string | number | null | undefined | false>) =>
  parts.filter((part) => part !== null && part !== undefined && part !== false && String(part).trim() !== '').join(' · ')

interface StatisticComparison {
  kind: 'statistic_comparison'
  claimed: number
  official: { indicator: string; value: number; unit: string | null; year: number; source: string }
}

export function buildExcerpts(detail: CaseDetail): Excerpt[] {
  const excerpts: Excerpt[] = []
  const counters: Record<ExcerptKind, number> = { P: 0, S: 0, C: 0, R: 0, K: 0 }
  // Numérotation continue sur tous les extraits, préfixée par la nature : [P1] [S2] [C3]…
  const push = (kind: ExcerptKind, text: string) => {
    if (!text.trim()) return
    counters[kind] += 1
    excerpts.push({ id: `${kind}${excerpts.length + 1}`, kind, text: clip(text) })
  }

  for (const evidence of detail.evidences) {
    const analysis = evidence.analysis as Record<string, unknown> | null
    if (analysis?.kind === 'statistic_comparison') {
      const figure = analysis as unknown as StatisticComparison
      push(
        'C',
        join(
          `${figure.official.indicator} : ${figure.official.value}${figure.official.unit ? ` ${figure.official.unit}` : ''} (${figure.official.year})`,
          `source ${figure.official.source}`,
          `chiffre annoncé dans le contenu : ${figure.claimed}`,
        ),
      )
      continue
    }
    const note = typeof analysis?.note === 'string' ? analysis.note : typeof analysis?.summary === 'string' ? analysis.summary : null
    push('P', join(`Preuve (${evidence.type})`, evidence.origin, note, evidence.url, evidence.archiveUrl && `archive ${evidence.archiveUrl}`))
  }

  for (const source of detail.sources) {
    push('S', join(`Source : ${source.name}`, source.type, source.domain, source.score !== null && `score de fiabilité ${source.score}`, source.verified && 'vérifiée'))
  }

  for (const request of detail.requests) {
    push('R', join(`Personne-ressource : ${request.personName}`, request.channel, `statut ${request.status}`, request.response && `réponse : ${request.response}`))
  }

  for (const item of detail.checklist) {
    if (item.state === 'todo') continue
    push('K', join(`Checklist : ${item.question}`, `état ${item.state}`, item.explanation))
  }

  return excerpts
}
