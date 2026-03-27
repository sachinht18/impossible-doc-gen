import { describe, it, expect } from 'vitest'
import {
  computeFatigueScore,
  applyFatigueAdjustment,
} from '../lib/engine/fatigue-detector'
import type { InteractionNode } from '../lib/types'

function makeAnswer(content: string): InteractionNode {
  return {
    id: Math.random().toString(36).slice(2),
    type: 'answer',
    content,
    timestamp: Date.now(),
    semanticHash: 'test',
  }
}

describe('Fatigue Detection — acknowledgment cap', () => {
  // ── computeFatigueScore ─────────────────────────────────────────────────
  describe('computeFatigueScore', () => {
    it('returns 0 for no answers', () => {
      expect(computeFatigueScore([])).toBe(0)
    })

    it('"pick for me" phrases score +15 each', () => {
      const answers = [makeAnswer('pick for me'), makeAnswer('you decide')]
      expect(computeFatigueScore(answers)).toBe(30) // 15 + 15
    })

    it('short answers score +10 each', () => {
      const answers = [makeAnswer('yes'), makeAnswer('no'), makeAnswer('ok')]
      // 3 short answers = 30, plus consecutive bonus = 50
      expect(computeFatigueScore(answers)).toBeGreaterThanOrEqual(30)
    })

    it('detailed answers reduce fatigue (clamped at 0)', () => {
      const detailed = 'This is a very detailed answer that contains lots of specific information about the topic'
      const answers = [makeAnswer(detailed)]
      // -5 internally but clamped to 0 (score can't go negative)
      expect(computeFatigueScore(answers)).toBe(0)
    })

    it('3 consecutive short answers add +20 bonus', () => {
      const answers = [makeAnswer('a'), makeAnswer('b'), makeAnswer('c')]
      const score = computeFatigueScore(answers)
      // 3 × 10 (short) + 20 (consecutive) = 50
      expect(score).toBe(50)
    })

    it('score is clamped between 0 and 100', () => {
      // Many detailed answers should clamp at 0
      const detailed = 'This is a very thorough answer with elaborate reasoning and multiple considerations'
      const answers = Array.from({ length: 10 }, () => makeAnswer(detailed))
      expect(computeFatigueScore(answers)).toBe(0) // clamped, not negative

      // Many "pick for me" should approach 100
      const lazy = Array.from({ length: 10 }, () => makeAnswer('pick for me'))
      expect(computeFatigueScore(lazy)).toBeLessThanOrEqual(100)
    })
  })

  // ── applyFatigueAdjustment ──────────────────────────────────────────────
  describe('applyFatigueAdjustment', () => {
    it('fresh state: no adjustments, no acknowledgment', () => {
      const result = applyFatigueAdjustment(6, 20, 0)
      expect(result.adjustedCount).toBe(6)
      expect(result.makeStrongerRecommendations).toBe(false)
      expect(result.fatigueLevel).toBe('fresh')
      expect(result.acknowledgment).toBeUndefined()
    })

    it('moderate fatigue (50-69): reduces questions by 15%, shows acknowledgment', () => {
      const result = applyFatigueAdjustment(6, 55, 0)
      expect(result.adjustedCount).toBeLessThan(6)
      expect(result.fatigueLevel).toBe('moderate')
      expect(result.acknowledgment).toBeDefined()
      expect(result.acknowledgment).toContain('tired')
    })

    it('high fatigue (70+): reduces questions by 30%, stronger recommendations', () => {
      const result = applyFatigueAdjustment(6, 75, 0)
      expect(result.adjustedCount).toBeLessThan(6)
      expect(result.makeStrongerRecommendations).toBe(true)
      expect(result.fatigueLevel).toBe('high')
      expect(result.acknowledgment).toBeDefined()
      expect(result.acknowledgment).toContain('pick for me')
    })

    // ── THE CRITICAL CAP TEST ─────────────────────────────────────────────
    it('after 2 acknowledgments: NO further messages or adjustments', () => {
      const result = applyFatigueAdjustment(6, 90, 2)
      expect(result.adjustedCount).toBe(6) // no reduction
      expect(result.makeStrongerRecommendations).toBe(false) // no stronger recs
      expect(result.acknowledgment).toBeUndefined() // no message
      // Still reports the fatigue level correctly
      expect(result.fatigueLevel).toBe('high')
    })

    it('acknowledgmentCount = 1 still allows one more acknowledgment', () => {
      const result = applyFatigueAdjustment(6, 75, 1)
      expect(result.acknowledgment).toBeDefined()
      expect(result.makeStrongerRecommendations).toBe(true)
    })

    it('minimum question count never goes below 2 (high) or 3 (moderate)', () => {
      const high = applyFatigueAdjustment(3, 80, 0)
      expect(high.adjustedCount).toBeGreaterThanOrEqual(2)

      const moderate = applyFatigueAdjustment(3, 55, 0)
      expect(moderate.adjustedCount).toBeGreaterThanOrEqual(3)
    })
  })

  // ── Integration: simulating the hook's ref-based pattern ────────────────
  describe('ref-based tracking pattern (simulated)', () => {
    it('ack count increments correctly and caps at 2', () => {
      let ackCount = 0
      let lastLevel: string | null = null

      // Simulate 5 answers with increasing fatigue
      const fatigueScores = [30, 55, 60, 75, 85]

      for (const score of fatigueScores) {
        const adj = applyFatigueAdjustment(6, score, ackCount)

        if (
          ackCount < 2 &&
          (adj.fatigueLevel === 'moderate' || adj.fatigueLevel === 'high') &&
          adj.acknowledgment &&
          lastLevel !== adj.fatigueLevel
        ) {
          lastLevel = adj.fatigueLevel
          ackCount++
        }
      }

      // Should have acknowledged exactly 2 times:
      // 1. When score hit 55 (moderate)
      // 2. When score hit 75 (high)
      // Score 85 should NOT trigger a third acknowledgment
      expect(ackCount).toBe(2)
    })

    it('same fatigue level does not trigger duplicate acknowledgment', () => {
      let ackCount = 0
      let lastLevel: string | null = null

      // Multiple moderate scores in a row
      const fatigueScores = [55, 58, 62, 65]

      for (const score of fatigueScores) {
        const adj = applyFatigueAdjustment(6, score, ackCount)
        if (
          ackCount < 2 &&
          (adj.fatigueLevel === 'moderate' || adj.fatigueLevel === 'high') &&
          adj.acknowledgment &&
          lastLevel !== adj.fatigueLevel
        ) {
          lastLevel = adj.fatigueLevel
          ackCount++
        }
      }

      expect(ackCount).toBe(1) // Only 1 — all same level
    })
  })
})
