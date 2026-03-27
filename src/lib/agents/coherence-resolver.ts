/**
 * Coherence Resolver
 *
 * Handles the auto-retraction and rewriting logic when a new sprint
 * doesn't meet the coherence threshold.
 *
 * Flow:
 * 1. New sprint scores < 70 (and para >= 2)
 * 2. Delete the newest approved sprint from previous paragraphs
 * 3. Re-score the new sprint against remaining content
 * 4. Repeat until either:
 *    a. Score >= 70 (accept new sprint)
 *    b. No more sprints to delete -> RESET TO START (treat as Para 1 Sprint 1)
 *
 * When everything is deleted, the whole system resets.
 * If 2+ paragraphs lose content, show a "sorry" message to the user.
 *
 * Deletions are CUMULATIVE within the loop and the exact (paragraphIndex, sprintIndex)
 * pairs are returned so the caller can materialize them precisely.
 */

import type { DocumentState } from '@/lib/types'
import { scoreCoherence } from './coherence-scorer'
import type { WritingSession } from '@/lib/types'

export interface SprintDeletion {
  paragraphIndex: number
  sprintIndex: number
}

export interface ResolutionResult {
  resolved: boolean
  finalScore: number
  retractionCount: number
  rewriteNeeded: boolean
  /** When true, all prior content is gone — reset to Para 1 Sprint 1 */
  resetToStart: boolean
  /** When true, 2+ paragraphs lost sprints — show sorry popup */
  sorry: boolean
  /** How many unique paragraphs had sprints deleted */
  deletedParagraphCount: number
  /** Details of which paragraphs were affected */
  deletedParagraphIndices: number[]
  /** Exact sprint deletions the resolver simulated — caller must apply these */
  deletions: SprintDeletion[]
  reason: string
}

/**
 * Attempt to resolve a coherence conflict by retracting sprints backward.
 *
 * Returns whether the new sprint was accepted, how many sprints were retracted,
 * and whether the system needs to reset to start.
 *
 * When all prior content is deleted:
 *  - resetToStart = true
 *  - The new sprint becomes Para 1 Sprint 1 (no coherence checks)
 *  - Frustration level should be reset by the caller
 */
export async function resolveCoherenceConflict(
  session: WritingSession,
  document: DocumentState,
  newSprintText: string,
  paragraphIndex: number,
  initialScore: number
): Promise<ResolutionResult> {
  const baseResult = {
    resetToStart: false,
    sorry: false,
    deletedParagraphCount: 0,
    deletedParagraphIndices: [] as number[],
    deletions: [] as SprintDeletion[],
  }

  // Para 1: never retract
  if (paragraphIndex === 0) {
    return {
      ...baseResult,
      resolved: true,
      finalScore: initialScore,
      retractionCount: 0,
      rewriteNeeded: false,
      reason: 'Paragraph 1 has no coherence threshold.',
    }
  }

  // Para 2+: attempt retraction if below 70
  if (initialScore >= 70) {
    return {
      ...baseResult,
      resolved: true,
      finalScore: initialScore,
      retractionCount: 0,
      rewriteNeeded: false,
      reason: `Score ${initialScore} meets threshold.`,
    }
  }

  let currentScore = initialScore
  let retractionCount = 0
  const maxRetractions = 10 // safety limit
  const deletedParagraphs = new Set<number>()
  const deletions: SprintDeletion[] = []

  // Clone ONCE — all deletions accumulate on this copy
  const workingDocument = JSON.parse(JSON.stringify(document)) as DocumentState

  while (currentScore < 70 && retractionCount < maxRetractions) {
    // Find the newest approved sprint across all previous paragraphs
    let newestSprintPara = -1
    let newestSprintIdx = -1

    for (let i = paragraphIndex - 1; i >= 0; i--) {
      const para = workingDocument.paragraphs[i]
      if (para && para.sprints.length > 0) {
        for (let s = para.sprints.length - 1; s >= 0; s--) {
          if (para.sprints[s].approvedText) {
            newestSprintPara = i
            newestSprintIdx = s
            break
          }
        }
        if (newestSprintPara >= 0) break
      }
    }

    // No more sprints to retract — ALL prior content is gone
    if (newestSprintPara < 0) {
      const deletedIndices = Array.from(deletedParagraphs).sort()
      const deletedCount = deletedIndices.length

      console.log(
        `[Coherence] All prior content deleted (${deletedCount} paragraphs). ` +
          `Resetting to Para 1 Sprint 1.`
      )

      return {
        resolved: false,
        finalScore: currentScore,
        retractionCount,
        rewriteNeeded: false, // No rewrite — full reset instead
        resetToStart: true,
        sorry: deletedCount >= 2,
        deletedParagraphCount: deletedCount,
        deletedParagraphIndices: deletedIndices,
        deletions,
        reason:
          deletedCount >= 2
            ? `All content from ${deletedCount} paragraphs was removed. Starting fresh. We're sorry about that — the new direction couldn't coexist with what you'd built.`
            : `All prior sprints removed. Starting fresh as Para 1.`,
      }
    }

    // Record the exact deletion BEFORE splicing, using original document indices
    // We need to map back: the workingDocument sprint at newestSprintIdx
    // corresponds to the same original sprint because we splice by index
    // and track which ones we've already removed.
    deletions.push({ paragraphIndex: newestSprintPara, sprintIndex: newestSprintIdx })
    deletedParagraphs.add(newestSprintPara)

    // Splice from the working copy (cumulative)
    workingDocument.paragraphs[newestSprintPara]?.sprints.splice(newestSprintIdx, 1)

    // Also clear paragraph approvedText if all sprints removed
    const remainingSprints = workingDocument.paragraphs[newestSprintPara]?.sprints ?? []
    if (remainingSprints.length === 0) {
      const wp = workingDocument.paragraphs[newestSprintPara]
      if (wp) {
        wp.approvedText = ''
        wp.status = 'placeholder'
      }
    }

    // Re-score against the CUMULATIVE working document
    const newScore = await scoreCoherence(session, workingDocument, newSprintText, paragraphIndex)
    currentScore = newScore.score
    retractionCount++

    console.log(
      `[Coherence] Retracted sprint from para ${newestSprintPara}. ` +
        `New score: ${currentScore}/100`
    )
  }

  const deletedIndices = Array.from(deletedParagraphs).sort()

  if (currentScore >= 70) {
    return {
      resolved: true,
      finalScore: currentScore,
      retractionCount,
      rewriteNeeded: false,
      resetToStart: false,
      sorry: deletedParagraphs.size >= 2,
      deletedParagraphCount: deletedParagraphs.size,
      deletedParagraphIndices: deletedIndices,
      deletions,
      reason: `Reached ${currentScore} after retracting ${retractionCount} sprint(s) from ${deletedParagraphs.size} paragraph(s).`,
    }
  }

  // Hit retraction limit without reaching 70
  return {
    resolved: false,
    finalScore: currentScore,
    retractionCount: maxRetractions,
    rewriteNeeded: true,
    resetToStart: false,
    sorry: deletedParagraphs.size >= 2,
    deletedParagraphCount: deletedParagraphs.size,
    deletedParagraphIndices: deletedIndices,
    deletions,
    reason: `Hit retraction limit. Rewrite needed.`,
  }
}
