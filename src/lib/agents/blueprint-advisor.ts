import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import type { Blueprint } from '../types'
import { AI_SMALL_MODEL } from '../config/ai'

const AdvisorSchema = z.object({
  intro: z.string(),
  suggestions: z.array(
    z.object({
      aspect: z.string(),
      current: z.string(),
      howToChange: z.string(),
    })
  ),
  closingPrompt: z.string(),
})

export interface BlueprintAdvisorResult {
  intro: string
  suggestions: Array<{ aspect: string; current: string; howToChange: string }>
  closingPrompt: string
}

export async function adviseBlueprintChanges(
  blueprint: Blueprint,
  seedPrompt: string
): Promise<BlueprintAdvisorResult> {
  const { object } = await generateObject({
    model: openai(AI_SMALL_MODEL),
    schema: AdvisorSchema,
    prompt: `You are a writing coach reviewing a document blueprint. The user wants to make changes before writing begins. Help them understand what they can modify and how.

SEED PROMPT: ${seedPrompt}

CURRENT BLUEPRINT:
- Title: ${blueprint.selectedTitle}
- Thesis: ${blueprint.thesis}
- Tone: ${blueprint.toneProfile}
- Structure: ${blueprint.structureMap}
- Sections: ${blueprint.sectionPlan.map((s) => `${s.title} (${s.paragraphCount} paragraphs)`).join(', ')}

Generate:
- intro: A short friendly sentence acknowledging they want changes (1 sentence)
- suggestions: For each of the 4-5 key aspects (title, thesis, tone, structure, section plan), explain what's currently set and how they could change it. Be specific and concrete.
- closingPrompt: Ask them what they'd like to change (1 sentence, direct)`,
  })

  return object
}
