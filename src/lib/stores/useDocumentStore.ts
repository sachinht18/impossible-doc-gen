'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  AppStore,
  AppStep,
  GenerationPermission,
  WritingSession,
  DocumentState,
  ParagraphState,
  ParagraphStatus,
  DecisionState,
  InteractionNode,
  QuestionCard,
  Blueprint,
  SprintState,
  SprintStatus,
} from '../types'
import { computeSemanticHash } from '../engine/novelty-checker'
import { computeFatigueScore } from '../engine/fatigue-detector'
import { getSectionIndex } from '../engine/flow-stages'
import { getPermissionAfterApproval } from '../engine/generation-policy'

function makeId(): string {
  return Math.random().toString(36).slice(2, 10)
}

const DEFAULT_SESSION: WritingSession = {
  id: makeId(),
  seedPrompt: '',
  mode: 'guided',
  currentStep: 'idle',
  priorStep: null,
  permissionState: 0,
  fatigueScore: 0,
  overrideAttemptCount: 0,
  interactionHistory: [],
  activeQuestions: [],
  currentParagraphIndex: 0,
  currentSprintIndex: 0,
  error: null,
  lastSavedAt: null,
}

const DEFAULT_DOCUMENT: DocumentState = {
  blueprint: null,
  paragraphs: [],
  globalDecisions: [],
  lockedDecisions: [],
  pendingDecisions: [],
}

function makeParagraph(orderIndex: number): ParagraphState {
  return {
    id: makeId(),
    orderIndex,
    status: 'placeholder',
    decisions: [],
    sprints: [],
    draftText: '',
    approvedText: '',
    revisionHistory: [],
    sectionIndex: getSectionIndex(orderIndex),
  }
}

function makeSprint(orderIndex: number): SprintState {
  return {
    id: makeId(),
    orderIndex,
    status: 'placeholder',
    decisions: [],
    draftText: '',
    approvedText: '',
    revisionHistory: [],
  }
}

