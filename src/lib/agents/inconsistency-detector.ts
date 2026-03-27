import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { AI_SMALL_MODEL } from '../config/ai'

const InconsistencySchema = z.object({
  hasInconsistency: z.boolean(),
  // Plain-spoken summary directed at the user ("You seem confused about X because...")
  // This must be ONE cohesive explanation of how their decisions progressed into a conflict.
  summary: z.string(),
  // What the user should decide/clarify to unblock the writing
  suggestedFocus: z.string(),
  // Type of conflict for frustration tracking
  conflictType: z.enum([
    'audience_evidence_mismatch',
    'scope_depth_mismatch',
    'tone_evidence_mismatch',
    'speed_depth_mismatch',
    'coherence_contradiction',
    'goal_outcome_mismatch',
  ]).optional(),
})

export interface InconsistencyResult {
  hasInconsistency: boolean
  summary: string
  suggestedFocus: string
  conflictType?: string
}

export async function detectInconsistency(
  seedPrompt: string,
  qaHistory: Array<{ question: string; answer: string }>
): Promise<InconsistencyResult> {
  if (qaHistory.length < 4) {
    return { hasInconsistency: false, summary: '', suggestedFocus: '' }
  }

  const historyText = qaHistory
    .map((qa, i) => `${i + 1}. Q: ${qa.question}\n   A: ${qa.answer}`)
    .join('\n\n')

  const { object } = await generateObject({
    model: openai(AI_SMALL_MODEL),
    schema: InconsistencySchema,
    prompt: `You are a writing coach reviewing a user's answers during a document-planning session. Your job is to spot when the user is contradicting themselves, seems confused, or is pulling the document in conflicting directions.

DOCUMENT TOPIC: ${seedPrompt}

USER'S ANSWERS SO FAR:
${historyText}

TASK:
Look for genuine contradictions and confusion — not minor style differences but real logical conflicts. Focus on how the decision process has progressed and highlight the core conflict that has emerged. Examples:
- They say the tone should be "casual and friendly" but want to use dense academic evidence
- They say the audience is complete beginners but also want to skip all foundational context

If you find a real contradiction: set hasInconsistency true, write a single cohesive, direct summary (talk to the user like a friend — e.g. "Looking at how your decisions progressed, there's a conflict here..."), say what they need to decide in suggestedFocus, and categorize the conflict type.

Conflict types:
- audience_evidence_mismatch: audience level doesn't match evidence complexity
- scope_depth_mismatch: trying to cover too much too shallowly or too deeply
- tone_evidence_mismatch: tone doesn't match the formality/style of evidence
- speed_depth_mismatch: want deep insight but in insufficient time/space
- goal_outcome_mismatch: stated goals conflict with desired outcomes
- coherence_contradiction: new content contradicts earlier established POV

If everything is consistent: set hasInconsistency false, leave summary/suggestedFocus/conflictType empty.

Be honest and direct. Don't soften the call-out. The user needs to know they're confused.`,
  })

  return object
}
