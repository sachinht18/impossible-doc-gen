import { describe, it, expect } from 'vitest'
import { checkGenerationPolicy } from '../lib/engine/generation-policy'
import type { ParagraphState } from '../lib/types'

function makeParagraph(status: ParagraphState['status']): ParagraphState {
  return {
    id: 'p1',
    orderIndex: 0,
    status,
    decisions: [],
    sprints: [],
    draftText: 'draft',
    approvedText: 'approved',
    revisionHistory: [],
    sectionIndex: 0,
  }
}

describe('checkGenerationPolicy', () => {
  describe('State 0 (discovery)', () => {
    it('allows options generation', () => {
      const result = checkGenerationPolicy(0, 'options')
      expect(result.allowed).toBe(true)
    })

    it('allows blueprint generation', () => {
      const result = checkGenerationPolicy(0, 'blueprint')
      expect(result.allowed).toBe(true)
    })

    it('blocks single_paragraph generation', () => {
      const result = checkGenerationPolicy(0, 'single_paragraph')
      expect(result.allowed).toBe(false)
      expect(result.blockedReason).toBeDefined()
    })

    it('blocks full_assembly', () => {
      const result = checkGenerationPolicy(0, 'full_assembly')
      expect(result.allowed).toBe(false)
    })

    it('blocked request returns redirect to nearest valid action', () => {
      const result = checkGenerationPolicy(0, 'single_paragraph')
      expect(result.redirectTo).toBeDefined()
      expect(result.redirectExplanation).toBeDefined()
    })
  })

  describe('State 1 (unit_draft)', () => {
    it('allows single_paragraph', () => {
      const result = checkGenerationPolicy(1, 'single_paragraph')
      expect(result.allowed).toBe(true)
    })

    it('blocks section_draft', () => {
      const result = checkGenerationPolicy(1, 'section_draft')
      expect(result.allowed).toBe(false)
    })

    it('blocks full_assembly', () => {
      const result = checkGenerationPolicy(1, 'full_assembly')
      expect(result.allowed).toBe(false)
    })
  })

  describe('State 3 (assembly)', () => {
    it('allows full_assembly when no stale paragraphs', () => {
      const paragraphs = [makeParagraph('approved'), makeParagraph('locked')]
      const result = checkGenerationPolicy(3, 'full_assembly', paragraphs)
      expect(result.allowed).toBe(true)
    })

    it('blocks full_assembly when stale paragraphs exist', () => {
      const paragraphs = [
        makeParagraph('approved'),
        makeParagraph('stale_due_to_upstream_change'),
      ]
      const result = checkGenerationPolicy(3, 'full_assembly', paragraphs)
      expect(result.allowed).toBe(false)
      expect(result.redirectTo).toBe('single_paragraph')
    })
  })
})
