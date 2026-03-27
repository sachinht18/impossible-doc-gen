import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DocumentState, WritingSession, SprintState, ParagraphState } from '../lib/types'

/**
 * Coherence Resolver — tests the retraction logic WITHOUT calling the LLM.
 * We mock scoreCoherence to control scores and verify:
 *   1. Cumulative deletions (clone once, splice iteratively)
 *   2. Exact SprintDeletion[] pairs returned
 *   3. resetToStart when all sprints gone
 *   4. sorry when 2+ paragraphs affected
 *   5. rewriteNeeded when retraction limit hit
 *   6. Para 0 never retracts
 *   7. Score >= 70 short-circuits
 */

// Mock the coherence scorer so we don't call OpenAI
vi.mock('../lib/agents/coherence-scorer', () => {
  let callCount = 0
  return {
    scoreCoherence: vi.fn(async () => {
      callCount++
      // First re-score: still below 70
      // Second re-score: passes 70
      if (callCount <= 1) return { score: 50, reasoning: 'Still low', conflicts: [], suggestions: [] }
      return { score: 80, reasoning: 'Now coherent', conflicts: [], suggestions: [] }
    }),
    __resetCallCount: () => { callCount = 0 },
  }
})

const { resolveCoherenceConflict } = await import('../lib/agents/coherence-resolver')
const coherenceScorerModule = await import('../lib/agents/coherence-scorer')
const { __resetCallCount } = coherenceScorerModule as typeof coherenceScorerModule & {
  __resetCallCount: () => void
}

function makeSession(): WritingSession {
  return {
    id: 'test',
    seedPrompt: 'test',
    mode: 'guided',
    currentStep: 'sprint_generating',
    priorStep: null,
    permissionState: 0,
    fatigueScore: 0,
    overrideAttemptCount: 0,
    interactionHistory: [],
    activeQuestions: [],
    currentParagraphIndex: 2,
    currentSprintIndex: 0,
    error: null,
    lastSavedAt: null,
  }
}

function makeSprint(idx: number, approved: boolean): SprintState {
  return {
    id: `s${idx}`,
    orderIndex: idx,
    status: approved ? 'approved' : 'placeholder',
    decisions: [],
    draftText: approved ? `Sprint ${idx} text.` : '',
    approvedText: approved ? `Sprint ${idx} text.` : '',
    revisionHistory: [],
  }
}

function makePara(idx: number, sprints: SprintState[], approved = false): ParagraphState {
  return {
    id: `p${idx}`,
    orderIndex: idx,
    status: approved ? 'approved' : 'gathering_sprints',
    decisions: [],
    sprints,
    draftText: approved ? `Paragraph ${idx} assembled.` : '',
    approvedText: approved ? `Paragraph ${idx} assembled.` : '',
    revisionHistory: [],
    sectionIndex: Math.floor(idx / 3),
  }
}

function makeDoc(paragraphs: ParagraphState[]): DocumentState {
  return {
    blueprint: null,
    paragraphs,
    globalDecisions: [],
    lockedDecisions: [],
    pendingDecisions: [],
  }
}

beforeEach(() => {
  __resetCallCount()
})

