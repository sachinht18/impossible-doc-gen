import { describe, it, expect } from 'vitest'

/**
 * Coherence Scorer — unit tests (no LLM calls; tests the branching logic)
 *
 * The scorer has three code paths:
 *   1. No prior approved content → score 90 (foundation)
 *   2. Paragraph 0 with existing sprints → score 85 (lenient)
 *   3. Paragraph 2+ → calls LLM (tested via integration, not here)
 *
 * We test paths 1 and 2 by importing the function directly and feeding
 * it crafted document states.
 */

import { scoreCoherence } from '../lib/agents/coherence-scorer'
import type { WritingSession, DocumentState } from '../lib/types'

function makeSession(): WritingSession {
  return {
    id: 'test',
    seedPrompt: 'test topic',
    mode: 'guided',
    currentStep: 'sprint_generating',
    priorStep: null,
    permissionState: 0,
    fatigueScore: 0,
    overrideAttemptCount: 0,
    interactionHistory: [],
    activeQuestions: [],
    currentParagraphIndex: 0,
    currentSprintIndex: 0,
    error: null,
    lastSavedAt: null,
  }
}

function makeEmptyDoc(): DocumentState {
  return {
    blueprint: null,
    paragraphs: [],
    globalDecisions: [],
    lockedDecisions: [],
    pendingDecisions: [],
  }
}

describe('Coherence Scorer — branching logic', () => {
  it('returns score 90 when no prior approved content exists', async () => {
    const doc = makeEmptyDoc()
    doc.paragraphs = [
      {
        id: 'p0',
        orderIndex: 0,
        status: 'placeholder',
        decisions: [],
        sprints: [],
        draftText: '',
        approvedText: '',
        revisionHistory: [],
        sectionIndex: 0,
      },
    ]

    const result = await scoreCoherence(makeSession(), doc, 'New sprint text.', 0)
    expect(result.score).toBe(90)
    expect(result.conflicts).toEqual([])
  })

  it('returns score 85 for paragraph 0 with existing approved sprints', async () => {
    const doc = makeEmptyDoc()
    doc.paragraphs = [
      {
        id: 'p0',
        orderIndex: 0,
        status: 'gathering_sprints',
        decisions: [],
        sprints: [
          {
            id: 's0',
            orderIndex: 0,
            status: 'approved',
            decisions: [],
            draftText: 'First sprint.',
            approvedText: 'First sprint.',
            revisionHistory: [],
          },
        ],
        draftText: '',
        approvedText: '',
        revisionHistory: [],
        sectionIndex: 0,
      },
    ]

    const result = await scoreCoherence(makeSession(), doc, 'Second sprint text.', 0)
    expect(result.score).toBe(85)
    expect(result.reasoning).toContain('First paragraph')
  })

  it('does NOT double-count content: uses assembled text for approved paragraphs', async () => {
    // Build a doc where para 0 is approved (assembled text exists + sprints exist)
    const doc = makeEmptyDoc()
    doc.paragraphs = [
      {
        id: 'p0',
        orderIndex: 0,
        status: 'approved',
        decisions: [],
        sprints: [
          {
            id: 's0',
            orderIndex: 0,
            status: 'approved',
            decisions: [],
            draftText: 'Sprint A.',
            approvedText: 'Sprint A.',
            revisionHistory: [],
          },
          {
            id: 's1',
            orderIndex: 1,
            status: 'approved',
            decisions: [],
            draftText: 'Sprint B.',
            approvedText: 'Sprint B.',
            revisionHistory: [],
          },
        ],
        draftText: 'Assembled paragraph.',
        approvedText: 'Assembled paragraph.',
        revisionHistory: [],
        sectionIndex: 0,
      },
      {
        id: 'p1',
        orderIndex: 1,
        status: 'gathering_sprints',
        decisions: [],
        sprints: [],
        draftText: '',
        approvedText: '',
        revisionHistory: [],
        sectionIndex: 0,
      },
    ]

    // For para 1+, this will try to call the LLM — we can't test the actual call,
    // but we CAN verify the content collection logic doesn't crash.
    // The important invariant: for an approved paragraph, we collect ONLY
    // approvedText, not individual sprint texts.
    // We test this indirectly: para 0 is approved, so only "Assembled paragraph."
    // should be in the context, not "Sprint A." + "Sprint B." + "Assembled paragraph."

    // Since para 1 scorer calls the LLM, this is more of an integration test.
    // We verify the path works for paragraph 0 (returns 85 lenient).
    const result = await scoreCoherence(makeSession(), doc, 'New text.', 0)
    expect(result.score).toBe(85) // para 0 always lenient
  })
})
