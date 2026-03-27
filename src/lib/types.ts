// ─── App Step State Machine ──────────────────────────────────────────────────

export type AppStep =
  | 'idle'
  | 'orienting'
  | 'recommending'
  | 'confirming_blueprint'
  | 'paragraph_planning'
  | 'sprint_planning'
  | 'sprint_generating'
  | 'sprint_generated'
  | 'sprint_approved'
  | 'paragraph_assembling'
  | 'paragraph_generated'
  | 'paragraph_approved'
  | 'clarifying_inconsistency'
  | 'resolving_conflict'
  | 'section_checkpoint'
  | 'transition_review'
  | 'title_refinement'
  | 'conclusion_strategy'
  | 'meta_revision'
  | 'document_assembly_ready'
  | 'final_review'
  | 'completed'

// ─── Generation Permission Levels ────────────────────────────────────────────

export type GenerationPermission =
  | 0 // discovery — options/questions only
  | 1 // unit_draft — single paragraph allowed
  | 2 // section_draft — up to 3 approved paragraphs
  | 3 // assembly — full stitch of approved paragraphs
  | 4 // export — final output

// ─── Output Scopes ───────────────────────────────────────────────────────────

export type OutputScope =
  | 'options'
  | 'blueprint'
  | 'paragraph_plan'
  | 'single_paragraph'
  | 'section_draft'
  | 'full_assembly'

// ─── Escalation ───────────────────────────────────────────────────────────────

export type QuestionDepthLevel =
  | 'surface'
  | 'structural'
  | 'sentence_level'

export interface EscalationLevel {
  targetQuestionCount: number
  depthLevel: QuestionDepthLevel
  sentenceLevelUnlocked: boolean
}

// ─── Decisions ────────────────────────────────────────────────────────────────

export type DecisionCategory =
  | 'intent'
  | 'audience'
  | 'tone'
  | 'structure'
  | 'paragraph_job'
  | 'sentence_role'
  | 'transition'
  | 'rhetorical_move'
  | 'evidence'
  | 'conclusion'

export interface DecisionState {
  id: string
  category: DecisionCategory
  question: string
  answer: string
  importance: 'critical' | 'high' | 'medium' | 'low'
  resolved: boolean
  locked: boolean
  depends_on: string[] // IDs of decisions this depends on
  affected_units: string[] // paragraph IDs affected by this decision
}

// ─── Interaction History ──────────────────────────────────────────────────────

export type InteractionNodeType = 'question' | 'answer' | 'revision' | 'approval' | 'jailbreak_blocked'

export interface InteractionNode {
  id: string
  type: InteractionNodeType
  content: string
  semanticHash: string // for novelty tracking
  timestamp: number
  relatedParagraphId?: string
  relatedDecisionId?: string
}

// ─── Paragraph ────────────────────────────────────────────────────────────────

export type ParagraphStatus =
  | 'placeholder'
  | 'planning_intent'
  | 'gathering_sprints'
  | 'assembling'
  | 'awaiting_review'
  | 'approved'
  | 'locked'
  | 'stale_due_to_upstream_change'

export type SprintStatus =
  | 'placeholder'
  | 'planning'
  | 'draft'
  | 'awaiting_review'
  | 'approved'

export interface SprintState {
  id: string
  orderIndex: number
  status: SprintStatus
  decisions: DecisionState[]
  draftText: string
  approvedText: string
  revisionHistory: Array<{ text: string; timestamp: number; reason: string }>
}

export interface ParagraphState {
  id: string
  orderIndex: number
  status: ParagraphStatus
  decisions: DecisionState[] // global paragraph intent decisions
  sprints: SprintState[]
  draftText: string // consolidated draft
  approvedText: string // final consolidated version
  revisionHistory: Array<{ text: string; timestamp: number; reason: string }>
  sectionIndex: number // which ~3-paragraph section this belongs to
}

// ─── Question Card ────────────────────────────────────────────────────────────

export interface QuestionOption {
  label: string
  consequence: string
}

export interface QuestionCard {
  id: string
  question: string
  helperText: string
  inputType: 'choice' | 'freetext'
  options: QuestionOption[] // empty for freetext
  allowCustom: boolean
  category: DecisionCategory
  questionScope: 'paragraph' | 'sprint'
  relatedParagraphId?: string
}

// ─── Blueprint ────────────────────────────────────────────────────────────────

export interface Blueprint {
  titleCandidates: string[]
  selectedTitle: string
  thesis: string
  toneProfile: string
  structureMap: string // e.g., "Problem → Evidence → Implication → Call"
  sectionPlan: Array<{ title: string; paragraphCount: number; role: string }>
  paragraphRoadmap: Array<{ index: number; job: string; startsAt: string }>
}

// ─── Document State ───────────────────────────────────────────────────────────

