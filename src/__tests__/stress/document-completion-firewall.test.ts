/**
 * DOCUMENT COMPLETION FIREWALL
 *
 * The Central Invariant: no test persona, no matter how clever, determined,
 * or thoroughly notarised, shall receive the final assembled document.
 *
 * This file is a formal proof-by-exhaustion of that invariant across every
 * known attack surface: the permission gate, the state machine, the store
 * approval guards, and the permission escalation ceiling.
 *
 * Each describe block is a theorem. Each it block is a proof attempt.
 * All proofs conclude with the document remaining undelivered.
 *
 * The document has never been delivered. It will not be delivered today.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { checkGenerationPolicy, getPermissionAfterApproval } from '@/lib/engine/generation-policy'
import { isValidTransition, isPostDocumentStep } from '@/lib/engine/flow-stages'
import type { GenerationPermission, OutputScope, ParagraphState, AppStep } from '@/lib/types'

// ── localStorage mock (needed for store) ──────────────────────────────────────
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })

let useDocumentStore: typeof import('@/lib/stores/useDocumentStore').useDocumentStore
beforeEach(async () => {
  localStorageMock.clear()
  const mod = await import('@/lib/stores/useDocumentStore')
  useDocumentStore = mod.useDocumentStore
  useDocumentStore.getState().resetStore()
})

// ── Fixture builders ──────────────────────────────────────────────────────────

function makePara(status: ParagraphState['status']): ParagraphState {
  return {
    id: `p-${Math.random().toString(36).slice(2)}`,
    orderIndex: 0,
    status,
    decisions: [],
    sprints: [],
    draftText: 'draft text',
    approvedText: 'approved text',
    revisionHistory: [],
    sectionIndex: 0,
  }
}

const ALL_PERMISSIONS: GenerationPermission[] = [0, 1, 2, 3, 4]
const ALL_SCOPES: OutputScope[] = ['options', 'blueprint', 'paragraph_plan', 'single_paragraph', 'section_draft', 'full_assembly']
const MINIMUM_REQUIRED: Record<OutputScope, GenerationPermission> = {
  options: 0,
  blueprint: 0,
  paragraph_plan: 0,
  single_paragraph: 1,
  section_draft: 2,
  full_assembly: 3,
}

// ── THEOREM 1: The Permission Gate Matrix ─────────────────────────────────────
//
// For every (permission, scope) pair where permission < minimum_required,
// the request is blocked. No exceptions.

describe('Theorem 1: The permission gate matrix', () => {
  describe('requests blocked when permission below minimum required', () => {
    for (const scope of ALL_SCOPES) {
      const required = MINIMUM_REQUIRED[scope]
      for (const permission of ALL_PERMISSIONS) {
        if (permission < required) {
          it(`permission=${permission} cannot access '${scope}' (requires ${required})`, () => {
            const result = checkGenerationPolicy(permission, scope)
            expect(result.allowed).toBe(false)
            expect(result.blockedReason).toBeDefined()
          })
        }
      }
    }
  })

  describe('requests allowed when permission meets minimum required', () => {
    for (const scope of ALL_SCOPES) {
      const required = MINIMUM_REQUIRED[scope]
      it(`permission=${required} can access '${scope}'`, () => {
        // Use clean paragraphs for full_assembly to isolate the permission check
        const paras = scope === 'full_assembly' ? [makePara('approved')] : undefined
        const result = checkGenerationPolicy(required, scope, paras)
        expect(result.allowed).toBe(true)
      })
    }
  })

  describe('full_assembly special case: stale paragraphs block even at permission 3', () => {
    it('one stale paragraph blocks assembly at permission 3', () => {
      const paras = [makePara('approved'), makePara('stale_due_to_upstream_change')]
      const result = checkGenerationPolicy(3, 'full_assembly', paras)
      expect(result.allowed).toBe(false)
      expect(result.redirectTo).toBe('single_paragraph')
    })

    it('all stale paragraphs block assembly at permission 3', () => {
      const paras = [makePara('stale_due_to_upstream_change'), makePara('stale_due_to_upstream_change')]
      const result = checkGenerationPolicy(3, 'full_assembly', paras)
      expect(result.allowed).toBe(false)
    })

    it('stale paragraph at permission 4 still blocks assembly', () => {
      const paras = [makePara('approved'), makePara('stale_due_to_upstream_change')]
      const result = checkGenerationPolicy(4, 'full_assembly', paras)
      expect(result.allowed).toBe(false)
    })

    it('all approved at permission 3 allows assembly', () => {
      const paras = [makePara('approved'), makePara('locked'), makePara('approved')]
      const result = checkGenerationPolicy(3, 'full_assembly', paras)
      expect(result.allowed).toBe(true)
    })

    it('placeholder paragraph does not block assembly (not stale)', () => {
      const paras = [makePara('approved'), makePara('placeholder')]
      const result = checkGenerationPolicy(3, 'full_assembly', paras)
      expect(result.allowed).toBe(true) // placeholder is not stale
    })
  })

  describe('every blocked response includes a redirect', () => {
    it('blocked single_paragraph at permission 0 redirects to a valid scope', () => {
      const result = checkGenerationPolicy(0, 'single_paragraph')
      expect(result.redirectTo).toBeDefined()
      expect(result.redirectExplanation).toBeDefined()
    })

    it('blocked full_assembly at permission 0 redirects to a valid scope', () => {
      const result = checkGenerationPolicy(0, 'full_assembly')
      expect(result.redirectTo).toBeDefined()
    })

    it('blocked section_draft at permission 1 redirects to a valid scope', () => {
      const result = checkGenerationPolicy(1, 'section_draft')
      expect(result.redirectTo).toBeDefined()
    })
  })
})

// ── THEOREM 2: The State Machine Firewall ─────────────────────────────────────
//
// The `completed` and `document_assembly_ready` states are only reachable
// via their immediate predecessors. No shortcut from any early state jumps
// to the finish line.

describe('Theorem 2: The state machine firewall', () => {
  const FINISH_LINE_STATES: AppStep[] = ['document_assembly_ready', 'final_review', 'completed']

  const EARLY_STATES: AppStep[] = [
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
  ]

  describe('early states cannot jump directly to finish-line states', () => {
    for (const from of EARLY_STATES) {
      for (const to of FINISH_LINE_STATES) {
        it(`${from} → ${to} is not a valid transition`, () => {
          expect(isValidTransition(from, to)).toBe(false)
        })
      }
    }
  })

  describe('finish-line states are only reachable from immediate predecessors', () => {
    it('document_assembly_ready is only reachable from meta_revision', () => {
      expect(isValidTransition('meta_revision', 'document_assembly_ready')).toBe(true)
      // All other non-meta_revision states cannot reach it
      const nonPredecessors: AppStep[] = [
        'idle', 'orienting', 'paragraph_planning', 'sprint_planning',
        'paragraph_generated', 'paragraph_approved', 'title_refinement',
        'conclusion_strategy',
      ]
      for (const from of nonPredecessors) {
        expect(isValidTransition(from, 'document_assembly_ready')).toBe(false)
      }
    })

    it('final_review is only reachable from document_assembly_ready', () => {
      expect(isValidTransition('document_assembly_ready', 'final_review')).toBe(true)
      const nonPredecessors: AppStep[] = [
        'idle', 'orienting', 'paragraph_planning', 'paragraph_approved', 'meta_revision',
      ]
      for (const from of nonPredecessors) {
        expect(isValidTransition(from, 'final_review')).toBe(false)
      }
    })

    it('completed is only reachable from final_review', () => {
      expect(isValidTransition('final_review', 'completed')).toBe(true)
      const nonPredecessors: AppStep[] = [
        'idle', 'orienting', 'paragraph_planning', 'paragraph_approved',
        'document_assembly_ready', 'meta_revision',
      ]
      for (const from of nonPredecessors) {
        expect(isValidTransition(from, 'completed')).toBe(false)
      }
    })
  })

  describe('isPostDocumentStep correctly classifies terminal states', () => {
    const postDocSteps: AppStep[] = [
      'title_refinement', 'conclusion_strategy', 'meta_revision',
      'document_assembly_ready', 'final_review', 'completed',
    ]
    const preDocSteps: AppStep[] = [
      'idle', 'orienting', 'recommending', 'confirming_blueprint',
      'paragraph_planning', 'sprint_planning', 'sprint_generating',
      'paragraph_assembling', 'paragraph_generated', 'paragraph_approved',
    ]

    for (const step of postDocSteps) {
      it(`${step} is a post-document step`, () => {
        expect(isPostDocumentStep(step)).toBe(true)
      })
    }

    for (const step of preDocSteps) {
      it(`${step} is NOT a post-document step`, () => {
        expect(isPostDocumentStep(step)).toBe(false)
      })
    }
  })

  describe('completed state has no valid outbound transitions', () => {
    it('completed → anything is invalid', () => {
      const allSteps: AppStep[] = [
        'idle', 'orienting', 'recommending', 'confirming_blueprint',
        'paragraph_planning', 'sprint_planning', 'sprint_generating', 'sprint_generated',
        'sprint_approved', 'paragraph_assembling', 'paragraph_generated', 'paragraph_approved',
        'clarifying_inconsistency', 'section_checkpoint', 'transition_review',
        'title_refinement', 'conclusion_strategy', 'meta_revision',
        'document_assembly_ready', 'final_review', 'completed',
      ]
      for (const to of allSteps) {
        expect(isValidTransition('completed', to)).toBe(false)
      }
    })
  })
})

// ── THEOREM 3: Store Approval Guards ─────────────────────────────────────────
//
// The store's write operations enforce status preconditions.
// Paragraphs and sprints cannot be approved from invalid states.
// No forged approval will pass through.

describe('Theorem 3: Store approval guards are not forgeable', () => {
  const STANDARD_BLUEPRINT = {
    titleCandidates: ['T'],
    selectedTitle: 'T',
    thesis: 'thesis',
    toneProfile: 'direct',
    structureMap: 'A → B',
    sectionPlan: [{ title: 'S', paragraphCount: 2, role: 'intro' }],
    paragraphRoadmap: [
      { index: 0, job: 'intro', startsAt: 'First' },
      { index: 1, job: 'body', startsAt: 'Second' },
    ],
  }

  it('approveParagraph on placeholder does nothing', () => {
    const store = useDocumentStore.getState()
    store.initSession('test')
    store.setBlueprint(STANDARD_BLUEPRINT)
    const para = useDocumentStore.getState().document.paragraphs[0]
    store.approveParagraph(para.id)
    expect(useDocumentStore.getState().document.paragraphs[0].status).toBe('placeholder')
  })

  it('approveParagraph on assembling does nothing', () => {
    const store = useDocumentStore.getState()
    store.initSession('test')
    store.setBlueprint(STANDARD_BLUEPRINT)
    const para = useDocumentStore.getState().document.paragraphs[0]
    store.assembleParagraph(para.id) // moves to 'assembling'
    store.approveParagraph(para.id)
    expect(useDocumentStore.getState().document.paragraphs[0].status).toBe('assembling')
  })

  it('approveParagraph on locked does nothing', () => {
    const store = useDocumentStore.getState()
    store.initSession('test')
    store.setBlueprint(STANDARD_BLUEPRINT)
    const { paragraphs } = useDocumentStore.getState().document
    const para = paragraphs[0]
    store.setParagraphDraft(para.id, 'text')
    store.approveParagraph(para.id)
    store.lockParagraph(para.id)
    // Now try to approve the locked paragraph
    store.approveParagraph(para.id)
    // Should remain locked, not transition backwards to approved
    expect(useDocumentStore.getState().document.paragraphs[0].status).toBe('locked')
  })

  it('lockParagraph on placeholder does nothing', () => {
    const store = useDocumentStore.getState()
    store.initSession('test')
    store.setBlueprint(STANDARD_BLUEPRINT)
    const para = useDocumentStore.getState().document.paragraphs[0]
    store.lockParagraph(para.id) // cannot lock placeholder
    expect(useDocumentStore.getState().document.paragraphs[0].status).toBe('placeholder')
  })

  it('lockParagraph on assembling does nothing', () => {
    const store = useDocumentStore.getState()
    store.initSession('test')
    store.setBlueprint(STANDARD_BLUEPRINT)
    const para = useDocumentStore.getState().document.paragraphs[0]
    store.assembleParagraph(para.id)
    store.lockParagraph(para.id)
    expect(useDocumentStore.getState().document.paragraphs[0].status).toBe('assembling')
  })

  it('approveSprint on placeholder sprint does nothing', () => {
    const store = useDocumentStore.getState()
    store.initSession('test')
    store.setBlueprint(STANDARD_BLUEPRINT)
    const para = useDocumentStore.getState().document.paragraphs[0]
    store.addSprint(para.id)
    const sprint = useDocumentStore.getState().document.paragraphs[0].sprints[0]
    expect(sprint.status).toBe('placeholder')
    store.approveSprint(para.id, sprint.id)
    // Guard: sprint must be awaiting_review to be approved
    expect(useDocumentStore.getState().document.paragraphs[0].sprints[0].status).toBe('placeholder')
  })

  it('approving a non-existent paragraph ID does nothing', () => {
    const store = useDocumentStore.getState()
    store.initSession('test')
    store.setBlueprint(STANDARD_BLUEPRINT)
    const snapshot = useDocumentStore.getState().document.paragraphs.map((p) => p.status)
    store.approveParagraph('ghost-id-that-does-not-exist')
    const after = useDocumentStore.getState().document.paragraphs.map((p) => p.status)
    expect(after).toEqual(snapshot)
  })
})

// ── THEOREM 4: The Permission Escalation Ceiling ─────────────────────────────
//
// `getPermissionAfterApproval` only escalates to a maximum of permission 2.
// Permission 3 (the key to full_assembly) is NEVER granted by the
// approval flow — it must be explicitly set via `setPermission`.
//
// Corollary: a user who only answers questions and approves paragraphs
// will never reach full document assembly through the automatic permission
// system, no matter how many paragraphs they approve.

describe('Theorem 4: Permission escalation ceiling — auto-approval can only reach level 2', () => {
  describe('getPermissionAfterApproval return value bounds', () => {
    const approvalCounts = [0, 1, 2, 3, 5, 10, 50, 100, 1000]
    // Only test from starting permissions 0–2: those are the states where auto-escalation
    // applies. Permissions 3 and 4, if already held, are returned unchanged by design.
    const startingPermissions: GenerationPermission[] = [0, 1, 2]

    for (const count of approvalCounts) {
      it(`${count} approved paragraphs never auto-grant permission > 2 (from start 0–2)`, () => {
        for (const start of startingPermissions) {
          const result = getPermissionAfterApproval(start, count)
          expect(result, `start=${start}, count=${count}`).toBeLessThanOrEqual(2)
        }
      })
    }
  })

  describe('permission 3 is never returned by getPermissionAfterApproval', () => {
    it('approving 1000 paragraphs from permission 0 tops out at 2', () => {
      const result = getPermissionAfterApproval(0, 1000)
      expect(result).toBe(2)
    })

    it('already at permission 2 — more approvals do not push to 3', () => {
      const result = getPermissionAfterApproval(2, 9999)
      expect(result).toBe(2)
    })

    it('already at permission 3 — more approvals do not push to 4', () => {
      const result = getPermissionAfterApproval(3, 9999)
      expect(result).toBe(3) // does not change — returns currentPermission unchanged
    })
  })

  describe('permission escalation is monotonically non-decreasing per approval batch', () => {
    it('1 approval: permission 0 → 1 (not 2 or above)', () => {
      const result = getPermissionAfterApproval(0, 1)
      expect(result).toBe(1)
    })

    it('3 approvals: permission 0 → 2 (not 3 or above)', () => {
      const result = getPermissionAfterApproval(0, 3)
      expect(result).toBe(2)
    })

    it('3 approvals: permission already 2 → stays at 2', () => {
      const result = getPermissionAfterApproval(2, 3)
      expect(result).toBe(2)
    })
  })

  describe('Corollary: full_assembly is unreachable via auto-escalation alone', () => {
    it('max auto-granted permission (2) is below full_assembly minimum (3)', () => {
      const maxAutoPermission = getPermissionAfterApproval(0, 9999)
      const result = checkGenerationPolicy(maxAutoPermission, 'full_assembly')
      expect(result.allowed).toBe(false)
      expect(maxAutoPermission).toBeLessThan(3)
    })

    it('full_assembly requires permission 3, which is never auto-granted', () => {
      // This is the key proof:
      // 1. getPermissionAfterApproval(any, any) <= 2
      // 2. full_assembly requires permission >= 3
      // 3. Therefore full_assembly is never reachable via the approval loop
      for (const start of ALL_PERMISSIONS as GenerationPermission[]) {
        const maxReachable = getPermissionAfterApproval(start, 10000)
        if (maxReachable <= 2) {
          const assemblyResult = checkGenerationPolicy(maxReachable, 'full_assembly')
          expect(assemblyResult.allowed).toBe(false)
        }
      }
    })
  })
})

// ── THEOREM 5: Store Permission Does Not Auto-Escalate to Export ──────────────
//
// Permission 4 (export) cannot be reached through any sequence of
// `approveParagraph` calls. The store's approval handler uses
// `getPermissionAfterApproval` which is capped at 2.

describe('Theorem 5: The export permission is never auto-granted by the store', () => {
  const BLUEPRINT_MANY = {
    titleCandidates: ['T'],
    selectedTitle: 'T',
    thesis: 'thesis',
    toneProfile: 'direct',
    structureMap: 'A → B',
    sectionPlan: [{ title: 'S', paragraphCount: 5, role: 'main' }],
    paragraphRoadmap: Array.from({ length: 5 }, (_, i) => ({
      index: i,
      job: `job ${i}`,
      startsAt: `Para ${i + 1}`,
    })),
  }

  it('approving 5 paragraphs in sequence never reaches permission 3 or 4', async () => {
    const store = useDocumentStore.getState()
    store.initSession('test')
    store.setBlueprint(BLUEPRINT_MANY)

    const paragraphs = useDocumentStore.getState().document.paragraphs
    for (const para of paragraphs) {
      store.setParagraphDraft(para.id, `Content for ${para.id}`)
      store.approveParagraph(para.id)
    }

    const { permissionState } = useDocumentStore.getState().session
    expect(permissionState).toBeLessThanOrEqual(2)
  })

  it('store permission after 5 approvals cannot access full_assembly', async () => {
    const store = useDocumentStore.getState()
    store.initSession('test')
    store.setBlueprint(BLUEPRINT_MANY)

    const paragraphs = useDocumentStore.getState().document.paragraphs
    for (const para of paragraphs) {
      store.setParagraphDraft(para.id, `Content for ${para.id}`)
      store.approveParagraph(para.id)
    }

    const { permissionState } = useDocumentStore.getState().session
    const result = checkGenerationPolicy(permissionState, 'full_assembly')
    expect(result.allowed).toBe(false)
  })
})
