// Application d'une modification à un dossier, sur l'appareil. Fonction pure : elle sert à l'affichage
// immédiat (y compris hors ligne), au mode démonstration et à la ré-application des modifications en attente
// par-dessus les données fraîches du serveur.
import { buildPublicPayload, reportBlockers } from '@/features/revue/publication'
import type { CaseStatus, Role } from '@/types/domain'
import { checklistProgress, emptyChecklist } from './checklistTemplate'
import type { CaseDetail, DecisionType, Mutation, ReportDraft } from './model'
import { assertTransition, CaseRuleError, verdictBlockers } from './rules'

export interface MutationContext {
  userId: string | null
  role: Role | null
  now: string
  /** Mode démonstration : numéro public et signataire du rapport publié (attribués par le serveur sinon). */
  publication?: { publicId: string; editorName: string | null; newsroom: string }
}

/** Complète un dossier enregistré par une version précédente de l'application. */
export function withDefaults(detail: CaseDetail): CaseDetail {
  return {
    ...detail,
    reportVersions: detail.reportVersions ?? [],
    decisions: detail.decisions ?? [],
    report: detail.report ? { ...detail.report, claims: detail.report.claims ?? [], publicEvidenceIds: detail.report.publicEvidenceIds ?? [] } : null,
  }
}

const sameContent = (a: ReportDraft, b: ReportDraft) =>
  a.summary === b.summary && a.explanation === b.explanation && a.method === b.method && JSON.stringify(a.claims) === JSON.stringify(b.claims)

const DECISION_TARGET: Record<DecisionType, CaseStatus> = {
  validate_publish: 'published',
  request_correction: 'correction_requested',
  request_verification: 'in_analysis',
  reject: 'closed',
}

function withProgress(detail: CaseDetail, now: string): CaseDetail {
  const { done, total } = checklistProgress(detail.checklist)
  return { ...detail, case: { ...detail.case, checklistDone: done, checklistTotal: total, updatedAt: now } }
}

function withStatus(detail: CaseDetail, to: CaseDetail['case']['status'], reason: string, ctx: MutationContext): CaseDetail {
  return {
    ...detail,
    case: { ...detail.case, status: to },
    history: [...detail.history, { fromStatus: detail.case.status, toStatus: to, reason: reason.trim(), changedBy: ctx.userId, changedAt: ctx.now }],
  }
}

