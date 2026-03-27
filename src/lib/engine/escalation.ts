import type { EscalationLevel, QuestionDepthLevel } from '../types'
import { ESCALATION } from '../config/escalation-params'

/**
 * Calculates how many questions to ask and at what depth.
 * Orientation phase uses ORIENTATION_Q (high, pre-blueprint).
 * Per-paragraph curve starts high and stays high:
 *   para 1–2 → 20-22 questions, surface depth
 *   para 3–4 → 24-26 questions, structural/sentence-level
 *   para 5–8 → 24-28 questions, sentence-level
 *   para 9+  → 28-30 questions, max depth
 */
export function getEscalationLevel(
  paragraphOrderIndex: number, // 0-based; pass -1 for orientation phase
  totalParagraphs: number,
  isOrientation = false
): EscalationLevel {
  if (isOrientation) {
    return {
      targetQuestionCount: ESCALATION.ORIENTATION_Q,
      depthLevel: 'surface',
      sentenceLevelUnlocked: false,
    }
  }

  const para = paragraphOrderIndex + 1 // 1-based for readability
  const progress = totalParagraphs > 0 ? para / totalParagraphs : 0

  let targetQuestionCount: number
  let depthLevel: QuestionDepthLevel

  if (para <= 2) {
    targetQuestionCount = para === 1 ? ESCALATION.SURFACE_Q1 : ESCALATION.SURFACE_Q2
    depthLevel = 'surface'
  } else if (para <= 4) {
    targetQuestionCount = para === 3 ? ESCALATION.STRUCTURAL_Q3 : ESCALATION.STRUCTURAL_Q4
    depthLevel = para >= ESCALATION.SENTENCE_LEVEL_UNLOCK_PARA ? 'sentence_level' : 'structural'
  } else if (para <= 8) {
    targetQuestionCount = Math.round(ESCALATION.MID_BASE + (para - 5) * ESCALATION.MID_SLOPE)
    depthLevel = 'sentence_level'
  } else {
    const bonus = Math.min(para - 9, ESCALATION.MAX_BONUS)
    targetQuestionCount = Math.min(ESCALATION.MID_BASE + bonus, ESCALATION.MAX_QUESTIONS)
    depthLevel = 'sentence_level'
  }

  if (progress > ESCALATION.BOOST_THRESHOLD && targetQuestionCount < ESCALATION.MAX_QUESTIONS) {
    targetQuestionCount = Math.min(targetQuestionCount + ESCALATION.BOOST_AMOUNT, ESCALATION.MAX_QUESTIONS)
  }

  const sentenceLevelUnlocked = para >= ESCALATION.SENTENCE_LEVEL_UNLOCK_PARA

  return { targetQuestionCount, depthLevel, sentenceLevelUnlocked }
}
