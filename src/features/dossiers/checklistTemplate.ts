// Checklist guidée du cahier des charges (section 11.2) — mêmes clés que public.checklist_template().
import type { ChecklistBlock } from '@/types/domain'
import type { ChecklistItem } from './model'

export const CHECKLIST_TEMPLATE: Array<{ block: ChecklistBlock; question: string }> = [
  { block: 'origin', question: 'origin.first_publisher' },
  { block: 'origin', question: 'origin.first_date' },
  { block: 'origin', question: 'origin.account_credible' },
  { block: 'origin', question: 'origin.reposted' },
  { block: 'context', question: 'context.place_date_confirmed' },
  { block: 'context', question: 'context.older_version' },
  { block: 'context', question: 'context.matches_event' },
  { block: 'content', question: 'content.technical_analysis' },
  { block: 'content', question: 'content.reverse_search' },
  { block: 'content', question: 'content.figures_compared' },
  { block: 'sources', question: 'sources.two_independent' },
  { block: 'sources', question: 'sources.direct_knowledge' },
  { block: 'sources', question: 'sources.conflicts_examined' },
  { block: 'sources', question: 'sources.statements_crosschecked' },
  { block: 'adversarial', question: 'adversarial.party_contacted' },
  { block: 'adversarial', question: 'adversarial.response_kept' },
  { block: 'adversarial', question: 'adversarial.counter_evidence' },
]

export function emptyChecklist(authorId: string | null, now: string): ChecklistItem[] {
  return CHECKLIST_TEMPLATE.map((item, index) => ({
    id: `local-${item.question}`,
    block: item.block,
    question: item.question,
    sortOrder: index + 1,
    state: 'todo',
    explanation: '',
    evidenceIds: [],
    authorId,
    updatedAt: now,
  }))
}

export const checklistProgress = (items: ChecklistItem[]) => ({
  done: items.filter((item) => item.state === 'done' || item.state === 'not_applicable').length,
  total: items.length,
})
