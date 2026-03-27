import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import type { WritingSession, DocumentState } from '../types'
import { AI_MODEL } from '../config/ai'
import { WRITING_STYLE } from '../config/writing-style'

export async function generateParagraph(
  session: WritingSession,
  document: DocumentState,
  paragraphIndex: number
): Promise<string> {
  const { blueprint, paragraphs, globalDecisions } = document

  const globalContext = globalDecisions
    .filter((d) => d.resolved)
    .map((d) => `${d.category}: ${d.answer}`)
    .join('\n')

  const paragraphDecisions = paragraphs[paragraphIndex]?.decisions
    .filter((d) => d.resolved)
    .map((d) => `${d.category}: ${d.answer}`)
    .join('\n') ?? ''

  const approvedParagraphs = paragraphs
    .filter((p) => (p.status === 'approved' || p.status === 'locked') && p.orderIndex < paragraphIndex)
    .map((p, i) => `[Paragraph ${i + 1}]\n${p.approvedText}`)
    .join('\n\n')

  const paragraphJob = blueprint?.paragraphRoadmap[paragraphIndex]?.job ?? 'Continue the document'
  const toneProfile = blueprint?.toneProfile ?? 'Professional and clear'
  const structureMap = blueprint?.structureMap ?? ''

  const { text } = await generateText({
    model: openai(AI_MODEL),
    system: `You are a precise paragraph writer. You write exactly ONE paragraph based on the decisions given.

RULES:
- Output raw paragraph text only — no markdown, no headings, no bullet points
- Exactly one paragraph (4–7 sentences)
- Honor ALL decisions listed below
- Match the tone profile exactly
- The paragraph must do its stated "job" within the document structure
- Build naturally on the previous approved paragraphs
- Do not summarize or repeat content from previous paragraphs

${WRITING_STYLE}`,
    prompt: `DOCUMENT SEED: ${session.seedPrompt}
STRUCTURE: ${structureMap}
TONE: ${toneProfile}

GLOBAL DECISIONS:
${globalContext}

PARAGRAPH ${paragraphIndex + 1} DECISIONS:
${paragraphDecisions}

PARAGRAPH JOB: ${paragraphJob}

PREVIOUS APPROVED PARAGRAPHS:
${approvedParagraphs || '(This is the first paragraph)'}

Write paragraph ${paragraphIndex + 1} now:`,
  })

  return text.trim()
}
