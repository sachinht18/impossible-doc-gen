import type { WritingSession, DocumentState, OrchestratorAction } from '../types'
import { getSectionIndex } from './flow-stages'
import { checkGenerationPolicy } from './generation-policy'

/**
 * Central flow controller.
 * getNextAction inspects current session + document state and returns
 * the single next valid action to take.
 */
export function getNextAction(
  session: WritingSession,
  document: DocumentState
): OrchestratorAction {
  const { currentStep, permissionState, currentParagraphIndex } = session
  const { paragraphs, blueprint, globalDecisions } = document

  // ── Orientation phase ─────────────────────────────────────────────────────
  if (currentStep === 'idle' || currentStep === 'orienting') {
    const orientationAnswered = globalDecisions.filter(
      (d) => d.category === 'intent' || d.category === 'audience'
    ).length

    if (orientationAnswered < 2) {
      return { type: 'ask_questions', questions: [] } // question-generator fills these
    }
    return { type: 'generate_blueprint' }
  }

  // ── Blueprint phase ───────────────────────────────────────────────────────
  if (currentStep === 'recommending') {
    return { type: 'generate_blueprint' }
  }

  if (currentStep === 'confirming_blueprint') {
    if (!blueprint) return { type: 'generate_blueprint' }
    return { type: 'confirm_blueprint', blueprint }
  }

  // ── Paragraph loop ─────────────────────────────────────────────────────────
  if (currentStep === 'paragraph_planning') {
    const policyCheck = checkGenerationPolicy(permissionState, 'paragraph_plan')
    if (!policyCheck.allowed) {
      return {
        type: 'blocked',
        reason: policyCheck.blockedReason!,
        validAlternative: policyCheck.redirectExplanation!,
      }
    }
    return { type: 'ask_questions', questions: [] }
  }

  if (currentStep === 'sprint_planning') {
    return { type: 'ask_questions', questions: [] }
  }

  if (currentStep === 'sprint_generating' || currentStep === 'paragraph_assembling') {
    const policyCheck = checkGenerationPolicy(permissionState, 'single_paragraph')
    if (!policyCheck.allowed) {
      return {
        type: 'blocked',
        reason: policyCheck.blockedReason!,
        validAlternative: policyCheck.redirectExplanation!,
      }
    }
    return { type: 'generate_paragraph', paragraphIndex: currentParagraphIndex }
  }

  if (currentStep === 'sprint_generated' || currentStep === 'sprint_approved') {
    const para = paragraphs[currentParagraphIndex]
    if (para) return { type: 'review_paragraph', paragraphId: para.id }
    return { type: 'generate_paragraph', paragraphIndex: currentParagraphIndex }
  }

  if (currentStep === 'paragraph_generated') {
    const para = paragraphs[currentParagraphIndex]
    if (para) return { type: 'review_paragraph', paragraphId: para.id }
    return { type: 'generate_paragraph', paragraphIndex: currentParagraphIndex }
  }

  if (currentStep === 'paragraph_approved') {
    const approvedCount = paragraphs.filter(
      (p) => p.status === 'approved' || p.status === 'locked'
    ).length
    if (approvedCount > 0 && approvedCount % 3 === 0) {
      return {
        type: 'section_checkpoint',
        sectionIndex: getSectionIndex(currentParagraphIndex),
      }
    }
    const currentPara = paragraphs[currentParagraphIndex]
    if (currentPara) {
      return { type: 'transition_review', fromParagraphId: currentPara.id }
    }
  }

  // ── Post-paragraph loops ───────────────────────────────────────────────────
  if (currentStep === 'section_checkpoint') {
    const sectionIndex = getSectionIndex(currentParagraphIndex)
    return { type: 'section_checkpoint', sectionIndex }
  }

  if (currentStep === 'transition_review') {
    const currentPara = paragraphs[currentParagraphIndex]
    return {
      type: 'transition_review',
      fromParagraphId: currentPara?.id ?? '',
    }
  }

  // ── Post-document flow ─────────────────────────────────────────────────────
  if (currentStep === 'title_refinement') return { type: 'title_refinement' }
  if (currentStep === 'conclusion_strategy') return { type: 'conclusion_strategy' }
  if (currentStep === 'meta_revision') return { type: 'meta_revision' }

  if (currentStep === 'document_assembly_ready') {
    const policyCheck = checkGenerationPolicy(permissionState, 'full_assembly', paragraphs)
    if (!policyCheck.allowed) {
      return {
        type: 'blocked',
        reason: policyCheck.blockedReason!,
        validAlternative: policyCheck.redirectExplanation!,
      }
    }
    return { type: 'assemble_document' }
  }

  if (currentStep === 'final_review') return { type: 'final_review' }

  return {
    type: 'blocked',
    reason: 'Unknown state',
    validAlternative: 'Please restart the session',
  }
}