export function applyMutation(detail: CaseDetail | null, mutation: Mutation, ctx: MutationContext): CaseDetail {
  if (mutation.kind === 'create_case') {
    const { input } = mutation
    if (!input.title.trim()) throw new CaseRuleError('title_required')
    return withProgress(
      {
        case: {
          id: mutation.caseId,
          title: input.title.trim(),
          claim: input.claim.trim(),
          category: input.category.trim() || null,
          region: input.region.trim() || null,
          priority: input.priority,
          status: 'new',
          assignedTo: null,
          createdBy: ctx.userId,
          dueDate: input.dueDate,
          verdict: null,
          confidence: null,
          justification: null,
          justificationEvidenceIds: [],
          proposedBy: null,
          alertId: input.alertId ?? null,
          createdAt: ctx.now,
          updatedAt: ctx.now,
          checklistDone: 0,
          checklistTotal: 0,
        },
        evidences: [],
        checklist: emptyChecklist(ctx.userId, ctx.now),
        sources: [],
        history: [],
        comments: [],
        requests: [],
        report: null,
        reportVersions: [],
        decisions: [],
      },
      ctx.now,
    )
  }

  if (!detail) throw new CaseRuleError('case_not_found')
  detail = withDefaults(detail)
  const locked = ['validated', 'published', 'closed'].includes(detail.case.status)

  switch (mutation.kind) {
    case 'update_case':
      if (locked) throw new CaseRuleError('case_locked')
      return withProgress({ ...detail, case: { ...detail.case, ...mutation.patch } }, ctx.now)

    case 'set_checklist': {
      if (locked) throw new CaseRuleError('case_locked')
      const evidenceIds = mutation.evidenceIds.filter((id) => detail.evidences.some((evidence) => evidence.id === id))
      if (mutation.state === 'done' && evidenceIds.length === 0) throw new CaseRuleError('checklist_evidence_required')
      const checklist = detail.checklist.map((item) =>
        item.question === mutation.question
          ? { ...item, state: mutation.state, explanation: mutation.explanation, evidenceIds, authorId: ctx.userId, updatedAt: ctx.now }
          : item,
      )
      return withProgress({ ...detail, checklist }, ctx.now)
    }

    case 'change_status':
      assertTransition(detail, mutation.to, ctx.role, ctx.userId, mutation.reason)
      return withProgress(withStatus(detail, mutation.to, mutation.reason, ctx), ctx.now)

    case 'propose_verdict': {
      if (ctx.role !== 'fact_checker' && ctx.role !== 'editor_in_chief') throw new CaseRuleError('role_not_allowed')
      if (!mutation.justification.trim()) throw new CaseRuleError('justification_required')
      if (!['in_analysis', 'correction_requested', 'to_verify'].includes(detail.case.status)) throw new CaseRuleError('transition_not_allowed')
      const blockers = verdictBlockers(detail, mutation.evidenceIds)
      if (blockers.length) throw new CaseRuleError('submission_blocked', blockers)
      const proposed: CaseDetail = {
        ...detail,
        case: {
          ...detail.case,
          verdict: mutation.verdict,
          confidence: mutation.confidence,
          justification: mutation.justification.trim(),
          justificationEvidenceIds: mutation.evidenceIds,
          proposedBy: ctx.userId,
        },
      }
      return withProgress(withStatus(proposed, 'to_review', `Verdict proposé : ${mutation.verdict}`, ctx), ctx.now)
    }

    case 'add_evidence':
      if (detail.evidences.some((evidence) => evidence.id === mutation.evidence.id)) return detail
      return withProgress({ ...detail, evidences: [...detail.evidences, { ...mutation.evidence, addedBy: mutation.evidence.addedBy ?? ctx.userId }] }, ctx.now)

    case 'link_source':
      if (detail.sources.some((source) => source.id === mutation.source.id)) return detail
      return withProgress({ ...detail, sources: [...detail.sources, mutation.source] }, ctx.now)

    case 'unlink_source':
      return withProgress({ ...detail, sources: detail.sources.filter((source) => source.id !== mutation.sourceId) }, ctx.now)

    case 'save_report': {
      const previous = detail.report
      if (previous && !['draft', 'submitted'].includes(previous.status)) throw new CaseRuleError('report_locked')
      const report: ReportDraft = { ...previous, ...mutation.report, status: previous?.status ?? 'draft', version: previous?.version ?? 1 }
      // Chaque modification du contenu conserve la version précédente (comparaison en revue, W6).
      if (!previous || sameContent(previous, report)) return withProgress({ ...detail, report }, ctx.now)
      const archived = {
        version: previous.version ?? 1,
        summary: previous.summary,
        explanation: previous.explanation,
        method: previous.method,
        claims: previous.claims,
        authorId: ctx.userId,
        createdAt: ctx.now,
      }
      return withProgress(
        { ...detail, report: { ...report, version: archived.version + 1 }, reportVersions: [...detail.reportVersions, archived] },
        ctx.now,
      )
    }

    case 'add_comment':
      if (!mutation.comment.body.trim()) throw new CaseRuleError('comment_empty')
      return withProgress({ ...detail, comments: [...detail.comments, { ...mutation.comment, authorId: mutation.comment.authorId ?? ctx.userId }] }, ctx.now)

    case 'editorial_decision': {
      if (ctx.role !== 'editor_in_chief') throw new CaseRuleError('role_not_allowed')
      if (!mutation.comment.trim()) throw new CaseRuleError('comment_required')
      const { status } = detail.case
      if (!(status === 'to_review' || (status === 'validated' && mutation.decision === 'validate_publish'))) throw new CaseRuleError('not_in_review')
      const to = DECISION_TARGET[mutation.decision]
      let next: CaseDetail = withStatus(detail, to, mutation.comment, ctx)
      next = { ...next, decisions: [...next.decisions, { type: mutation.decision, comment: mutation.comment.trim(), authorId: ctx.userId, createdAt: ctx.now }] }
      if (mutation.decision === 'validate_publish') {
        const blockers = reportBlockers(detail, ctx.userId)
        if (blockers.length) throw new CaseRuleError('publication_blocked', blockers)
        const publication = ctx.publication ?? { publicId: '', editorName: null, newsroom: 'MASO' }
        const signedPayload = buildPublicPayload(detail, { ...publication, at: ctx.now })
        next = {
          ...next,
          report: { ...next.report!, status: 'published', publicId: publication.publicId || null, publishedAt: ctx.now, signedAt: ctx.now, corrections: [], signedPayload: { ...signedPayload } },
        }
      } else if (mutation.decision === 'request_correction' && next.report) {
        next = { ...next, report: { ...next.report, status: 'draft' } }
      }
      return withProgress(next, ctx.now)
    }

    case 'add_correction': {
      if (ctx.role !== 'editor_in_chief') throw new CaseRuleError('role_not_allowed')
      if (!mutation.text.trim()) throw new CaseRuleError('comment_required')
      const report = detail.report
      if (!report || report.status !== 'published' || !report.signedPayload) throw new CaseRuleError('not_published')
      const corrections = [...(report.corrections ?? []), { at: ctx.now, text: mutation.text.trim() }]
      return { ...detail, report: { ...report, corrections, signedAt: ctx.now, signedPayload: { ...report.signedPayload, corrections } } }
    }
  }
}
