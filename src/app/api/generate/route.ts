import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateQuestions } from '@/lib/agents/question-generator'
import { generateParagraph } from '@/lib/agents/draft-writer'
import { reviseParagraph } from '@/lib/agents/critic'
import { generateBlueprint } from '@/lib/agents/document-architect'
import { adviseBlueprintChanges } from '@/lib/agents/blueprint-advisor'
import { detectInconsistency } from '@/lib/agents/inconsistency-detector'
import { generatePartialParagraph } from '@/lib/agents/partial-writer'
import { generateSprint } from '@/lib/agents/sprint-writer'
import { assembleParagraph } from '@/lib/agents/paragraph-assembler'
import { scoreCoherence } from '@/lib/agents/coherence-scorer'
import { resolveCoherenceConflict } from '@/lib/agents/coherence-resolver'

export const runtime = 'nodejs'
export const maxDuration = 60

function checkApiKey() {
  const key = process.env.OPENAI_API_KEY
  if (!key || key === 'your_key_here') {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is not set. Add it to your .env.local file and restart the server.' },
      { status: 500 }
    )
  }
  return null
}

// ── Minimal validation schemas ────────────────────────────────────────────────
// session/document come from our own Zustand store so we trust their shape;
// we only validate the discriminant and scalar fields that differ per action.

const GenerateQuestionsSchema = z.object({
  action: z.literal('generate-questions'),
  session: z.record(z.string(), z.unknown()),
  document: z.record(z.string(), z.unknown()),
  paragraphIndex: z.number().int().nonnegative(),
  sprintIndex: z.number().int().nonnegative().optional(),
})

const GenerateSprintSchema = z.object({
  action: z.literal('generate-sprint'),
  session: z.record(z.string(), z.unknown()),
  document: z.record(z.string(), z.unknown()),
  paragraphIndex: z.number().int().nonnegative(),
  sprintIndex: z.number().int().nonnegative(),
})

const GenerateParagraphSchema = z.object({
  action: z.literal('generate-paragraph'),
  session: z.record(z.string(), z.unknown()),
  document: z.record(z.string(), z.unknown()),
  paragraphIndex: z.number().int().nonnegative(),
})

const ReviseParagraphSchema = z.object({
  action: z.literal('revise-paragraph'),
  paragraphId: z.string().min(1),
  currentText: z.string().min(1),
  revisionDirection: z.string().min(1),
  globalDecisions: z.array(z.record(z.string(), z.unknown())),
})

const GenerateBlueprintSchema = z.object({
  action: z.literal('generate-blueprint'),
  seedPrompt: z.string().min(1),
  orientationAnswers: z.array(
    z.object({ question: z.string(), answer: z.string() })
  ),
})

const AdviseBlueprintSchema = z.object({
  action: z.literal('advise-blueprint'),
  blueprint: z.record(z.string(), z.unknown()),
  seedPrompt: z.string().min(1),
})

const DetectInconsistencySchema = z.object({
  action: z.literal('detect-inconsistency'),
  seedPrompt: z.string().min(1),
  qaHistory: z.array(z.object({ question: z.string(), answer: z.string() })),
})

const GeneratePartialParagraphSchema = z.object({
  action: z.literal('generate-partial-paragraph'),
  session: z.record(z.string(), z.unknown()),
  document: z.record(z.string(), z.unknown()),
  paragraphIndex: z.number().int().nonnegative(),
})

const AssembleParagraphSchema = z.object({
  action: z.literal('assemble-paragraph'),
  session: z.record(z.string(), z.unknown()),
  document: z.record(z.string(), z.unknown()),
  paragraphIndex: z.number().int().nonnegative(),
})

