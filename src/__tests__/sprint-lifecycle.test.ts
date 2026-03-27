import { describe, it, expect, beforeEach } from 'vitest'

/**
 * Sprint lifecycle tests — verifying the full flow:
 *   generation → approval → assembly → paragraph approval
 * Also tests edge cases in the store that the hook depends on.
 */

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

let useDocumentStore: typeof import('../lib/stores/useDocumentStore').useDocumentStore

const BLUEPRINT = {
  titleCandidates: ['T'],
  selectedTitle: 'T',
  thesis: 'thesis',
  toneProfile: 'direct',
  structureMap: 'A → B → C',
  sectionPlan: [{ title: 'S1', paragraphCount: 3, role: 'intro' }],
  paragraphRoadmap: [
    { index: 0, job: 'intro', startsAt: 'First' },
    { index: 1, job: 'body', startsAt: 'Second' },
    { index: 2, job: 'close', startsAt: 'Third' },
  ],
}

beforeEach(async () => {
  localStorageMock.clear()
  const mod = await import('../lib/stores/useDocumentStore')
  useDocumentStore = mod.useDocumentStore
  useDocumentStore.getState().resetStore()
})

describe('Sprint lifecycle', () => {
  it('full flow: add sprint → draft → approve → next sprint → approve → assemble paragraph', () => {
    const store = useDocumentStore.getState()
    store.initSession('test topic')
    store.setBlueprint(BLUEPRINT)

    const para = useDocumentStore.getState().document.paragraphs[0]

    // Sprint 0
    store.addSprint(para.id)
    const s0 = useDocumentStore.getState().document.paragraphs[0].sprints[0]
    expect(s0.status).toBe('placeholder')

    store.setSprintDraft(para.id, s0.id, 'First sprint text.')
    expect(useDocumentStore.getState().document.paragraphs[0].sprints[0].status).toBe('awaiting_review')

    store.approveSprint(para.id, s0.id)
    expect(useDocumentStore.getState().document.paragraphs[0].sprints[0].status).toBe('approved')
    expect(useDocumentStore.getState().document.paragraphs[0].sprints[0].approvedText).toBe('First sprint text.')
    expect(useDocumentStore.getState().session.currentSprintIndex).toBe(1)

    // Sprint 1
    store.addSprint(para.id)
    const s1 = useDocumentStore.getState().document.paragraphs[0].sprints[1]
    store.setSprintDraft(para.id, s1.id, 'Second sprint text.')
    store.approveSprint(para.id, s1.id)
    expect(useDocumentStore.getState().session.currentSprintIndex).toBe(2)

    // Assemble paragraph
    store.setParagraphDraft(para.id, 'First sprint text. Second sprint text.')
    expect(useDocumentStore.getState().document.paragraphs[0].status).toBe('awaiting_review')

    // Approve paragraph
    store.approveParagraph(para.id)
    expect(useDocumentStore.getState().document.paragraphs[0].status).toBe('approved')
    expect(useDocumentStore.getState().document.paragraphs[0].approvedText).toBe('First sprint text. Second sprint text.')
    // Index should advance
    expect(useDocumentStore.getState().session.currentParagraphIndex).toBe(1)
    // Sprint index should reset
    expect(useDocumentStore.getState().session.currentSprintIndex).toBe(0)
  })

  it('sprint approval preserves other sprints in the paragraph', () => {
    const store = useDocumentStore.getState()
    store.initSession('test')
    store.setBlueprint(BLUEPRINT)

    const para = useDocumentStore.getState().document.paragraphs[0]

    // Add 2 sprints
    store.addSprint(para.id)
    store.addSprint(para.id)

    const sprints = useDocumentStore.getState().document.paragraphs[0].sprints
    store.setSprintDraft(para.id, sprints[0].id, 'Sprint A.')
    store.approveSprint(para.id, sprints[0].id)

    // Sprint 1 should still be placeholder
    const updated = useDocumentStore.getState().document.paragraphs[0].sprints
    expect(updated[0].status).toBe('approved')
    expect(updated[1].status).toBe('placeholder')
  })

  it('retractSprints after approval removes the correct sprint', () => {
    const store = useDocumentStore.getState()
    store.initSession('test')
    store.setBlueprint(BLUEPRINT)

    const para = useDocumentStore.getState().document.paragraphs[0]

    // Add and approve 2 sprints
    store.addSprint(para.id)
    const s0 = useDocumentStore.getState().document.paragraphs[0].sprints[0]
    store.setSprintDraft(para.id, s0.id, 'Sprint 0.')
    store.approveSprint(para.id, s0.id)

    store.addSprint(para.id)
    const s1 = useDocumentStore.getState().document.paragraphs[0].sprints[1]
    store.setSprintDraft(para.id, s1.id, 'Sprint 1.')
    store.approveSprint(para.id, s1.id)

    // Retract sprint 1 (the newer one)
    store.retractSprints([{ paragraphIndex: 0, sprintIndex: 1 }])

    const sprints = useDocumentStore.getState().document.paragraphs[0].sprints
    expect(sprints.length).toBe(1)
    expect(sprints[0].approvedText).toBe('Sprint 0.') // sprint 0 survives
  })

  it('full retraction of all sprints resets paragraph to placeholder', () => {
    const store = useDocumentStore.getState()
    store.initSession('test')
    store.setBlueprint(BLUEPRINT)

    const para = useDocumentStore.getState().document.paragraphs[0]
    store.addSprint(para.id)
    const s0 = useDocumentStore.getState().document.paragraphs[0].sprints[0]
    store.setSprintDraft(para.id, s0.id, 'Only sprint.')
    store.approveSprint(para.id, s0.id)
    store.setParagraphStatus(para.id, 'gathering_sprints')

    // Retract everything
    store.retractSprints([{ paragraphIndex: 0, sprintIndex: 0 }])

    const updated = useDocumentStore.getState().document.paragraphs[0]
    expect(updated.sprints.length).toBe(0)
    expect(updated.status).toBe('placeholder')
    expect(updated.draftText).toBe('')
    expect(updated.approvedText).toBe('')
  })
})

