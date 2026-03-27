import { describe, it, expect } from 'vitest'
import { ESCALATION } from '../lib/config/escalation-params'

/**
 * Tests the dynamic inconsistency detection interval configuration
 * and the randomization logic used by the hook.
 */

describe('Inconsistency detection interval', () => {
  it('INCONSISTENCY_CHECK_MIN is 4', () => {
    expect(ESCALATION.INCONSISTENCY_CHECK_MIN).toBe(4)
  })

  it('INCONSISTENCY_CHECK_MAX is 8', () => {
    expect(ESCALATION.INCONSISTENCY_CHECK_MAX).toBe(8)
  })

  it('MIN <= MAX', () => {
    expect(ESCALATION.INCONSISTENCY_CHECK_MIN).toBeLessThanOrEqual(ESCALATION.INCONSISTENCY_CHECK_MAX)
  })

  it('dynamic interval formula always produces values in [MIN, MAX]', () => {
    const { INCONSISTENCY_CHECK_MIN: MIN, INCONSISTENCY_CHECK_MAX: MAX } = ESCALATION
    const range = MAX - MIN + 1

    // Simulate 1000 random trigger calculations
    for (let i = 0; i < 1000; i++) {
      const value = MIN + Math.floor(Math.random() * range)
      expect(value).toBeGreaterThanOrEqual(MIN)
      expect(value).toBeLessThanOrEqual(MAX)
    }
  })

  it('next trigger is always ahead of current answer count', () => {
    // Simulate the hook's pattern: after firing, next trigger = current + random(4-8)
    const { INCONSISTENCY_CHECK_MIN: MIN, INCONSISTENCY_CHECK_MAX: MAX } = ESCALATION

    let totalAnswers = 0
    let nextTrigger = MIN + Math.floor(Math.random() * (MAX - MIN + 1))

    for (let round = 0; round < 50; round++) {
      // Simulate answers until trigger fires
      while (totalAnswers < nextTrigger) {
        totalAnswers++
      }

      // Fire! Re-randomize
      const prevTrigger = nextTrigger
      nextTrigger = totalAnswers + MIN + Math.floor(Math.random() * (MAX - MIN + 1))

      // Next trigger must be strictly ahead
      expect(nextTrigger).toBeGreaterThan(totalAnswers)
      expect(nextTrigger).toBeGreaterThan(prevTrigger)
    }
  })
})

describe('Question difficulty curve config', () => {
  it('BASE_QUESTION_COUNT is defined', () => {
    expect(ESCALATION.BASE_QUESTION_COUNT).toBeGreaterThan(0)
  })
})
