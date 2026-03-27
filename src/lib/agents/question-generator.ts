import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { AI_SMALL_MODEL } from '../config/ai'
import type { WritingSession, DocumentState, QuestionCard, DecisionCategory } from '../types'
import { getEscalationLevel } from '../engine/escalation'
import { applyFatigueAdjustment } from '../engine/fatigue-detector'
import { filterNovelQuestions } from '../engine/novelty-checker'

const QuestionSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      helperText: z.string(),
      category: z.enum([
        'intent', 'audience', 'tone', 'structure',
        'paragraph_job', 'sentence_role', 'transition',
        'rhetorical_move', 'evidence', 'conclusion',
      ]),
      // freetext = open blank, choice = option chips
      inputType: z.enum(['choice', 'freetext']),
      options: z.array(
        z.object({
          label: z.string(),
          consequence: z.string(),
        })
      ).max(5),
      allowCustom: z.boolean(),
    })
  ),
})

const SPRINTS_PER_PARAGRAPH = 2

export { SPRINTS_PER_PARAGRAPH }

export async function generateQuestions(
  session: WritingSession,
  document: DocumentState,
  paragraphIndex: number,
  sprintIndex?: number
): Promise<QuestionCard[]> {
  const isSprint = sprintIndex !== undefined
  const isOrientation = session.currentStep === 'orienting'
  const escalation = getEscalationLevel(
    paragraphIndex,
    document.blueprint?.paragraphRoadmap.length ?? 5,
    isOrientation
  )
  const { adjustedCount, makeStrongerRecommendations } = applyFatigueAdjustment(
    escalation.targetQuestionCount,
    session.fatigueScore
  )

  const lockedDecisionsSummary = document.globalDecisions
    .filter((d) => d.resolved)
    .map((d) => `${d.category}: ${d.answer}`)
    .join('\n')

  const previousParagraphsSummary = document.paragraphs
    .filter((p) => p.status === 'approved' || p.status === 'locked')
    .map((p, i) => `Paragraph ${i + 1}: ${p.approvedText.slice(0, 120)}...`)
    .join('\n')

  const paragraphJob = isOrientation
    ? 'Understand the user\'s full intent before building the document blueprint'
    : (document.blueprint?.paragraphRoadmap[paragraphIndex]?.job ?? 'Unknown')

  const draftPreview = document.paragraphs[paragraphIndex]?.draftText
    ? `\n\nPARTIAL DRAFT SO FAR:\n${document.paragraphs[paragraphIndex].draftText}\nAsk follow-up questions that push this draft toward better choices.`
    : ''

  const sentenceLevelInstruction = escalation.sentenceLevelUnlocked
    ? `Include several sentence-level questions (sentence_role, rhetorical_move) about specific sentences, must-include phrases, or rhetorical moves.`
    : `Mix structural questions (paragraph_job, tone, evidence) with intent and audience questions.`

  const recommendationInstruction = makeStrongerRecommendations
    ? `The user seems fatigued. One option per question should clearly be the best choice. Lead with it.`
    : `Offer balanced options with clear, honest consequences for each.`

  const mixInstruction = isOrientation
    ? `IMPORTANT MIXING RULE: About 35% of questions should be FREETEXT (no options — just a blank where the user types). These should be the most important, open-ended questions where a typed answer reveals more than a chip pick. The rest (65%) should be CHOICE type with 3–4 clear options. Do NOT make every question a choice question. Freetext questions should invite reflection, not just confirm.`
    : isSprint
    ? `IMPORTANT MIXING RULE: Sprint questions are tactical. About 40% should be FREETEXT — especially "what specific example/data to include" or "write the opening line you want". The rest should be CHOICE with 3–4 tight options. Keep choices concrete — not vague categories but specific sentence strategies.`
    : `IMPORTANT MIXING RULE: About 25% of questions should be FREETEXT (inputType: "freetext", options: []) — specifically for questions asking for examples, personal opinions, or where a typed answer adds depth. The rest should be CHOICE type. Never use "give an example" as a chip option — those belong in freetext questions.`

  const approvedSprintTexts = !isOrientation && isSprint
    ? (document.paragraphs[paragraphIndex]?.sprints ?? [])
        .filter((s) => s.status === 'approved')
        .map((s, i) => `Sprint ${i + 1}: ${s.approvedText}`)
        .join('\n')
    : ''

  // ── Difficulty curve: Easy for para 1-2, harder for para 3+ ───────────────
  const difficultyInstruction =
    paragraphIndex <= 1
      ? `DIFFICULTY: EXPLORATORY (Para ${paragraphIndex + 1})
These early paragraphs are setting the document's voice and POV. Ask OPEN-ENDED questions that invite exploration and discovery. Accept diverse answers. Later paragraphs will enforce coherence, but right now, we're building the foundation.`
      : `DIFFICULTY: ENFORCING COHERENCE (Para ${paragraphIndex + 1})
The document's POV is now established. Ask SPECIFIC, CONSTRAINED questions that naturally pull the new content toward alignment with existing paragraphs. Options should be mutually exclusive and all lean toward the established voice. Users should find it harder to deviate from the PoV.`

  const phaseInstruction = isOrientation
    ? `This is the ORIENTATION phase. You are getting to know the user's intent, audience, and core purpose BEFORE a blueprint exists. Ask deep, exploratory questions across: their main argument, who they're writing for, what they want readers to feel/do, their stance, the context that makes this worth writing, their own expertise level on this topic, and anything surprising they want included. Do NOT ask about structure or section plans yet.`
    : isSprint
    ? `SPRINT PLANNING — Sprint ${(sprintIndex ?? 0) + 1} of ${SPRINTS_PER_PARAGRAPH} for Paragraph ${paragraphIndex + 1}.
PARAGRAPH JOB: ${paragraphJob}
${approvedSprintTexts ? `APPROVED SPRINTS WRITTEN SO FAR:\n${approvedSprintTexts}` : 'This is the first sprint — nothing written yet.'}
Ask SPECIFIC, sentence-level questions: what single point this sprint must land, what rhetorical move to open with, what concrete example or evidence to include, how it hands off to the next sprint. Focus on sentence_role, rhetorical_move, evidence categories. DO NOT re-ask paragraph-level intent or audience questions.`
    : `PARAGRAPH PLANNING — deciding the overall direction for Paragraph ${paragraphIndex + 1}.
PARAGRAPH JOB: ${paragraphJob}
DEPTH LEVEL: ${escalation.depthLevel}
${sentenceLevelInstruction}
Ask about: the paragraph's core claim, how it fits the document structure, tone calibration for this specific section, what NOT to include. Focus on paragraph_job, structure, tone, intent categories. Do NOT ask sentence-level questions — those come in the sprint phase.`

  const { object } = await generateObject({
    model: openai(AI_SMALL_MODEL),
    schema: QuestionSchema,
    prompt: `You are the question engine for a co-authoring document system. Generate exactly ${adjustedCount} questions.

DOCUMENT SEED: ${session.seedPrompt}

${difficultyInstruction}

${phaseInstruction}

LOCKED DECISIONS (already resolved — do NOT re-ask):
${lockedDecisionsSummary || 'None yet'}

PREVIOUS PARAGRAPHS:
${previousParagraphsSummary || 'None yet'}${draftPreview}

RULES:
- ${mixInstruction}
- For CHOICE questions: 3–5 option chips, each with a consequence
- For FREETEXT questions: options must be [] and allowCustom must be true
- Questions must be SPECIFIC — not "what tone?" but "Do you want the reader to feel challenged or reassured after the first paragraph?"
- Never re-ask anything already in locked decisions
- Questions should escalate in specificity (broad first, granular last)
- helperText explains WHY this decision matters, concisely
- ${recommendationInstruction}`,
  })

  const questionScope = isSprint ? 'sprint' : 'paragraph'

  const candidates = object.questions.map((q) => ({
    ...q,
    id: Math.random().toString(36).slice(2, 10),
    category: q.category as DecisionCategory,
    inputType: q.inputType as 'choice' | 'freetext',
    options: q.options ?? [],
    questionScope: questionScope as 'paragraph' | 'sprint',
  }))

  const novel = filterNovelQuestions(candidates, session.interactionHistory)

  return novel.map((q) => ({
    ...q,
    id: Math.random().toString(36).slice(2, 10),
    questionScope: q.questionScope ?? questionScope,
  })) as QuestionCard[]
}
