import { describe, it, expect, beforeEach } from 'vitest'

// Mock localStorage for Zustand persist
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

// Dynamic import after mocking
let useDocumentStore: typeof import('../lib/stores/useDocumentStore').useDocumentStore

beforeEach(async () => {
  localStorageMock.clear()
  // Re-import to get a fresh store
  const mod = await import('../lib/stores/useDocumentStore')
  useDocumentStore = mod.useDocumentStore
  useDocumentStore.getState().resetStore()
})

describe('useDocumentStore', () => {
  it('starts in idle state', () => {
    const { session } = useDocumentStore.getState()
    expect(session.currentStep).toBe('idle')
    expect(session.permissionState).toBe(0)
    expect(session.fatigueScore).toBe(0)
    expect(session.error).toBeNull()
  })

  it('initSession sets seed and moves to orienting', () => {
    useDocumentStore.getState().initSession('test topic')
    const { session } = useDocumentStore.getState()
    expect(session.seedPrompt).toBe('test topic')
    expect(session.currentStep).toBe('orienting')
  })

  it('setStep transitions correctly and saves priorStep', () => {
    const store = useDocumentStore.getState()
    store.initSession('topic')
    store.setStep('recommending')
    const { session } = useDocumentStore.getState()
    expect(session.currentStep).toBe('recommending')
    expect(session.priorStep).toBe('orienting')
  })

  it('paragraph lifecycle: placeholder → awaiting_review → approved', () => {
    const store = useDocumentStore.getState()
    store.initSession('topic')

    // Manually add a paragraph via blueprint
    const blueprint = {
      titleCandidates: ['T'],
      selectedTitle: 'T',
      thesis: 'thesis',
      toneProfile: 'direct',
      structureMap: 'A → B',
      sectionPlan: [{ title: 'S1', paragraphCount: 1, role: 'intro' }],
      paragraphRoadmap: [{ index: 0, job: 'introduce', startsAt: 'First' }],
    }
    store.setBlueprint(blueprint)

    const { document } = useDocumentStore.getState()
    const para = document.paragraphs[0]
    expect(para).toBeDefined()
    expect(para.status).toBe('placeholder')

    // Move to draft
    store.setParagraphDraft(para.id, 'Draft text here.')
    expect(useDocumentStore.getState().document.paragraphs[0].status).toBe('awaiting_review')

    // Approve
    store.approveParagraph(para.id)
    expect(useDocumentStore.getState().document.paragraphs[0].status).toBe('approved')
    expect(useDocumentStore.getState().document.paragraphs[0].approvedText).toBe('Draft text here.')
  })

  it('cannot approve paragraph that is not awaiting_review', () => {
    const store = useDocumentStore.getState()
    store.initSession('topic')

    const blueprint = {
      titleCandidates: ['T'],
      selectedTitle: 'T',
      thesis: 'thesis',
      toneProfile: 'direct',
      structureMap: 'A → B',
      sectionPlan: [{ title: 'S1', paragraphCount: 1, role: 'intro' }],
      paragraphRoadmap: [{ index: 0, job: 'introduce', startsAt: 'First' }],
    }
    store.setBlueprint(blueprint)

    const { document } = useDocumentStore.getState()
    const para = document.paragraphs[0]
    // Status is 'placeholder', not 'awaiting_review'
    store.approveParagraph(para.id)
    expect(useDocumentStore.getState().document.paragraphs[0].status).toBe('placeholder')
  })

  it('cannot unlock a locked paragraph via lockParagraph if not approved', () => {
    const store = useDocumentStore.getState()
    store.initSession('topic')

    const blueprint = {
      titleCandidates: ['T'],
      selectedTitle: 'T',
      thesis: 'thesis',
      toneProfile: 'direct',
      structureMap: 'A → B',
      sectionPlan: [{ title: 'S1', paragraphCount: 1, role: 'intro' }],
      paragraphRoadmap: [{ index: 0, job: 'introduce', startsAt: 'First' }],
    }
    store.setBlueprint(blueprint)

    const para = useDocumentStore.getState().document.paragraphs[0]
    // Trying to lock a placeholder paragraph should do nothing
    store.lockParagraph(para.id)
    expect(useDocumentStore.getState().document.paragraphs[0].status).toBe('placeholder')
  })

  it('upstream invalidation marks downstream paragraphs as stale', () => {
    const store = useDocumentStore.getState()
    store.initSession('topic')

    const blueprint = {
      titleCandidates: ['T'],
      selectedTitle: 'T',
      thesis: 'thesis',
      toneProfile: 'direct',
      structureMap: 'A → B',
      sectionPlan: [{ title: 'S1', paragraphCount: 2, role: 'intro' }],
      paragraphRoadmap: [
        { index: 0, job: 'introduce', startsAt: 'First' },
        { index: 1, job: 'continue', startsAt: 'Second' },
      ],
    }
    store.setBlueprint(blueprint)

    const paras = useDocumentStore.getState().document.paragraphs
    const [p0, p1] = paras

    // Approve both paragraphs
    store.setParagraphDraft(p0.id, 'text 0')
    store.approveParagraph(p0.id)
    store.setParagraphDraft(p1.id, 'text 1')
    store.approveParagraph(p1.id)

    // Add a decision that affects p1
    const decision = {
      id: 'dec1',
      category: 'tone' as const,
      question: 'tone?',
      answer: 'formal',
      importance: 'high' as const,
      resolved: true,
      locked: true,
      depends_on: [],
      affected_units: [p1.id],
    }
    store.addGlobalDecision(decision)
    store.invalidateDownstream('dec1')

    const updatedParas = useDocumentStore.getState().document.paragraphs
    expect(updatedParas[1].status).toBe('stale_due_to_upstream_change')
    // p0 should be unaffected
    expect(updatedParas[0].status).toBe('approved')
  })

  it('rollback restores prior approved text', () => {
    const store = useDocumentStore.getState()
    store.initSession('topic')

    const blueprint = {
      titleCandidates: ['T'],
      selectedTitle: 'T',
      thesis: 'thesis',
      toneProfile: 'direct',
      structureMap: 'A → B',
      sectionPlan: [{ title: 'S1', paragraphCount: 1, role: 'intro' }],
      paragraphRoadmap: [{ index: 0, job: 'introduce', startsAt: 'First' }],
    }
    store.setBlueprint(blueprint)

    const para = useDocumentStore.getState().document.paragraphs[0]

    // First approval
    store.setParagraphDraft(para.id, 'Original text.')
    store.approveParagraph(para.id)

    // Manually add revision history
    useDocumentStore.setState((state) => ({
      document: {
        ...state.document,
        paragraphs: state.document.paragraphs.map((p) =>
          p.id === para.id
            ? {
                ...p,
                revisionHistory: [{ text: 'Original text.', timestamp: Date.now(), reason: 'first version' }],
                draftText: 'Revised text.',
                approvedText: 'Revised text.',
              }
            : p
        ),
      },
    }))

    store.rollbackParagraph(para.id)
    const rolled = useDocumentStore.getState().document.paragraphs[0]
    expect(rolled.approvedText).toBe('Original text.')
  })

  it('error state preserves priorStep and can be recovered', () => {
    const store = useDocumentStore.getState()
    store.initSession('topic')
    store.setStep('paragraph_planning')
    store.setError('Something went wrong')

    const { session } = useDocumentStore.getState()
    expect(session.error).toBe('Something went wrong')

    store.recoverFromError()
    const recovered = useDocumentStore.getState().session
    expect(recovered.error).toBeNull()
    expect(recovered.currentStep).toBe('orienting') // priorStep was orienting
  })
})
