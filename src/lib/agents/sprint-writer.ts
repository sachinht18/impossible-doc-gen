import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import type { WritingSession, DocumentState } from '../types'
import { AI_MODEL } from '../config/ai'
import { WRITING_STYLE } from '../config/writing-style'

/**
 * Generates a 2-3 sentence sprint — one chunk of a paragraph.
 * Multiple sprints are assembled into a full paragraph once all are approved.
 */
export async function generateSprint(
  session: WritingSession,
  document: DocumentState,
  paragraphIndex: number,
  sprintIndex: number,
  rewriteAngle?: boolean
): Promise<string> {
  const { blueprint, paragraphs, globalDecisions } = document

  const globalContext = globalDecisions
    .filter((d) => d.resolved)
    .map((d) => `${d.category}: ${d.answer}`)
    .join('\n')

  const para = paragraphs[paragraphIndex]
  const approvedSprintTexts = (para?.sprints ?? [])
    .filter((s) => s.status === 'approved')
    .map((s, i) => `Sprint ${i + 1}: ${s.approvedText}`)
    .join('\n\n')

  const approvedParagraphs = paragraphs
    .filter((p) => (p.status === 'approved' || p.status === 'locked') && p.orderIndex < paragraphIndex)
    .map((p, i) => `[Paragraph ${i + 1}]\n${p.approvedText}`)
    .join('\n\n')

  const paragraphJob = blueprint?.paragraphRoadmap[paragraphIndex]?.job ?? 'Continue the document'
  const toneProfile = blueprint?.toneProfile ?? 'Professional and clear'
  const structureMap = blueprint?.structureMap ?? ''
  const totalSprints = 2 // matches SPRINTS_PER_PARAGRAPH constant
  const isLastSprint = sprintIndex === totalSprints - 1

  const rewriteInstruction = rewriteAngle
    ? `\n- IMPORTANT: A previous version of this sprint was rejected for coherence issues. Write from a DIFFERENT ANGLE — same topic and paragraph job, but approach it with a fresh perspective, different phrasing, and alternative examples. Do NOT repeat the same structure or wording.`
    : ''

  const { text } = await generateText({
    model: openai(AI_MODEL),
    system: `You are a precision sentence writer. You write exactly ONE sprint — 2 to 3 sentences — that is one chunk of a larger paragraph. Another sprint will complete this paragraph, so do NOT try to wrap up or conclude unless this is the last sprint.

RULES:
- Write exactly 2–3 sentences. No more.
- Output raw sentences only — no markdown, no labels, no preamble
- Honor ALL decisions listed below
- Match the tone profile exactly
- ${isLastSprint ? 'This is the FINAL sprint — close the paragraph idea cleanly but do NOT summarize the whole document.' : 'This is NOT the final sprint — leave the thought open so the next sprint can build on it naturally.'}
- Build directly from any approved sprint text already written${rewriteInstruction}

${WRITING_STYLE}`,
    prompt: `DOCUMENT SEED: ${session.seedPrompt}
STRUCTURE: ${structureMap}
TONE: ${toneProfile}

DECISIONS (use all relevant ones):
${globalContext}

PARAGRAPH ${paragraphIndex + 1} JOB: ${paragraphJob}

APPROVED SPRINT TEXT FOR THIS PARAGRAPH SO FAR:
${approvedSprintTexts || '(This is the first sprint — nothing written yet)'}

PREVIOUS APPROVED PARAGRAPHS:
${approvedParagraphs || '(This is the first paragraph)'}

Write Sprint ${sprintIndex + 1} of ${totalSprints} now (2–3 sentences only):`,
  })

  return text.trim()
}
