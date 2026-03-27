import type { GenerationPermission, OutputScope, ParagraphState } from '../types'

/**
 * Maps (currentPermissionState, requestedOutputScope) → allowed | blocked.
 * Blocked requests get a redirect to the nearest valid action.
 */

interface PolicyResult {
  allowed: boolean
  blockedReason?: string
  redirectTo?: OutputScope
  redirectExplanation?: string
}

const SCOPE_REQUIREMENTS: Record<OutputScope, GenerationPermission> = {
  options: 0,
  blueprint: 0,
  paragraph_plan: 0,
  single_paragraph: 1,
  section_draft: 2,
  full_assembly: 3,
}

export function checkGenerationPolicy(
  permission: GenerationPermission,
  requestedScope: OutputScope,
  paragraphs?: ParagraphState[]
): PolicyResult {
  const required = SCOPE_REQUIREMENTS[requestedScope]

  // Special case: assembly requires no stale paragraphs
  if (requestedScope === 'full_assembly' && permission >= 3) {
    const hasStale = paragraphs?.some((p) => p.status === 'stale_due_to_upstream_change') ?? false
    if (hasStale) {
      return {
        allowed: false,
        blockedReason: 'Some paragraphs are stale due to upstream decision changes. Regenerate them before assembling.',
        redirectTo: 'single_paragraph',
        redirectExplanation: 'Regenerate the stale paragraph first, then assembly will be available.',
      }
    }
  }

  if (permission >= required) {
    return { allowed: true }
  }

  // Find nearest valid scope given current permission
  const validScopes = (Object.keys(SCOPE_REQUIREMENTS) as OutputScope[]).filter(
    (s) => SCOPE_REQUIREMENTS[s] <= permission
  )
  const redirect = validScopes[validScopes.length - 1] ?? 'options'

  return {
    allowed: false,
    blockedReason: `Generating '${requestedScope}' requires permission level ${required}, but current level is ${permission}.`,
    redirectTo: redirect,
    redirectExplanation: `You can currently generate: ${redirect}. Answer more questions to unlock higher scopes.`,
  }
}

export function getPermissionAfterApproval(
  currentPermission: GenerationPermission,
  approvedParagraphCount: number
): GenerationPermission {
  if (approvedParagraphCount >= 3 && currentPermission < 2) return 2
  if (approvedParagraphCount >= 1 && currentPermission < 1) return 1
  return currentPermission
}