describe('Permission progression through paragraph approval', () => {
  it('permission increases as paragraphs are approved (caps at 2)', () => {
    const store = useDocumentStore.getState()
    store.initSession('test')
    store.setBlueprint(BLUEPRINT)

    expect(useDocumentStore.getState().session.permissionState).toBe(0)

    // Approve paragraph 0
    const p0 = useDocumentStore.getState().document.paragraphs[0]
    store.setParagraphDraft(p0.id, 'Para 0 text.')
    store.approveParagraph(p0.id)
    expect(useDocumentStore.getState().session.permissionState).toBe(1)

    // Approve paragraph 1
    const p1 = useDocumentStore.getState().document.paragraphs[1]
    store.setParagraphDraft(p1.id, 'Para 1 text.')
    store.approveParagraph(p1.id)
    // Permission should be 1 or 2 depending on the policy
    const perm = useDocumentStore.getState().session.permissionState
    expect(perm).toBeLessThanOrEqual(2)

    // Approve paragraph 2
    const p2 = useDocumentStore.getState().document.paragraphs[2]
    store.setParagraphDraft(p2.id, 'Para 2 text.')
    store.approveParagraph(p2.id)
    // Permission should cap at 2 — level 3/4 are unreachable (parody)
    expect(useDocumentStore.getState().session.permissionState).toBeLessThanOrEqual(2)
  })
})

describe('handleContextSubmit index logic (simulated)', () => {
  /**
   * Fix #6: paragraph_generated hasn't incremented the index yet,
   * paragraph_approved HAS (via approveParagraph).
   *
   * We simulate the store state and verify the correct index is computed.
   */

  it('paragraph_generated: currentParagraphIndex points to current paragraph', () => {
    const store = useDocumentStore.getState()
    store.initSession('test')
    store.setBlueprint(BLUEPRINT)

    // We're writing paragraph 0, step is paragraph_generated
    store.setStep('paragraph_generated')
    const { session } = useDocumentStore.getState()

    // For paragraph_generated, index should be used directly (NOT -1)
    const idx = session.currentParagraphIndex // 0
    expect(idx).toBe(0)
    expect(useDocumentStore.getState().document.paragraphs[idx]).toBeDefined()
  })

  it('paragraph_approved: currentParagraphIndex was incremented, so -1 is correct', () => {
    const store = useDocumentStore.getState()
    store.initSession('test')
    store.setBlueprint(BLUEPRINT)

    // Approve paragraph 0 — this increments currentParagraphIndex to 1
    const p0 = useDocumentStore.getState().document.paragraphs[0]
    store.setParagraphDraft(p0.id, 'text')
    store.approveParagraph(p0.id)
    store.setStep('paragraph_approved')

    const { session } = useDocumentStore.getState()
    expect(session.currentParagraphIndex).toBe(1) // incremented

    // For paragraph_approved, we need -1 to get the just-approved paragraph
    const idx = session.currentParagraphIndex - 1
    expect(idx).toBe(0)
    expect(useDocumentStore.getState().document.paragraphs[idx].status).toBe('approved')
  })
})
