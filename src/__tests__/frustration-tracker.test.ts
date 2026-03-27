import { describe, it, expect } from 'vitest'
import {
  calculateBotTone,
  createFrustrationState,
  recordConflict,
  reduceFrustrationOnApproval,
  resetFrustration,
  generateConflictResponse,
} from '../lib/engine/frustration-tracker'

describe('Frustration Tracker', () => {
  // ── Tone progression ────────────────────────────────────────────────────
  describe('calculateBotTone', () => {
    it('0 conflicts → neutral', () => {
      expect(calculateBotTone(0)).toBe('neutral')
    })

    it('1 conflict → exasperated', () => {
      expect(calculateBotTone(1)).toBe('exasperated')
    })

    it('2 conflicts → frustrated', () => {
      expect(calculateBotTone(2)).toBe('frustrated')
    })

    it('3 conflicts → annoyed', () => {
      expect(calculateBotTone(3)).toBe('annoyed')
    })

    it('10 conflicts → still annoyed (caps at annoyed)', () => {
      expect(calculateBotTone(10)).toBe('annoyed')
    })

    it('negative conflicts → neutral', () => {
      expect(calculateBotTone(-5)).toBe('neutral')
    })
  })

  // ── State creation ──────────────────────────────────────────────────────
  describe('createFrustrationState', () => {
    it('starts at zero with neutral tone', () => {
      const state = createFrustrationState()
      expect(state.totalConflicts).toBe(0)
      expect(state.recentConflicts).toEqual([])
      expect(state.currentTone).toBe('neutral')
    })
  })

  // ── Recording conflicts ─────────────────────────────────────────────────
  describe('recordConflict', () => {
    it('increments totalConflicts and escalates tone', () => {
      let state = createFrustrationState()

      state = recordConflict(state, 'coherence')
      expect(state.totalConflicts).toBe(1)
      expect(state.currentTone).toBe('exasperated')

      state = recordConflict(state, 'inconsistency')
      expect(state.totalConflicts).toBe(2)
      expect(state.currentTone).toBe('frustrated')

      state = recordConflict(state, 'coherence')
      expect(state.totalConflicts).toBe(3)
      expect(state.currentTone).toBe('annoyed')
    })

    it('tracks conflict type irrespective of type for escalation', () => {
      let state = createFrustrationState()
      // Mix different conflict types — all should escalate the same
      state = recordConflict(state, 'audience_evidence_mismatch')
      state = recordConflict(state, 'coherence')
      state = recordConflict(state, 'scope_depth_mismatch')

      expect(state.totalConflicts).toBe(3)
      expect(state.currentTone).toBe('annoyed')
    })

    it('keeps only last 5 conflicts in recentConflicts', () => {
      let state = createFrustrationState()
      for (let i = 0; i < 8; i++) {
        state = recordConflict(state, 'coherence')
      }
      expect(state.recentConflicts.length).toBe(5)
      expect(state.totalConflicts).toBe(8)
    })

    it('records userChoice when provided', () => {
      let state = createFrustrationState()
      state = recordConflict(state, 'coherence', 'keep the new direction')
      expect(state.recentConflicts[0].resolved).toBe(true)
      expect(state.recentConflicts[0].userChoice).toBe('keep the new direction')
    })
  })

  // ── Reduction on approval ───────────────────────────────────────────────
  describe('reduceFrustrationOnApproval', () => {
    it('reduces totalConflicts by 1 and de-escalates tone', () => {
      let state = createFrustrationState()
      state = recordConflict(state, 'coherence') // 1 → exasperated
      state = recordConflict(state, 'coherence') // 2 → frustrated

      state = reduceFrustrationOnApproval(state)
      expect(state.totalConflicts).toBe(1)
      expect(state.currentTone).toBe('exasperated')

      state = reduceFrustrationOnApproval(state)
      expect(state.totalConflicts).toBe(0)
      expect(state.currentTone).toBe('neutral')
    })

    it('never goes below 0', () => {
      let state = createFrustrationState()
      state = reduceFrustrationOnApproval(state) // already 0
      expect(state.totalConflicts).toBe(0)
      expect(state.currentTone).toBe('neutral')
    })
  })

  // ── Reset ───────────────────────────────────────────────────────────────
  describe('resetFrustration', () => {
    it('resets everything to zero/neutral', () => {
      let state = createFrustrationState()
      state = recordConflict(state, 'coherence')
      state = recordConflict(state, 'coherence')
      state = recordConflict(state, 'coherence')
      expect(state.currentTone).toBe('annoyed')

      state = resetFrustration(state)
      expect(state.totalConflicts).toBe(0)
      expect(state.recentConflicts).toEqual([])
      expect(state.currentTone).toBe('neutral')
    })
  })

  // ── Conflict response generation ────────────────────────────────────────
  describe('generateConflictResponse', () => {
    const issue = 'Score 40/100 — conflicts with PoV.'

    it('neutral tone is calm and helpful', () => {
      const msg = generateConflictResponse('neutral', issue, 0)
      expect(msg).toContain('conflict')
      expect(msg).toContain(issue)
      expect(msg).not.toContain('commit to it')
    })

    it('exasperated tone references second conflict', () => {
      const msg = generateConflictResponse('exasperated', issue, 2)
      expect(msg).toContain('another conflict')
      expect(msg).toContain('second time')
    })

    it('frustrated tone tells user to be more careful', () => {
      const msg = generateConflictResponse('frustrated', issue, 3)
      expect(msg).toContain('third conflict')
      expect(msg).toContain('more careful')
    })

    it('annoyed tone includes conflict count and tells user to commit', () => {
      const msg = generateConflictResponse('annoyed', issue, 5)
      expect(msg).toContain('5 times')
      expect(msg).toContain('commit to it')
    })
  })

  // ── Integration: tone-before-record pattern ─────────────────────────────
  describe('tone-before-record pattern (Fix #14)', () => {
    it('first conflict should generate NEUTRAL response when recorded correctly', () => {
      const state = createFrustrationState()
      // The hook generates the response BEFORE recording the conflict
      const tone = state.currentTone // neutral
      const msg = generateConflictResponse(tone, 'test issue', state.totalConflicts)

      expect(tone).toBe('neutral')
      expect(msg).toContain('conflict here')
      expect(msg).not.toContain('another')

      // THEN record
      const newState = recordConflict(state, 'coherence')
      expect(newState.currentTone).toBe('exasperated') // escalated for NEXT time
    })

    it('second conflict generates EXASPERATED response', () => {
      let state = createFrustrationState()
      state = recordConflict(state, 'coherence') // now at 1 = exasperated

      // Generate before recording second
      const msg = generateConflictResponse(state.currentTone, 'issue', state.totalConflicts)
      expect(msg).toContain('another conflict')

      state = recordConflict(state, 'coherence') // now at 2 = frustrated for next
      expect(state.currentTone).toBe('frustrated')
    })
  })
})