describe('Coherence Resolver', () => {
  it('para 0 never retracts — returns resolved immediately', async () => {
    const doc = makeDoc([makePara(0, [makeSprint(0, true)])])
    const result = await resolveCoherenceConflict(makeSession(), doc, 'new text', 0, 40)

    expect(result.resolved).toBe(true)
    expect(result.retractionCount).toBe(0)
    expect(result.deletions).toEqual([])
    expect(result.reason).toContain('Paragraph 1')
  })

  it('score >= 70 short-circuits without retraction', async () => {
    const doc = makeDoc([
      makePara(0, [makeSprint(0, true)], true),
      makePara(1, [makeSprint(0, true)]),
    ])
    const result = await resolveCoherenceConflict(makeSession(), doc, 'new text', 1, 75)

    expect(result.resolved).toBe(true)
    expect(result.retractionCount).toBe(0)
    expect(result.deletions).toEqual([])
  })

  it('retracts newest sprint backward and returns exact deletion pairs', async () => {
    // Para 0: 2 approved sprints. Para 1: 1 approved sprint. Scoring para 2.
    const doc = makeDoc([
      makePara(0, [makeSprint(0, true), makeSprint(1, true)], true),
      makePara(1, [makeSprint(0, true)]),
      makePara(2, []), // current paragraph being written
    ])

    // Mock: first re-score returns 50 (retract again), second returns 80 (accept)
    const result = await resolveCoherenceConflict(makeSession(), doc, 'new sprint', 2, 40)

    expect(result.resolved).toBe(true)
    expect(result.retractionCount).toBe(2)
    // Should have retracted: para 1 sprint 0 first (newest across all prev paras),
    // then para 0 sprint 1 (newest remaining)
    expect(result.deletions).toEqual([
      { paragraphIndex: 1, sprintIndex: 0 },
      { paragraphIndex: 0, sprintIndex: 1 },
    ])
    expect(result.deletedParagraphIndices).toEqual([0, 1])
    expect(result.deletedParagraphCount).toBe(2)
    expect(result.sorry).toBe(true) // 2+ paragraphs affected
  })

  it('resetToStart when all prior sprints are deleted', async () => {
    // Only 1 sprint total in prior paragraphs
    const doc = makeDoc([
      makePara(0, [makeSprint(0, true)]),
      makePara(1, []), // current
    ])

    // Mock always returns < 70
    const { scoreCoherence } = await import('../lib/agents/coherence-scorer')
    vi.mocked(scoreCoherence).mockResolvedValue({
      score: 30,
      reasoning: 'Totally incoherent',
      conflicts: ['everything'],
      suggestions: [],
    })

    const result = await resolveCoherenceConflict(makeSession(), doc, 'new sprint', 1, 30)

    expect(result.resetToStart).toBe(true)
    expect(result.resolved).toBe(false)
    expect(result.rewriteNeeded).toBe(false) // reset, not rewrite
    expect(result.deletions.length).toBeGreaterThan(0)
  })

  it('sorry is true only when 2+ paragraphs lose sprints', async () => {
    // 1 paragraph with 1 sprint — deleting it should NOT trigger sorry
    const doc = makeDoc([
      makePara(0, [makeSprint(0, true)]),
      makePara(1, []),
    ])

    const { scoreCoherence } = await import('../lib/agents/coherence-scorer')
    vi.mocked(scoreCoherence).mockResolvedValue({
      score: 30,
      reasoning: 'bad',
      conflicts: [],
      suggestions: [],
    })

    const result = await resolveCoherenceConflict(makeSession(), doc, 'text', 1, 30)

    expect(result.resetToStart).toBe(true)
    expect(result.deletedParagraphCount).toBe(1)
    expect(result.sorry).toBe(false) // only 1 paragraph affected
  })

  it('deletions are cumulative — not re-cloned each iteration', async () => {
    // 3 sprints across 2 paragraphs
    const doc = makeDoc([
      makePara(0, [makeSprint(0, true), makeSprint(1, true)], true),
      makePara(1, [makeSprint(0, true)]),
      makePara(2, []),
    ])

    let callIdx = 0
    const { scoreCoherence } = await import('../lib/agents/coherence-scorer')
    vi.mocked(scoreCoherence).mockImplementation(async (_s, tempDoc) => {
      callIdx++
      // Check that previous deletions are visible in tempDoc
      if (callIdx === 1) {
        // After 1st retraction (para 1 sprint 0 removed)
        expect(tempDoc.paragraphs[1].sprints.length).toBe(0)
        return { score: 50, reasoning: 'still low', conflicts: [], suggestions: [] }
      }
      if (callIdx === 2) {
        // After 2nd retraction (para 0 sprint 1 also removed) — cumulative!
        expect(tempDoc.paragraphs[1].sprints.length).toBe(0) // still 0 from first deletion
        expect(tempDoc.paragraphs[0].sprints.length).toBe(1) // only sprint 0 left
        return { score: 80, reasoning: 'now good', conflicts: [], suggestions: [] }
      }
      return { score: 90, reasoning: 'ok', conflicts: [], suggestions: [] }
    })

    const result = await resolveCoherenceConflict(makeSession(), doc, 'text', 2, 40)
    expect(result.retractionCount).toBe(2)
    expect(result.resolved).toBe(true)
  })
})
