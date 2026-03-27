import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import type { WritingSession, DocumentState } from '../types'
import { AI_MODEL } from '../config/ai'
import { WRITING_STYLE } from '../config/writing-style'

/**
 * Takes 2–5 approved sprints and produces a single cohesive paragraph.
 * The agent must NOT add new ideas — it only smooths transitions and
 * ensures the sentences read as one continuous unit.
 */
export async function assembleParagraph(
  session: WritingSession,
  document: DocumentState,
  paragraphIndex: number
): Promise<string> {
  const { blueprint, paragraphs, globalDecisions } = document

  const para = paragraphs[paragraphIndex]
  const approvedSprints = (para?.sprints ?? [])
    .filter((s) => s.status === 'approved')
    .sort((a, b) => a.orderIndex - b.orderIndex)

  if (approvedSprints.length === 0) {
    throw new Error('No approved sprints to assemble')
  }

  // If only one sprint, no stitching needed — return it directly
  if (approvedSprints.length === 1) {
    return approvedSprints[0].approvedText.trim()
  }

  const sprintBlock = approvedSprints
    .map((s, i) => `[Sprint ${i + 1}]\n${s.approvedText}`)
    .join('\n\n')

  const globalContext = globalDecisions
    .filter((d) => d.resolved)
    .map((d) => `${d.category}: ${d.answer}`)
    .join('\n')

  const approvedParagraphs = paragraphs
    .filter((p) => (p.status === 'approved' || p.status === 'locked') && p.orderIndex < paragraphIndex)
    .map((p, i) => `[Paragraph ${i + 1}]\n${p.approvedText}`)
    .join('\n\n')

  const paragraphJob = blueprint?.paragraphRoadmap[paragraphIndex]?.job ?? 'Continue the document'
  const toneProfile = blueprint?.toneProfile ?? 'Professional and clear'

  const { text } = await generateText({
    model: openai(AI_MODEL),
    system: `You are a paragraph stitcher. You receive 2–5 short sprint chunks that the user has already approved. Your only job is to join them into one smooth, cohesive paragraph.

RULES — read these carefully:
- Output raw paragraph text only — no markdown, no labels, no preamble
- Preserve every idea and claim from the sprint chunks exactly as the user approved them
- Do NOT add new ideas, examples, or arguments that were not in the sprints
- Do NOT remove any content — every sentence must survive the assembly
- You may only change: transition words, conjunctions, and minor phrasing at the seam between chunks to create natural flow
- The result must read as one continuous paragraph, not as a list of joined sentences
- Match the tone profile exactly

${WRITING_STYLE}`,
    prompt: `DOCUMENT SEED: ${session.seedPrompt}
TONE: ${toneProfile}

GLOBAL DECISIONS:
${globalContext}

PARAGRAPH ${paragraphIndex + 1} JOB: ${paragraphJob}

PREVIOUS APPROVED PARAGRAPHS:
${approvedParagraphs || '(This is the first paragraph)'}

APPROVED SPRINT CHUNKS TO ASSEMBLE:
${sprintBlock}

Assemble the sprints above into one cohesive paragraph now:`,
  })

  return text.trim()
}
