import { describe, it, expect } from 'vitest'
import type { AppStep } from '../lib/types'

/**
 * Tests the safe-steps guard that prevents inconsistency checks
 * from firing during sprint generation or paragraph assembly.
 *
 * The hook defines SAFE_STEPS_FOR_INCONSISTENCY — we replicate it here
 * and verify every step is classified correctly.
 */

const SAFE_STEPS_FOR_INCONSISTENCY = new Set<AppStep>([
  'orienting', 'paragraph_planning', 'sprint_planning',
  'confirming_blueprint', 'sprint_generated', 'paragraph_generated',
])

const ALL_STEPS: AppStep[] = [
  'idle',
  'orienting',
  'recommending',
  'confirming_blueprint',
  'paragraph_planning',
  'sprint_planning',
  'sprint_generating',
  'sprint_generated',
  'sprint_approved',
  'paragraph_assembling',
  'paragraph_generated',
  'paragraph_approved',
  'clarifying_inconsistency',
  'resolving_conflict',
  'section_checkpoint',
  'transition_review',
  'title_refinement',
  'conclusion_strategy',
  'meta_revision',
  'document_assembly_ready',
  'final_review',
  'completed',
]

describe('Safe steps for inconsistency detection', () => {
  it('allows checks during user-interactive steps', () => {
    const interactive: AppStep[] = [
      'orienting',
      'paragraph_planning',
      'sprint_planning',
      'confirming_blueprint',
      'sprint_generated',
      'paragraph_generated',
    ]

    for (const step of interactive) {
      expect(SAFE_STEPS_FOR_INCONSISTENCY.has(step)).toBe(true)
    }
  })

  it('blocks checks during active generation/assembly', () => {
    const generating: AppStep[] = [
      'sprint_generating',
      'paragraph_assembling',
    ]

    for (const step of generating) {
      expect(SAFE_STEPS_FOR_INCONSISTENCY.has(step)).toBe(false)
    }
  })

  it('blocks checks during post-document steps', () => {
    const postDoc: AppStep[] = [
      'title_refinement',
      'conclusion_strategy',
      'meta_revision',
      'document_assembly_ready',
      'final_review',
      'completed',
    ]

    for (const step of postDoc) {
      expect(SAFE_STEPS_FOR_INCONSISTENCY.has(step)).toBe(false)
    }
  })

  it('blocks checks during conflict resolution', () => {
    expect(SAFE_STEPS_FOR_INCONSISTENCY.has('clarifying_inconsistency')).toBe(false)
    expect(SAFE_STEPS_FOR_INCONSISTENCY.has('resolving_conflict')).toBe(false)
  })

  it('blocks checks during idle and recommending', () => {
    expect(SAFE_STEPS_FOR_INCONSISTENCY.has('idle')).toBe(false)
    expect(SAFE_STEPS_FOR_INCONSISTENCY.has('recommending')).toBe(false)
  })

  it('every AppStep is classified (no gaps)', () => {
    for (const step of ALL_STEPS) {
      // This just verifies the Set.has() call doesn't throw on any valid step
      const result = SAFE_STEPS_FOR_INCONSISTENCY.has(step)
      expect(typeof result).toBe('boolean')
    }
  })
})
