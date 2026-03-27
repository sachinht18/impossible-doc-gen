import { describe, it, expect } from 'vitest'
import { getEscalationLevel } from '../lib/engine/escalation'

describe('getEscalationLevel', () => {
  it('paragraph 1 returns 20 questions at surface depth', () => {
    const result = getEscalationLevel(0, 8)
    expect(result.targetQuestionCount).toBe(20)
    expect(result.depthLevel).toBe('surface')
    expect(result.sentenceLevelUnlocked).toBe(false)
  })

  it('paragraph 2 returns 22 questions at surface depth', () => {
    const result = getEscalationLevel(1, 8)
    expect(result.targetQuestionCount).toBe(22)
    expect(result.depthLevel).toBe('surface')
    expect(result.sentenceLevelUnlocked).toBe(false)
  })

  it('paragraph 3 returns 24 questions at sentence-level depth', () => {
    const result = getEscalationLevel(2, 8)
    expect(result.targetQuestionCount).toBe(24)
    expect(result.depthLevel).toBe('sentence_level')
    expect(result.sentenceLevelUnlocked).toBe(true)
  })

  it('paragraph 4 returns 26 questions at sentence-level depth', () => {
    const result = getEscalationLevel(3, 8)
    expect(result.targetQuestionCount).toBe(26)
    expect(result.sentenceLevelUnlocked).toBe(true)
    expect(result.depthLevel).toBe('sentence_level')
  })

  it('paragraph 5 returns 24+ questions at sentence_level', () => {
    const result = getEscalationLevel(4, 10)
    expect(result.targetQuestionCount).toBeGreaterThanOrEqual(24)
    expect(result.depthLevel).toBe('sentence_level')
    expect(result.sentenceLevelUnlocked).toBe(true)
  })

  it('paragraph 10 returns 28–30 questions', () => {
    const result = getEscalationLevel(9, 12)
    expect(result.targetQuestionCount).toBeGreaterThanOrEqual(28)
    expect(result.targetQuestionCount).toBeLessThanOrEqual(30)
    expect(result.depthLevel).toBe('sentence_level')
  })

  it('final paragraphs get boosted question count', () => {
    // paragraph 9 of 10 → progress > 0.8
    const result = getEscalationLevel(8, 10)
    expect(result.targetQuestionCount).toBeGreaterThanOrEqual(28)
  })

  it('never exceeds 30 questions', () => {
    const result = getEscalationLevel(20, 22)
    expect(result.targetQuestionCount).toBeLessThanOrEqual(30)
  })
})
