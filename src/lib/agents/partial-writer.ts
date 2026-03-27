import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import type { WritingSession, DocumentState } from '../types'
import { AI_MODEL } from '../config/ai'
import { WRITING_STYLE } from '../config/writing-style'

/**
 * Generates a partial paragraph preview (2-3 sentences) mid-questioning.
 * Shows the user something concrete while they keep answering questions.
 * The full paragraph is generated later once all questions are answered.
 */
export async function generatePartialParagraph(
  session: WritingSession,
  document: DocumentState,
  paragraphIndex: number
): Promise<string> {
  const { blueprint, paragraphs, globalDecisions } = document

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
  const structureMap = blueprint?.structureMap ?? ''

  const { text } = await generateText({
    model: openai(AI_MODEL),
    system: `You are a precise paragraph writer generating an early preview — just 1-2 opening sentences. This is shown to the user while they keep answering questions; a full version will be written later.

RULES:
- Write exactly 1-2 sentences only
- Output raw text only — no markdown, no labels, no preamble
- Honor the decisions and tone below
- Make these sentences as strong as possible given the context so far

${WRITING_STYLE}`,
    prompt: `DOCUMENT SEED: ${session.seedPrompt}
STRUCTURE: ${structureMap}
TONE: ${toneProfile}

DECISIONS SO FAR:
${globalContext}

PARAGRAPH ${paragraphIndex + 1} JOB: ${paragraphJob}

PREVIOUS PARAGRAPHS:
${approvedParagraphs || '(This is the first paragraph)'}

Write the opening 1-2 sentences for paragraph ${paragraphIndex + 1}:`,
  })

  return text.trim()
}
