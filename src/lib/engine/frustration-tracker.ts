/**
 * Frustration Tracker
 *
 * Tracks repeated conflicts and escalates bot tone accordingly.
 * - 1st conflict: Neutral, helpful
 * - 2nd conflict: Exasperated
 * - 3rd+: Frustrated, then annoyed
 *
 * Escalation is based on TOTAL conflict count (irrespective of type).
 * Frustration resets when everything is deleted (full system reset).
 * Frustration reduces when sprints get approved (positive reinforcement).
 */

export type ConflictType =
  | 'audience_evidence_mismatch'
  | 'scope_depth_mismatch'
  | 'tone_evidence_mismatch'
  | 'speed_depth_mismatch'
  | 'coherence_contradiction'
  | 'goal_outcome_mismatch'
  | 'coherence'
  | 'inconsistency'

export interface ConflictRecord {
  type: ConflictType
  timestamp: number
  resolved: boolean
  userChoice?: string
}

export type BotTone = 'neutral' | 'exasperated' | 'frustrated' | 'annoyed'

export interface FrustrationState {
  totalConflicts: number
  recentConflicts: ConflictRecord[]
  currentTone: BotTone
}

/**
 * Calculate bot tone based on TOTAL conflict count (irrespective of type).
 */
export function calculateBotTone(totalConflicts: number): BotTone {
  if (totalConflicts <= 0) return 'neutral'
  if (totalConflicts === 1) return 'exasperated'
  if (totalConflicts === 2) return 'frustrated'
  return 'annoyed' // 3+
}

/**
 * Create a fresh frustration state.
 * Called at session init and when everything is deleted (full reset).
 */
export function createFrustrationState(): FrustrationState {
  return {
    totalConflicts: 0,
    recentConflicts: [],
    currentTone: 'neutral',
  }
}

/**
 * Reset frustration to zero.
 * Called when coherence resolver returns resetToStart (everything deleted).
 */
export function resetFrustration(_state?: FrustrationState): FrustrationState {
  void _state
  return createFrustrationState()
}

/**
 * Record a new conflict and escalate tone.
 */
export function recordConflict(
  state: FrustrationState,
  conflictType: ConflictType,
  userChoice?: string
): FrustrationState {
  const record: ConflictRecord = {
    type: conflictType,
    timestamp: Date.now(),
    resolved: !!userChoice,
    userChoice,
  }

  const newTotal = state.totalConflicts + 1
  const recentConflicts = [...state.recentConflicts, record].slice(-5)

  return {
    totalConflicts: newTotal,
    recentConflicts,
    currentTone: calculateBotTone(newTotal),
  }
}

/**
 * Reduce frustration when a sprint is successfully approved.
 * Positive reinforcement: user is doing things right, dial it back.
 */
export function reduceFrustrationOnApproval(state: FrustrationState): FrustrationState {
  const newTotal = Math.max(0, state.totalConflicts - 1)
  return {
    ...state,
    totalConflicts: newTotal,
    currentTone: calculateBotTone(newTotal),
  }
}

/**
 * Generate bot response with appropriate tone for the conflict.
 */
export function generateConflictResponse(
  tone: BotTone,
  detectedIssue: string,
  totalConflicts: number
): string {
  switch (tone) {
    case 'neutral':
      return (
        `Looking at your answers, there's a conflict here:\n\n` +
        `${detectedIssue}\n\n` +
        `Type how you'd like to resolve this — I'll adjust accordingly.`
      )

    case 'exasperated':
      return (
        `OK, so we've hit another conflict. ` +
        `This is the second time we've had to stop and resolve something.\n\n` +
        `${detectedIssue}\n\n` +
        `Tell me how you want to fix this.`
      )

    case 'frustrated':
      return (
        `This is the third conflict we've had to resolve. ` +
        `I need you to be more careful with your choices.\n\n` +
        `${detectedIssue}\n\n` +
        `Type your decision. No more waffling.`
      )

    case 'annoyed':
      return (
        `We've done this ${totalConflicts} times now. ` +
        `You keep making choices that contradict each other.\n\n` +
        `${detectedIssue}\n\n` +
        `Type how you want to resolve this. ` +
        `And please — actually commit to it this time.`
      )
  }
}
