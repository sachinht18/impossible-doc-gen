import type { InteractionNode } from '../types'

/**
 * Detects user fatigue from interaction patterns.
 * Score 0–100. Threshold 70 → reduce question count by 30%, make stronger recommendations.
 *
 * Acknowledgment is capped at 2 times max.
 * After 2 acknowledgments, no further behavioral adjustments are made.
 */

const SHORT_ANSWER_THRESHOLD = 10
const PICK_FOR_ME_PHRASES = ['pick for me', 'you decide', 'surprise me', 'choose for me', 'idk', "i don't know", 'whatever']

function isShortAnswer(text: string): boolean {
  return text.trim().length < SHORT_ANSWER_THRESHOLD
}

function isPickForMe(text: string): boolean {
  const normalized = text.toLowerCase().trim()
  return PICK_FOR_ME_PHRASES.some((p) => normalized.includes(p))
}

function isDetailed(text: string): boolean {
  return text.trim().length > 60 && text.includes(' ')
}

export function computeFatigueScore(interactionHistory: InteractionNode[]): number {
  const answers = interactionHistory.filter((n) => n.type === 'answer')
  if (answers.length === 0) return 0

  let score = 0

  // Check last 5 answers for fatigue signals
  const recent = answers.slice(-5)

  for (const answer of recent) {
    if (isPickForMe(answer.content)) score += 15
    else if (isShortAnswer(answer.content)) score += 10
    else if (isDetailed(answer.content)) score -= 5
  }

  // Consecutive short answers amplify signal
  let consecutiveShort = 0
  for (const answer of [...answers].reverse().slice(0, 3)) {
    if (isShortAnswer(answer.content) || isPickForMe(answer.content)) {
      consecutiveShort++
    } else break
  }
  if (consecutiveShort >= 3) score += 20

  return Math.max(0, Math.min(100, score))
}

export type FatigueLevel = 'fresh' | 'mild' | 'moderate' | 'high'

export interface FatigueAdjustment {
  adjustedCount: number
  makeStrongerRecommendations: boolean
  fatigueLevel: FatigueLevel
  acknowledgment?: string
}

/**
 * Apply fatigue-based adjustments to question count and recommendations.
 *
 * @param acknowledgmentCount  How many times acknowledgment has been shown so far.
 *                             After 2 acknowledgments, no further adjustments or messages.
 *                             Options still pop up for easier input but system never picks
 *                             on behalf of the user.
 */
export function applyFatigueAdjustment(
  baseQuestionCount: number,
  fatigueScore: number,
  acknowledgmentCount: number = 0
): FatigueAdjustment {
  // After 2 acknowledgments: stop all adjustments, stop all messages
  if (acknowledgmentCount >= 2) {
    return {
      adjustedCount: baseQuestionCount,
      makeStrongerRecommendations: false,
      fatigueLevel: fatigueScore >= 70 ? 'high' : fatigueScore >= 50 ? 'moderate' : 'fresh',
      // No acknowledgment — cap reached
    }
  }

  if (fatigueScore >= 70) {
    return {
      adjustedCount: Math.max(2, Math.round(baseQuestionCount * 0.7)),
      makeStrongerRecommendations: true,
      fatigueLevel: 'high',
      acknowledgment:
        "I can tell you're getting pretty tired of this. Let me make it easier — fewer questions, and I'll point out the best option for each one. You can also just say 'pick for me' anytime.",
    }
  }
  if (fatigueScore >= 50) {
    return {
      adjustedCount: Math.max(3, Math.round(baseQuestionCount * 0.85)),
      makeStrongerRecommendations: false,
      fatigueLevel: 'moderate',
      acknowledgment:
        "You seem a bit tired of the questions. No shame in that. I'm going to shorten these and you can always say 'pick for me' if you want to move faster.",
    }
  }
  return {
    adjustedCount: baseQuestionCount,
    makeStrongerRecommendations: false,
    fatigueLevel: 'fresh',
  }
}
