import type { WritingSession, DocumentState, QuestionCard, Blueprint, DecisionState } from './types'
import type { BlueprintAdvisorResult } from './agents/blueprint-advisor'
import type { InconsistencyResult } from './agents/inconsistency-detector'

export interface SprintCoherenceData {
  score: number
  resolved: boolean
  retractionCount: number
  reasoning: string
  resetToStart?: boolean
  sorry?: boolean
  deletedParagraphCount?: number
  deletedParagraphIndices?: number[]
  deletions?: Array<{ paragraphIndex: number; sprintIndex: number }>
  reason?: string
}

export interface SprintGenerationResult {
  text: string
  coherence?: SprintCoherenceData
}

async function post(payload: object): Promise<unknown> {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error((err as { error?: string }).error ?? 'API error')
  }
  return res.json()
}

export async function apiGenerateQuestions(
  session: WritingSession,
  document: DocumentState,
  paragraphIndex: number,
  sprintIndex?: number
): Promise<QuestionCard[]> {
  const data = await post({ action: 'generate-questions', session, document, paragraphIndex, sprintIndex })
  return (data as { questions: QuestionCard[] }).questions
}

export async function apiGenerateSprint(
  session: WritingSession,
  document: DocumentState,
  paragraphIndex: number,
  sprintIndex: number
): Promise<SprintGenerationResult> {
  const data = await post({ action: 'generate-sprint', session, document, paragraphIndex, sprintIndex })
  const result = data as { text: string; coherence?: SprintCoherenceData }
  return { text: result.text, coherence: result.coherence }
}

export async function apiGenerateParagraph(
  session: WritingSession,
  document: DocumentState,
  paragraphIndex: number
): Promise<string> {
  const data = await post({ action: 'generate-paragraph', session, document, paragraphIndex })
  return (data as { text: string }).text
}

export async function apiReviseParagraph(
  paragraphId: string,
  currentText: string,
  revisionDirection: string,
  globalDecisions: DecisionState[]
): Promise<{ revisedText: string; changes: string[]; explanation: string }> {
  const data = await post({
    action: 'revise-paragraph',
    paragraphId,
    currentText,
    revisionDirection,
    globalDecisions,
  })
  return data as { revisedText: string; changes: string[]; explanation: string }
}

export async function apiGenerateBlueprint(
  seedPrompt: string,
  orientationAnswers: Array<{ question: string; answer: string }>
): Promise<Blueprint> {
  const data = await post({ action: 'generate-blueprint', seedPrompt, orientationAnswers })
  return (data as { blueprint: Blueprint }).blueprint
}

export async function apiAdviseBlueprintChanges(
  blueprint: Blueprint,
  seedPrompt: string
): Promise<BlueprintAdvisorResult> {
  const data = await post({ action: 'advise-blueprint', blueprint, seedPrompt })
  return data as BlueprintAdvisorResult
}

export async function apiDetectInconsistency(
  seedPrompt: string,
  qaHistory: Array<{ question: string; answer: string }>
): Promise<InconsistencyResult> {
  const data = await post({ action: 'detect-inconsistency', seedPrompt, qaHistory })
  return data as InconsistencyResult
}

export async function apiGeneratePartialParagraph(
  session: WritingSession,
  document: DocumentState,
  paragraphIndex: number
): Promise<string> {
  const data = await post({ action: 'generate-partial-paragraph', session, document, paragraphIndex })
  return (data as { text: string }).text
}

export async function apiAssembleParagraph(
  session: WritingSession,
  document: DocumentState,
  paragraphIndex: number
): Promise<string> {
  const data = await post({ action: 'assemble-paragraph', session, document, paragraphIndex })
  return (data as { text: string }).text
}