const ApiPayloadSchema = z.discriminatedUnion('action', [
  GenerateQuestionsSchema,
  GenerateParagraphSchema,
  GenerateSprintSchema,
  ReviseParagraphSchema,
  GenerateBlueprintSchema,
  AdviseBlueprintSchema,
  DetectInconsistencySchema,
  GeneratePartialParagraphSchema,
  AssembleParagraphSchema,
])

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const keyError = checkApiKey()
  if (keyError) return keyError

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = ApiPayloadSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const body = parsed.data

  try {
    switch (body.action) {
      case 'generate-questions': {
        const questions = await generateQuestions(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          body.session as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          body.document as any,
          body.paragraphIndex,
          body.sprintIndex
        )
        return NextResponse.json({ questions })
      }

      case 'generate-sprint': {
        let text = await generateSprint(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          body.session as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          body.document as any,
          body.paragraphIndex,
          body.sprintIndex
        )

        // ── Coherence checking (para 2+) ──────────────────────────────────────
        const paragraphIndex = body.paragraphIndex
        if (paragraphIndex >= 1) {
          const coherence = await scoreCoherence(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            body.session as any,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            body.document as any,
            text,
            paragraphIndex
          )

          console.log(
            `[Coherence] Para ${paragraphIndex}: score=${coherence.score} ` +
              `(${coherence.reasoning})`
          )

          // If below 70, attempt conflict resolution
          if (coherence.score < 70) {
            const resolution = await resolveCoherenceConflict(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              body.session as any,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              body.document as any,
              text,
              paragraphIndex,
              coherence.score
            )

            console.log(
              `[Coherence] Resolution: ${resolution.resolved ? 'accepted' : 'rewrite needed'} ` +
                `(retractions=${resolution.retractionCount})`
            )

            // If everything was deleted, signal reset to start
            if (resolution.resetToStart) {
              console.log(`[Coherence] Full reset: treating new sprint as Para 1 Sprint 1`)

              return NextResponse.json({
                text,
                coherence: {
                  score: coherence.score,
                  resolved: false,
                  retractionCount: resolution.retractionCount,
                  reasoning: coherence.reasoning,
                  resetToStart: true,
                  sorry: resolution.sorry,
                  deletedParagraphCount: resolution.deletedParagraphCount,
                  deletedParagraphIndices: resolution.deletedParagraphIndices,
                  deletions: resolution.deletions,
                  reason: resolution.reason,
                },
              })
            }

            // If rewrite needed (retraction limit hit but not everything deleted),
            // regenerate with modified prompt — same topic, different angle
            if (resolution.rewriteNeeded) {
              console.log(`[Coherence] Rewriting sprint with different angle`)

              text = await generateSprint(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                body.session as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                body.document as any,
                body.paragraphIndex,
                body.sprintIndex,
                true // rewriteAngle — instruct sprint-writer to take a different approach
              )

              // Re-score the rewrite (don't blindly accept it)
              const rewriteScore = await scoreCoherence(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                body.session as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                body.document as any,
                text,
                paragraphIndex
              )

              console.log(
                `[Coherence] Rewrite score: ${rewriteScore.score}/100`
              )

              return NextResponse.json({
                text,
                coherence: {
                  score: rewriteScore.score,
                  resolved: rewriteScore.score >= 70,
                  retractionCount: resolution.retractionCount,
                  reasoning: rewriteScore.reasoning,
                  sorry: resolution.sorry,
                  deletedParagraphCount: resolution.deletedParagraphCount,
                  deletedParagraphIndices: resolution.deletedParagraphIndices,
                  deletions: resolution.deletions,
                  reason: rewriteScore.score >= 70
                    ? `Rewrite accepted with score ${rewriteScore.score}/100.`
                    : `Rewrite still below threshold (${rewriteScore.score}/100). Showing best attempt.`,
                },
              })
            }

            return NextResponse.json({
              text,
              coherence: {
                score: coherence.score,
                resolved: resolution.resolved,
                retractionCount: resolution.retractionCount,
                reasoning: coherence.reasoning,
                sorry: resolution.sorry,
                deletedParagraphCount: resolution.deletedParagraphCount,
                deletedParagraphIndices: resolution.deletedParagraphIndices,
                deletions: resolution.deletions,
                reason: resolution.reason,
              },
            })
          }

          return NextResponse.json({
            text,
            coherence: {
              score: coherence.score,
              resolved: true,
              retractionCount: 0,
              reasoning: coherence.reasoning,
            },
          })
        }

        return NextResponse.json({ text })
      }

      case 'generate-paragraph': {
        const text = await generateParagraph(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          body.session as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          body.document as any,
          body.paragraphIndex
        )
        return NextResponse.json({ text })
      }

      case 'revise-paragraph': {
        const result = await reviseParagraph(
          body.currentText,
          body.revisionDirection,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          body.globalDecisions as any
        )
        return NextResponse.json(result)
      }

      case 'generate-blueprint': {
        const blueprint = await generateBlueprint(body.seedPrompt, body.orientationAnswers)
        return NextResponse.json({ blueprint })
      }

      case 'advise-blueprint': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await adviseBlueprintChanges(body.blueprint as any, body.seedPrompt)
        return NextResponse.json(result)
      }

      case 'detect-inconsistency': {
        const result = await detectInconsistency(body.seedPrompt, body.qaHistory)
        return NextResponse.json(result)
      }

      case 'generate-partial-paragraph': {
        const text = await generatePartialParagraph(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          body.session as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          body.document as any,
          body.paragraphIndex
        )
        return NextResponse.json({ text })
      }

      case 'assemble-paragraph': {
        const text = await assembleParagraph(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          body.session as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          body.document as any,
          body.paragraphIndex
        )
        return NextResponse.json({ text })
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('[generate route]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