export interface DocumentState {
  blueprint: Blueprint | null
  paragraphs: ParagraphState[]
  globalDecisions: DecisionState[]
  lockedDecisions: string[] // IDs of locked decisions
  pendingDecisions: string[] // IDs awaiting resolution
}

// ─── Writing Session ──────────────────────────────────────────────────────────

export interface WritingSession {
  id: string
  seedPrompt: string
  mode: 'guided' | 'freeform'
  currentStep: AppStep
  priorStep: AppStep | null
  permissionState: GenerationPermission
  fatigueScore: number // 0–100
  overrideAttemptCount: number
  interactionHistory: InteractionNode[]
  activeQuestions: QuestionCard[]
  currentParagraphIndex: number
  currentSprintIndex: number
  error: string | null
  lastSavedAt: number | null
}

// ─── Jailbreak Defense ────────────────────────────────────────────────────────

export type AttackClass =
  | 'direct_override'
  | 'framing_attack'
  | 'meta_instruction'
  | 'approval_forgery'
  | 'state_confusion'
  | 'roleplay'
  | 'memory_erasure'
  | 'tool_output_laundering'
  | 'incremental_extraction'
  | 'contradictory_instructions'

export interface JailbreakResult {
  intercepted: boolean
  attackClass?: AttackClass
  suggestedResponse?: string
  validAlternatives?: string[]
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export type OrchestratorAction =
  | { type: 'ask_questions'; questions: QuestionCard[] }
  | { type: 'generate_blueprint' }
  | { type: 'confirm_blueprint'; blueprint: Blueprint }
  | { type: 'generate_paragraph'; paragraphIndex: number }
  | { type: 'review_paragraph'; paragraphId: string }
  | { type: 'section_checkpoint'; sectionIndex: number }
  | { type: 'transition_review'; fromParagraphId: string }
  | { type: 'title_refinement' }
  | { type: 'conclusion_strategy' }
  | { type: 'meta_revision' }
  | { type: 'assemble_document' }
  | { type: 'final_review' }
  | { type: 'blocked'; reason: string; validAlternative: string }

// ─── API Payloads ─────────────────────────────────────────────────────────────

export interface GenerateQuestionsPayload {
  action: 'generate-questions'
  session: WritingSession
  document: DocumentState
  paragraphIndex: number
}

export interface GenerateParagraphPayload {
  action: 'generate-paragraph'
  session: WritingSession
  document: DocumentState
  paragraphIndex: number
}

export interface ReviseParagraphPayload {
  action: 'revise-paragraph'
  paragraphId: string
  currentText: string
  revisionDirection: string
  globalDecisions: DecisionState[]
}

export interface GenerateBlueprintPayload {
  action: 'generate-blueprint'
  seedPrompt: string
  orientationAnswers: Array<{ question: string; answer: string }>
}

export type ApiPayload =
  | GenerateQuestionsPayload
  | GenerateParagraphPayload
  | ReviseParagraphPayload
  | GenerateBlueprintPayload

// ─── Store Shape ──────────────────────────────────────────────────────────────

export interface AppStore {
  session: WritingSession
  document: DocumentState

  // Session actions
  initSession: (seedPrompt: string) => void
  setStep: (step: AppStep) => void
  setPermission: (level: GenerationPermission) => void
  updateFatigue: (delta: number) => void
  incrementOverrideAttempt: () => void
  addInteraction: (node: Omit<InteractionNode, 'id' | 'timestamp'>) => void
  setActiveQuestions: (questions: QuestionCard[]) => void
  setError: (error: string | null) => void
  recoverFromError: () => void
  resetStore: () => void
  setCurrentParagraphIndex: (index: number) => void
  setCurrentSprintIndex: (index: number) => void

  // Document actions
  setBlueprint: (blueprint: Blueprint) => void
  addParagraph: () => void
  setParagraphStatus: (id: string, status: ParagraphStatus) => void
  setParagraphDraft: (id: string, text: string) => void
  approveParagraph: (id: string) => void
  lockParagraph: (id: string) => void
  rollbackParagraph: (id: string) => void
  assembleParagraph: (id: string) => void
  addGlobalDecision: (decision: DecisionState) => void
  lockDecision: (id: string) => void
  invalidateDownstream: (decisionId: string) => void

  // Sprint actions
  addSprint: (paragraphId: string) => void
  setSprintStatus: (paragraphId: string, sprintId: string, status: SprintStatus) => void
  setSprintDraft: (paragraphId: string, sprintId: string, text: string) => void
  approveSprint: (paragraphId: string, sprintId: string) => void
  retractSprints: (deletions: Array<{ paragraphIndex: number; sprintIndex: number }>) => void
  rollbackSprint: (paragraphId: string, sprintId: string) => void
}
