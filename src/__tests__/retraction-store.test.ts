import { describe, it, expect, beforeEach } from 'vitest'

/**
 * Tests for the retractSprints store action — verifying that sprint
 * deletions are materialized correctly in the Zustand store.
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
  structureMap: 'A → B',
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

function setupDocWithSprints() {
  const store = useDocumentStore.getState()
  store.initSession('test topic')
  store.setBlueprint(BLUEPRINT)

  const paras = useDocumentStore.getState().document.paragraphs

  // Add 2 approved sprints to para 0
  store.addSprint(paras[0].id)
  const s00 = useDocumentStore.getState().document.paragraphs[0].sprints[0]
  store.setSprintDraft(paras[0].id, s00.id, 'Sprint 0-0 text.')
  store.approveSprint(paras[0].id, s00.id)

  store.addSprint(paras[0].id)
  const s01 = useDocumentStore.getState().document.paragraphs[0].sprints[1]
  store.setSprintDraft(paras[0].id, s01.id, 'Sprint 0-1 text.')
  store.approveSprint(paras[0].id, s01.id)

  // Add 1 approved sprint to para 1
  store.addSprint(paras[1].id)
  const s10 = useDocumentStore.getState().document.paragraphs[1].sprints[0]
  store.setSprintDraft(paras[1].id, s10.id, 'Sprint 1-0 text.')
  store.approveSprint(paras[1].id, s10.id)

  return useDocumentStore.getState().document.paragraphs
}

describe('retractSprints store action', () => {
  it('removes a single sprint from a single paragraph', () => {
    setupDocWithSprints()

    useDocumentStore.getState().retractSprints([{ paragraphIndex: 1, sprintIndex: 0 }])

    const paras = useDocumentStore.getState().document.paragraphs
    expect(paras[1].sprints.length).toBe(0)
    // Para 1 should reset to placeholder since all sprints removed
    expect(paras[1].status).toBe('placeholder')
    expect(paras[1].draftText).toBe('')
  })

  it('removes multiple sprints from multiple paragraphs', () => {
    setupDocWithSprints()

    useDocumentStore.getState().retractSprints([
      { paragraphIndex: 0, sprintIndex: 1 }, // para 0, sprint 1
      { paragraphIndex: 1, sprintIndex: 0 }, // para 1, sprint 0
    ])

    const paras = useDocumentStore.getState().document.paragraphs
    expect(paras[0].sprints.length).toBe(1) // only sprint 0 remains
    expect(paras[0].sprints[0].approvedText).toBe('Sprint 0-0 text.')
    expect(paras[1].sprints.length).toBe(0)
    expect(paras[1].status).toBe('placeholder')
  })

  it('handles reverse-order deletions within same paragraph correctly', () => {
    setupDocWithSprints()

    // Delete both sprints from para 0 (higher index first to test ordering)
    useDocumentStore.getState().retractSprints([
      { paragraphIndex: 0, sprintIndex: 0 },
      { paragraphIndex: 0, sprintIndex: 1 },
    ])

    const paras = useDocumentStore.getState().document.paragraphs
    expect(paras[0].sprints.length).toBe(0)
    expect(paras[0].status).toBe('placeholder')
  })

  it('does not affect unrelated paragraphs', () => {
    setupDocWithSprints()

    useDocumentStore.getState().retractSprints([{ paragraphIndex: 1, sprintIndex: 0 }])

    const paras = useDocumentStore.getState().document.paragraphs
    // Para 0 should be completely untouched
    expect(paras[0].sprints.length).toBe(2)
    expect(paras[0].sprints[0].approvedText).toBe('Sprint 0-0 text.')
    expect(paras[0].sprints[1].approvedText).toBe('Sprint 0-1 text.')
    // Para 2 should be untouched
    expect(paras[2].sprints.length).toBe(0)
    expect(paras[2].status).toBe('placeholder')
  })

  it('handles empty deletions array gracefully', () => {
    setupDocWithSprints()

    useDocumentStore.getState().retractSprints([])

    const paras = useDocumentStore.getState().document.paragraphs
    expect(paras[0].sprints.length).toBe(2)
    expect(paras[1].sprints.length).toBe(1)
  })

  it('handles out-of-bounds paragraph index gracefully', () => {
    setupDocWithSprints()

    // This should not crash
    useDocumentStore.getState().retractSprints([{ paragraphIndex: 99, sprintIndex: 0 }])

    const paras = useDocumentStore.getState().document.paragraphs
    expect(paras[0].sprints.length).toBe(2)
    expect(paras[1].sprints.length).toBe(1)
  })

  it('updates lastSavedAt timestamp', () => {
    setupDocWithSprints()
    const beforeTs = useDocumentStore.getState().session.lastSavedAt

    useDocumentStore.getState().retractSprints([{ paragraphIndex: 1, sprintIndex: 0 }])

    const afterTs = useDocumentStore.getState().session.lastSavedAt
    expect(afterTs).not.toBeNull()
    expect(afterTs!).toBeGreaterThanOrEqual(beforeTs ?? 0)
  })
})

describe('resetStore clears everything', () => {
  it('resets session and document to defaults', () => {
    setupDocWithSprints()

    useDocumentStore.getState().resetStore()

    const { session, document } = useDocumentStore.getState()
    expect(session.currentStep).toBe('idle')
    expect(session.seedPrompt).toBe('')
    expect(session.currentParagraphIndex).toBe(0)
    expect(session.currentSprintIndex).toBe(0)
    expect(document.paragraphs).toEqual([])
    expect(document.blueprint).toBeNull()
    expect(document.globalDecisions).toEqual([])
  })
})

describe('Sprint approval + index tracking', () => {
  it('approveSprint increments currentSprintIndex', () => {
    const store = useDocumentStore.getState()
    store.initSession('test')
    store.setBlueprint(BLUEPRINT)

    const para = useDocumentStore.getState().document.paragraphs[0]
    store.addSprint(para.id)
    const sprint = useDocumentStore.getState().document.paragraphs[0].sprints[0]
    store.setSprintDraft(para.id, sprint.id, 'text')

    expect(useDocumentStore.getState().session.currentSprintIndex).toBe(0)
    store.approveSprint(para.id, sprint.id)
    expect(useDocumentStore.getState().session.currentSprintIndex).toBe(1)
  })

  it('cannot approve sprint that is not awaiting_review', () => {
    const store = useDocumentStore.getState()
    store.initSession('test')
    store.setBlueprint(BLUEPRINT)

    const para = useDocumentStore.getState().document.paragraphs[0]
    store.addSprint(para.id)
    const sprint = useDocumentStore.getState().document.paragraphs[0].sprints[0]
    // Sprint is 'placeholder', not 'awaiting_review'
    store.approveSprint(para.id, sprint.id)

    expect(useDocumentStore.getState().document.paragraphs[0].sprints[0].status).toBe('placeholder')
  })
})
