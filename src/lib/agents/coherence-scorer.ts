/**
 * Coherence Scorer
 *
 * Evaluates how well a new sprint aligns with the document's established
 * point of view (PoV) and narrative voice. Reads ALL approved sprints
 * visible in the document pane (including earlier sprints in the current
 * paragraph). Returns a score (0-100) where:
 * - 70+ = coherent, safe to include
 * - <70 = potential conflict, trigger retraction/rewrite
 *
 * Para 1 Sprint 1 is always lenient (no prior context to check against).
 * Para 2+ enforces coherence checking against all prior approved content.
 */

import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import type { WritingSession, DocumentState } from '@/lib/types'

const CoherenceScorerSchema = z.object({
  score: z.number().int().min(0).max(100).describe('Coherence score 0-100'),
  reasoning: z.string().describe('Why this score? What alignment issues exist?'),
  conflicts: z
    .array(z.string())
    .describe('Specific PoV conflicts detected (if any)'),
  suggestions: z
    .array(z.string())
    .describe('How to rewrite sprint to improve coherence'),
})

export type CoherenceResult = z.infer<typeof CoherenceScorerSchema>

/**
 * Score a new sprint against all prior approved content visible in the document pane.
 * Reads approved sprints from ALL paragraphs (including current paragraph's earlier sprints).
 *
 * Para 1 Sprint 1 (no prior content): always returns high score.
 * Para 2+ with prior content: enforces coherence checking.
 */
export async function scoreCoherence(
  session: WritingSession,
  document: DocumentState,
  newSprintText: string,
  paragraphIndex: number
): Promise<CoherenceResult> {
  // Collect approved content visible in the document pane.
  // Use assembled paragraph text if available (approved/locked), otherwise use
  // individual sprint texts. Never both — that double-counts the same ideas.
  const approvedSprintTexts: string[] = []
  for (let i = 0; i <= paragraphIndex; i++) {
    const para = document.paragraphs[i]
    if (para) {
      if (para.approvedText && (para.status === 'approved' || para.status === 'locked')) {
        // Paragraph is fully assembled — use that (more coherent than raw sprints)
        approvedSprintTexts.push(para.approvedText)
      } else {
        // Still in sprint-gathering — use individual sprint texts
        para.sprints.forEach((sprint) => {
          if (sprint.approvedText) {
            approvedSprintTexts.push(sprint.approvedText)
          }
        })
      }
    }
  }

  // No prior approved content — this is effectively Para 1 Sprint 1
  if (approvedSprintTexts.length === 0) {
    return {
      score: 90,
      reasoning: 'No prior approved content in document. Accepting as foundation.',
      conflicts: [],
      suggestions: [],
    }
  }

  // Para 1 with existing sprints: lenient (still building foundation)
  if (paragraphIndex === 0) {
    return {
      score: 85,
      reasoning: 'First paragraph — still establishing PoV. Lenient scoring.',
      conflicts: [],
      suggestions: [],
    }
  }

  // Para 2+: enforce coherence against all prior approved content
  const existingPoV = approvedSprintTexts.join('\n\n---\n\n')

  const prompt = `You are evaluating whether a new writing sprint coherently extends an existing document.

**All approved content visible in the document (the established PoV & voice):**
${existingPoV}

**New Sprint to Evaluate:**
${newSprintText}

Evaluate:
1. Does the new sprint align with the narrative voice established so far?
2. Does it reinforce or contradict the main point of view?
3. Are there any tonal or conceptual conflicts?
4. Does it fit the scope and depth already established?

Provide a score 0-100 where 70+ is acceptable coherence. Be balanced: early content should explore, but from paragraph 2 onward, new sprints must align with the established voice and POV.`

  const result = await generateObject({
    model: openai('gpt-4o-mini'),
    schema: CoherenceScorerSchema,
    prompt,
    temperature: 0.7,
  })

  return result.object
}