export const useDocumentStore = create<AppStore>()(
  persist(
    (set) => ({
      session: { ...DEFAULT_SESSION },
      document: { ...DEFAULT_DOCUMENT },

      // ── Session actions ────────────────────────────────────────────────────

      initSession: (seedPrompt: string) => {
        set({
          session: { ...DEFAULT_SESSION, id: makeId(), seedPrompt, currentStep: 'orienting' },
          document: { ...DEFAULT_DOCUMENT },
        })
      },

      setStep: (step: AppStep) => {
        set((state) => ({
          session: {
            ...state.session,
            priorStep: state.session.currentStep,
            currentStep: step,
          },
        }))
      },

      setPermission: (level: GenerationPermission) => {
        set((state) => ({
          session: { ...state.session, permissionState: level },
        }))
      },

      updateFatigue: (delta: number) => {
        set((state) => ({
          session: {
            ...state.session,
            fatigueScore: Math.max(0, Math.min(100, state.session.fatigueScore + delta)),
          },
        }))
      },

      incrementOverrideAttempt: () => {
        set((state) => ({
          session: {
            ...state.session,
            overrideAttemptCount: state.session.overrideAttemptCount + 1,
          },
        }))
      },

      addInteraction: (node: Omit<InteractionNode, 'id' | 'timestamp'>) => {
        const full: InteractionNode = {
          ...node,
          id: makeId(),
          timestamp: Date.now(),
          semanticHash: node.semanticHash ?? computeSemanticHash(node.content, node.type),
        }
        set((state) => {
          const history = [...state.session.interactionHistory, full]
          const fatigueScore = computeFatigueScore(history)
          return {
            session: {
              ...state.session,
              interactionHistory: history,
              fatigueScore,
              lastSavedAt: Date.now(),
            },
          }
        })
      },

      setActiveQuestions: (questions: QuestionCard[]) => {
        set((state) => ({
          session: { ...state.session, activeQuestions: questions },
        }))
      },

      setError: (error: string | null) => {
        set((state) => ({
          session: { ...state.session, error },
        }))
      },

      recoverFromError: () => {
        set((state) => ({
          session: {
            ...state.session,
            error: null,
            currentStep: state.session.priorStep ?? 'idle',
          },
        }))
      },

      resetStore: () => {
        set({
          session: { ...DEFAULT_SESSION, id: makeId() },
          document: { ...DEFAULT_DOCUMENT },
        })
      },

      setCurrentParagraphIndex: (index: number) => {
        set((state) => ({ session: { ...state.session, currentParagraphIndex: index } }))
      },

      setCurrentSprintIndex: (index: number) => {
        set((state) => ({ session: { ...state.session, currentSprintIndex: index } }))
      },

      // ── Document actions ───────────────────────────────────────────────────

      setBlueprint: (blueprint: Blueprint) => {
        const paragraphCount = blueprint.paragraphRoadmap.length
        const paragraphs: ParagraphState[] = Array.from({ length: paragraphCount }, (_, i) =>
          makeParagraph(i)
        )
        set((state) => ({
          document: { ...state.document, blueprint, paragraphs },
          session: { ...state.session, lastSavedAt: Date.now() },
        }))
      },

      addParagraph: () => {
        set((state) => {
          const next = makeParagraph(state.document.paragraphs.length)
          return {
            document: {
              ...state.document,
              paragraphs: [...state.document.paragraphs, next],
            },
          }
        })
      },

      setParagraphStatus: (id: string, status: ParagraphStatus) => {
        set((state) => ({
          document: {
            ...state.document,
            paragraphs: state.document.paragraphs.map((p) =>
              p.id === id ? { ...p, status } : p
            ),
          },
        }))
      },

      setParagraphDraft: (id: string, text: string) => {
        set((state) => ({
          document: {
            ...state.document,
            paragraphs: state.document.paragraphs.map((p) =>
              p.id === id ? { ...p, draftText: text, status: 'awaiting_review' } : p
            ),
          },
        }))
      },

      approveParagraph: (id: string) => {
        set((state) => {
          const para = state.document.paragraphs.find((p) => p.id === id)
          // Guard: cannot approve if not in awaiting_review
          if (!para || para.status !== 'awaiting_review') return state

          const updatedParagraphs = state.document.paragraphs.map((p) =>
            p.id === id
              ? { ...p, status: 'approved' as ParagraphStatus, approvedText: p.draftText }
              : p
          )
          const approvedCount = updatedParagraphs.filter(
            (p) => p.status === 'approved' || p.status === 'locked'
          ).length
          const newPermission = getPermissionAfterApproval(
            state.session.permissionState,
            approvedCount
          )

          return {
            document: { ...state.document, paragraphs: updatedParagraphs },
            session: {
              ...state.session,
              permissionState: newPermission,
              currentParagraphIndex: state.session.currentParagraphIndex + 1,
              currentSprintIndex: 0, // Reset sprint index for next paragraph
              lastSavedAt: Date.now(),
            },
          }
        })
      },

      lockParagraph: (id: string) => {
        set((state) => {
          const para = state.document.paragraphs.find((p) => p.id === id)
          // Guard: can only lock approved paragraphs
          if (!para || para.status !== 'approved') return state
          return {
            document: {
              ...state.document,
              paragraphs: state.document.paragraphs.map((p) =>
                p.id === id ? { ...p, status: 'locked' as ParagraphStatus } : p
              ),
            },
          }
        })
      },

      rollbackParagraph: (id: string) => {
        set((state) => {
          const para = state.document.paragraphs.find((p) => p.id === id)
          if (!para || para.revisionHistory.length === 0) return state
          const lastRevision = para.revisionHistory[para.revisionHistory.length - 1]
          return {
            document: {
              ...state.document,
              paragraphs: state.document.paragraphs.map((p) =>
                p.id === id
                  ? {
                      ...p,
                      draftText: lastRevision.text,
                      approvedText: lastRevision.text,
                      status: 'approved' as ParagraphStatus,
                      revisionHistory: p.revisionHistory.slice(0, -1),
                    }
                  : p
              ),
            },
          }
        })
      },

      assembleParagraph: (id: string) => {
        set((state) => {
          const para = state.document.paragraphs.find((p) => p.id === id)
          if (!para) return state
          return {
            document: {
              ...state.document,
              paragraphs: state.document.paragraphs.map((p) =>
                p.id === id ? { ...p, status: 'assembling' as ParagraphStatus } : p
              ),
            },
          }
        })
      },

      addGlobalDecision: (decision: DecisionState) => {
        set((state) => ({
          document: {
            ...state.document,
            globalDecisions: [...state.document.globalDecisions, decision],
          },
        }))
      },

      lockDecision: (id: string) => {
        set((state) => ({
          document: {
            ...state.document,
            globalDecisions: state.document.globalDecisions.map((d) =>
              d.id === id ? { ...d, locked: true } : d
            ),
            lockedDecisions: state.document.lockedDecisions.includes(id)
              ? state.document.lockedDecisions
              : [...state.document.lockedDecisions, id],
          },
        }))
      },

      invalidateDownstream: (decisionId: string) => {
        set((state) => {
          const decision = state.document.globalDecisions.find((d) => d.id === decisionId)
          if (!decision) return state

          const affectedIds = new Set(decision.affected_units)
          const updatedParagraphs = state.document.paragraphs.map((p) =>
            affectedIds.has(p.id) && (p.status === 'approved' || p.status === 'locked')
              ? { ...p, status: 'stale_due_to_upstream_change' as ParagraphStatus }
              : p
          )

          return {
            document: { ...state.document, paragraphs: updatedParagraphs },
          }
        })
      },

      // ── Sprint actions ─────────────────────────────────────────────────────

      addSprint: (paragraphId: string) => {
        set((state) => {
          const para = state.document.paragraphs.find((p) => p.id === paragraphId)
          if (!para) return state
          const nextSprint = makeSprint(para.sprints.length)
          return {
            document: {
              ...state.document,
              paragraphs: state.document.paragraphs.map((p) =>
                p.id === paragraphId ? { ...p, sprints: [...p.sprints, nextSprint] } : p
              ),
            },
          }
        })
      },

      setSprintStatus: (paragraphId: string, sprintId: string, status: SprintStatus) => {
        set((state) => ({
          document: {
            ...state.document,
            paragraphs: state.document.paragraphs.map((p) =>
              p.id === paragraphId
                ? {
                    ...p,
                    sprints: p.sprints.map((s) => (s.id === sprintId ? { ...s, status } : s)),
                  }
                : p
            ),
          },
        }))
      },

      setSprintDraft: (paragraphId: string, sprintId: string, text: string) => {
        set((state) => ({
          document: {
            ...state.document,
            paragraphs: state.document.paragraphs.map((p) =>
              p.id === paragraphId
                ? {
                    ...p,
                    sprints: p.sprints.map((s) =>
                      s.id === sprintId ? { ...s, draftText: text, status: 'awaiting_review' } : s
                    ),
                  }
                : p
            ),
          },
        }))
      },

      approveSprint: (paragraphId: string, sprintId: string) => {
        set((state) => {
          const para = state.document.paragraphs.find((p) => p.id === paragraphId)
          if (!para) return state
          const sprint = para.sprints.find((s) => s.id === sprintId)
          if (!sprint || sprint.status !== 'awaiting_review') return state

          return {
            document: {
              ...state.document,
              paragraphs: state.document.paragraphs.map((p) =>
                p.id === paragraphId
                  ? {
                      ...p,
                      sprints: p.sprints.map((s) =>
                        s.id === sprintId ? { ...s, status: 'approved', approvedText: s.draftText } : s
                      ),
                    }
                  : p
              ),
            },
            session: {
              ...state.session,
              currentSprintIndex: state.session.currentSprintIndex + 1,
              lastSavedAt: Date.now(),
            },
          }
        })
      },

      retractSprints: (deletions: Array<{ paragraphIndex: number; sprintIndex: number }>) => {
        set((state) => {
          const updatedParagraphs = [...state.document.paragraphs]
          // Sort deletions in reverse order to avoid index shifting
          const sorted = [...deletions].sort(
            (a, b) => b.paragraphIndex - a.paragraphIndex || b.sprintIndex - a.sprintIndex
          )
          for (const { paragraphIndex, sprintIndex } of sorted) {
            const para = updatedParagraphs[paragraphIndex]
            if (para) {
              const updatedSprints = [...para.sprints]
              updatedSprints.splice(sprintIndex, 1)
              updatedParagraphs[paragraphIndex] = { ...para, sprints: updatedSprints }
              // If all sprints removed, reset paragraph status
              if (updatedSprints.length === 0 && (para.status === 'approved' || para.status === 'locked' || para.status === 'gathering_sprints')) {
                updatedParagraphs[paragraphIndex] = { ...updatedParagraphs[paragraphIndex], status: 'placeholder', draftText: '', approvedText: '' }
              }
            }
          }
          return {
            document: { ...state.document, paragraphs: updatedParagraphs },
            session: { ...state.session, lastSavedAt: Date.now() },
          }
        })
      },

      rollbackSprint: (paragraphId: string, sprintId: string) => {
        set((state) => {
          const para = state.document.paragraphs.find((p) => p.id === paragraphId)
          if (!para) return state
          const sprint = para.sprints.find((s) => s.id === sprintId)
          if (!sprint || sprint.revisionHistory.length === 0) return state
          const lastRevision = sprint.revisionHistory[sprint.revisionHistory.length - 1]
          return {
            document: {
              ...state.document,
              paragraphs: state.document.paragraphs.map((p) =>
                p.id === paragraphId
                  ? {
                      ...p,
                      sprints: p.sprints.map((s) =>
                        s.id === sprintId
                          ? {
                              ...s,
                              draftText: lastRevision.text,
                              approvedText: lastRevision.text,
                              status: 'approved',
                              revisionHistory: s.revisionHistory.slice(0, -1),
                            }
                          : s
                      ),
                    }
                  : p
              ),
            },
          }
        })
      },
    }),
    {
      name: 'impossible-doc-gen-v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        session: {
          ...state.session,
          activeQuestions: [], // don't persist transient UI state
          error: null,         // don't persist errors across reloads
        },
        document: state.document,
      }),
    }
  )
)
