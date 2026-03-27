import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import type { DecisionState } from '../types'
import { AI_MODEL } from '../config/ai'
import { WRITING_STYLE } from '../config/writing-style'

const RevisionSchema = z.object({
  revisedText: z.string(),
  changes: z.array(z.string()),
  explanation: z.string(),
})

export async function reviseParagraph(
  currentText: string,
  revisionDirection: string,
  globalDecisions: DecisionState[]
): Promise<{ revisedText: string; changes: string[]; explanation: string }> {
  const decisionContext = globalDecisions
    .filter((d) => d.resolved)
    .map((d) => `${d.category}: ${d.answer}`)
    .join('\n')

  const { object } = await generateObject({
    model: openai(AI_MODEL),
    schema: RevisionSchema,
    prompt: `You are a precise paragraph reviser. Revise the paragraph according to the direction given, while keeping ALL locked decisions intact.

CURRENT PARAGRAPH:
${currentText}

REVISION DIRECTION:
${revisionDirection}

LOCKED DECISIONS TO HONOR:
${decisionContext || 'None'}

RULES:
- Output raw paragraph text only — no markdown, no headings
- Exactly one paragraph (4–7 sentences)
- List what you changed (bullet-level summary in "changes")
- Explain why each change serves the revision direction in "explanation"
- Do NOT change decisions that are locked (tone, audience, intent, etc.)

${WRITING_STYLE}`,
  })

  return object
}
