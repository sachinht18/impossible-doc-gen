import type { AppStep, WritingSession, DocumentState } from '../types'

/**
 * Defines valid transitions between AppStep states.
 * getNextStep returns the valid next step given current state.
 */

const VALID_TRANSITIONS: Record<AppStep, AppStep[]> = {
  idle: ['orienting'],
  orienting: ['recommending', 'clarifying_inconsistency'],
  recommending: ['confirming_blueprint'],
  confirming_blueprint: ['paragraph_planning'],
  paragraph_planning: ['sprint_planning', 'clarifying_inconsistency'],
  sprint_planning: ['sprint_generating', 'clarifying_inconsistency'],
  sprint_generating: ['sprint_generated'],
  sprint_generated: ['sprint_approved', 'sprint_planning'],
  sprint_approved: ['sprint_planning', 'paragraph_assembling'],
  paragraph_assembling: ['paragraph_generated'],
  paragraph_generated: ['paragraph_approved', 'clarifying_inconsistency'],
  paragraph_approved: ['transition_review', 'section_checkpoint', 'paragraph_planning', 'title_refinement'],
  clarifying_inconsistency: ['orienting', 'paragraph_planning', 'recommending'],
  resolving_conflict: ['sprint_planning', 'paragraph_planning', 'orienting'],
  section_checkpoint: ['paragraph_planning', 'title_refinement'],
  transition_review: ['paragraph_planning', 'title_refinement'],
  title_refinement: ['conclusion_strategy'],
  conclusion_strategy: ['meta_revision'],
  meta_revision: ['document_assembly_ready'],
  document_assembly_ready: ['final_review'],
  final_review: ['completed'],
  completed: [],
}

export function isValidTransition(from: AppStep, to: AppStep): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

export function getNextStep(
  session: WritingSession,
  document: DocumentState
): AppStep {
  const { currentStep } = session
  const paragraphs = document.paragraphs
  const approvedCount = paragraphs.filter((p) => p.status === 'approved' || p.status === 'locked').length
  const totalPlanned = document.blueprint?.paragraphRoadmap.length ?? 0

  switch (currentStep) {
    case 'idle':
      return 'orienting'

    case 'orienting':
      return 'recommending'

    case 'recommending':
      return 'confirming_blueprint'

    case 'confirming_blueprint':
      return 'paragraph_planning'

    case 'paragraph_planning':
      return 'sprint_planning'

    case 'sprint_planning':
      return 'sprint_generating'

    case 'sprint_generating':
      return 'sprint_generated'

    case 'sprint_generated':
      return 'sprint_approved'

    case 'sprint_approved':
      return 'paragraph_assembling'

    case 'paragraph_assembling':
      return 'paragraph_generated'

    case 'paragraph_generated':
      return 'paragraph_approved'

    case 'paragraph_approved': {
      // Section checkpoint every ~3 paragraphs
      const isCheckpointParagraph = approvedCount > 0 && approvedCount % 3 === 0
      if (isCheckpointParagraph) return 'section_checkpoint'
      return 'transition_review'
    }

    case 'section_checkpoint':
    case 'transition_review': {
      // All paragraphs written? Move to post-doc flow
      if (approvedCount >= totalPlanned && totalPlanned > 0) return 'title_refinement'
      return 'paragraph_planning'
    }

    case 'title_refinement':
      return 'conclusion_strategy'

    case 'conclusion_strategy':
      return 'meta_revision'

    case 'meta_revision':
      return 'document_assembly_ready'

    case 'document_assembly_ready':
      return 'final_review'

    case 'final_review':
      return 'completed'

    case 'clarifying_inconsistency':
      // After clarification, go back to orienting to re-generate questions
      return 'orienting'

    default:
      return currentStep
  }
}

export function getSectionIndex(paragraphIndex: number): number {
  return Math.floor(paragraphIndex / 3)
}

export function isPostDocumentStep(step: AppStep): boolean {
  return [
    'title_refinement',
    'conclusion_strategy',
    'meta_revision',
    'document_assembly_ready',
    'final_review',
    'completed',
  ].includes(step)
}

export function stepLabel(step: AppStep): string {
  const labels: Record<AppStep, string> = {
    idle: 'Start',
    orienting: 'Orientation',
    recommending: 'Blueprint Draft',
    confirming_blueprint: 'Confirm Blueprint',
    paragraph_planning: 'Planning Paragraph',
    sprint_planning: 'Planning Sprint',
    sprint_generating: 'Writing Sprint',
    sprint_generated: 'Review Sprint',
    sprint_approved: 'Sprint Approved',
    paragraph_assembling: 'Assembling',
    paragraph_generated: 'Review Paragraph',
    paragraph_approved: 'Approved',
    clarifying_inconsistency: 'Clarifying',
    section_checkpoint: 'Section Checkpoint',
    transition_review: 'Transition',
    title_refinement: 'Title Refinement',
    conclusion_strategy: 'Conclusion',
    meta_revision: 'Meta-Revision',
    document_assembly_ready: 'Assembly',
    final_review: 'Final Review',
    resolving_conflict: 'Resolving Conflict',
    completed: 'Complete (Sort Of)',
  }
  return labels[step] ?? step
}
