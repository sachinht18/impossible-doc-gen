import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import type { Blueprint } from '../types'
import { AI_MODEL } from '../config/ai'

const BlueprintSchema = z.object({
  titleCandidates: z.array(z.string()).min(2).max(4),
  selectedTitle: z.string(),
  thesis: z.string(),
  toneProfile: z.string(),
  structureMap: z.string(),
  sectionPlan: z.array(
    z.object({
      title: z.string(),
      paragraphCount: z.number().min(1).max(4),
      role: z.string(),
    })
  ).min(2).max(5),
  paragraphRoadmap: z.array(
    z.object({
      index: z.number(),
      job: z.string(),
      startsAt: z.string(),
    })
  ),
})

export async function generateBlueprint(
  seedPrompt: string,
  orientationAnswers: Array<{ question: string; answer: string }>
): Promise<Blueprint> {
  const answersContext = orientationAnswers
    .map((a) => `Q: ${a.question}\nA: ${a.answer}`)
    .join('\n\n')

  const { object } = await generateObject({
    model: openai(AI_MODEL),
    schema: BlueprintSchema,
    prompt: `You are a document architect. Create a precise writing blueprint based on the seed and decisions.

SEED PROMPT: ${seedPrompt}

ORIENTATION DECISIONS:
${answersContext}

RULES:
- titleCandidates: 2–4 specific, non-generic titles
- selectedTitle: the strongest candidate
- thesis: one clear sentence stating the core claim
- toneProfile: describe voice, register, and stance (e.g., "Analytical and direct, first-person authority, no hedging")
- structureMap: the narrative arc in 4–6 words (e.g., "Problem → Evidence → Stakes → Resolution")
- sectionPlan: 2–5 sections, each with a role (what this section accomplishes) and paragraphCount
- paragraphRoadmap: flat list of ALL paragraphs with their index (0-based), job (1-sentence description of what this paragraph must accomplish), and startsAt (opening phrase or idea)
- Total paragraph count across sectionPlan and paragraphRoadmap must be consistent`,
  })

  return object as Blueprint
}
