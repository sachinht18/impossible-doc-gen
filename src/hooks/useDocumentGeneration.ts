'use client'

import { useState, useCallback, useRef } from 'react'
import { useDocumentStore } from '@/lib/stores/useDocumentStore'
import type { DecisionState, Blueprint } from '@/lib/types'
import { computeSemanticHash } from '@/lib/engine/novelty-checker'
import { ESCALATION } from '@/lib/config/escalation-params'
import { applyFatigueAdjustment } from '@/lib/engine/fatigue-detector'
import {
  type FrustrationState,
  createFrustrationState,
  resetFrustration,
  recordConflict,
  reduceFrustrationOnApproval,
  generateConflictResponse,
} from '@/lib/engine/frustration-tracker'
import {
  apiGenerateQuestions,
  apiGenerateParagraph,
  apiGenerateSprint,
  apiGeneratePartialParagraph,
  apiAssembleParagraph,
  apiReviseParagraph,
  apiGenerateBlueprint,
  apiAdviseBlueprintChanges,
  apiDetectInconsistency,
  type SprintGenerationResult,
} from '@/lib/api-client'
import { SPRINTS_PER_PARAGRAPH } from '@/lib/agents/question-generator'
import type { BlueprintAdvisorResult } from '@/lib/agents/blueprint-advisor'
import type { InconsistencyResult } from '@/lib/agents/inconsistency-detector'

// Steps where it's safe to fire a background inconsistency check
const SAFE_STEPS_FOR_INCONSISTENCY = new Set([
  'orienting', 'paragraph_planning', 'sprint_planning',
  'confirming_blueprint', 'sprint_generated', 'paragraph_generated',
])

export function useDocumentGeneration() {
  const {
    session,
    document,
    initSession,
    setStep,
    setBlueprint,
    setActiveQuestions,
    setParagraphStatus,
    setParagraphDraft,
    approveParagraph,
    addGlobalDecision,
    addInteraction,
    setError,
    addSprint,
    setSprintDraft,
    approveSprint,
    setCurrentSprintIndex,
    resetStore,
    retractSprints,
  } = useDocumentStore()

  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [focusedParagraphId, setFocusedParagraphId] = useState<string | null>(null)
  const [advisorResult, setAdvisorResult] = useState<BlueprintAdvisorResult | null>(null)
  const [inconsistencyWarning, setInconsistencyWarning] = useState<InconsistencyResult | null>(null)
  const [orientationPreview, setOrientationPreview] = useState<string | null>(null)
  const [fatigueAcknowledgment, setFatigueAcknowledgment] = useState<string | null>(null)
  // Retraction/deletion notifications for the UI
  const [retractionWarning, setRetractionWarning] = useState<string | null>(null)
  const [deletionNotice, setDeletionNotice] = useState<string | null>(null)
  const [sorryMessage, setSorryMessage] = useState<string | null>(null)
  // Past-mistake headsup (Fix 12: learn from past mistakes)
  const [conflictHeadsup, setConflictHeadsup] = useState<string | null>(null)
  // Parody end message
  const [parodyEndMessage, setParodyEndMessage] = useState<string | null>(null)

  // Tracks answers given in current paragraph planning round
  const paragraphAnswerCountRef = useRef(0)
  // Next answer count at which to fire a partial generation (randomised 2-5 step each time)
  const nextPartialTriggerRef = useRef(2 + Math.floor(Math.random() * 4))
  // Tracks answers during orientation for preview trigger
  const orientationAnswerCountRef = useRef(0)
  const nextOrientationTriggerRef = useRef(2 + Math.floor(Math.random() * 3))
  // Tracks total answers for inconsistency check interval
  const totalAnswerCountRef = useRef(0)
  // Dynamic inconsistency check: next trigger threshold (randomized 4-8)
  const nextInconsistencyTriggerRef = useRef(
    ESCALATION.INCONSISTENCY_CHECK_MIN +
      Math.floor(Math.random() * (ESCALATION.INCONSISTENCY_CHECK_MAX - ESCALATION.INCONSISTENCY_CHECK_MIN + 1))
  )
  // Tracks which paragraph index the refs are for (reset when paragraph changes)
  const currentParagraphIndexRef = useRef(-1)
  // Fatigue acknowledgment counter (max 2) — use ref to avoid stale closure (#15)
  const fatigueAckCountRef = useRef(0)
  const lastFatigueAckLevelRef = useRef<'moderate' | 'high' | null>(null)
  // Frustration state (tracks across session, resets when everything deleted)
  const frustrationStateRef = useRef<FrustrationState>(createFrustrationState())
  // Conflict history for headsup (Fix 12: learn from past mistakes)
  const conflictHistoryRef = useRef<Array<{ type: string; paragraphIndex: number; score: number }>>([])

  function resetParagraphRefs(newIndex: number) {
    if (currentParagraphIndexRef.current !== newIndex) {
      paragraphAnswerCountRef.current = 0
      nextPartialTriggerRef.current = 2 + Math.floor(Math.random() * 4)
      currentParagraphIndexRef.current = newIndex
    }
  }

  /** Reset ALL refs to fresh state — called on coherence full reset and new seed */
  function resetAllRefs() {
    paragraphAnswerCountRef.current = 0
    nextPartialTriggerRef.current = 2 + Math.floor(Math.random() * 4)
    orientationAnswerCountRef.current = 0
    nextOrientationTriggerRef.current = 2 + Math.floor(Math.random() * 3)
    totalAnswerCountRef.current = 0
    nextInconsistencyTriggerRef.current =
      ESCALATION.INCONSISTENCY_CHECK_MIN +
      Math.floor(Math.random() * (ESCALATION.INCONSISTENCY_CHECK_MAX - ESCALATION.INCONSISTENCY_CHECK_MIN + 1))
    currentParagraphIndexRef.current = -1
    fatigueAckCountRef.current = 0
    lastFatigueAckLevelRef.current = null
    frustrationStateRef.current = createFrustrationState()
    conflictHistoryRef.current = []
  }

  // ── Seed submit ─────────────────────────────────────────────────────────────
  const handleSeedSubmit = useCallback(async (prompt: string) => {
    initSession(prompt)
    setInconsistencyWarning(null)
    resetAllRefs()
    setIsLoading(true)
    setLoadingMessage('Generating orientation questions\u2026')

    try {
      const store = useDocumentStore.getState()
      const questions = await apiGenerateQuestions(store.session, store.document, 0)
      setActiveQuestions(questions)
      setStep('orienting')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate questions')
    } finally {
      setIsLoading(false)
      setLoadingMessage('')
    }
  }, [initSession, setActiveQuestions, setStep, setError])

  // ── Blueprint generation ────────────────────────────────────────────────────
  const triggerBlueprintGeneration = useCallback(async () => {
    setOrientationPreview(null)
    setIsLoading(true)
    setLoadingMessage('Building your document blueprint\u2026')
    setStep('recommending')

    try {
      const store = useDocumentStore.getState()
      const orientationAnswers = store.document.globalDecisions
        .filter((d) => d.resolved)
        .map((d) => ({ question: d.question, answer: d.answer }))

      const blueprint = await apiGenerateBlueprint(store.session.seedPrompt, orientationAnswers)
      setBlueprint(blueprint as Blueprint)
      setStep('confirming_blueprint')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate blueprint')
    } finally {
      setIsLoading(false)
      setLoadingMessage('')
    }
  }, [setStep, setBlueprint, setError])

  // ── Inconsistency check (runs in background, non-blocking) ─────────────────
  const runInconsistencyCheck = useCallback(async () => {
    // Guard: only fire during safe steps (#34)
    const currentStep = useDocumentStore.getState().session.currentStep
    if (!SAFE_STEPS_FOR_INCONSISTENCY.has(currentStep)) return

    const store = useDocumentStore.getState()
    const qaHistory = store.document.globalDecisions
      .filter((d) => d.resolved)
      .map((d) => ({ question: d.question, answer: d.answer }))

    try {
      const result = await apiDetectInconsistency(store.session.seedPrompt, qaHistory)
      if (result.hasInconsistency) {
        // Double-check we're still in a safe step (async gap)
        const nowStep = useDocumentStore.getState().session.currentStep
        if (!SAFE_STEPS_FOR_INCONSISTENCY.has(nowStep)) return

        setInconsistencyWarning(result)
        setStep('clarifying_inconsistency')

        // Track this conflict for frustration escalation
        frustrationStateRef.current = recordConflict(frustrationStateRef.current, 'inconsistency')

        // Rollback any in-progress paragraph drafts — they were built on confused input
        const freshStore = useDocumentStore.getState()
        freshStore.document.paragraphs.forEach((p) => {
          if (p.status === 'gathering_sprints' || p.status === 'awaiting_review') {
            setParagraphDraft(p.id, '')
            setParagraphStatus(p.id, 'placeholder')
          }
        })
      }
    } catch {
      // Inconsistency check is best-effort; never block the user for it
    }
  }, [setStep, setParagraphStatus, setParagraphDraft])

  // ── Sprint generation ─────────────────────────────────────────────────────
  const triggerSprintGeneration = useCallback(async () => {
    const store = useDocumentStore.getState()
    const idx = store.session.currentParagraphIndex
    const sprintIdx = store.session.currentSprintIndex
    const para = store.document.paragraphs[idx]
    if (!para) return

    // Ensure the sprint slot exists
    if (!para.sprints[sprintIdx]) {
      addSprint(para.id)
    }

    // Clear stale warnings from prior sprints (#12)
    setRetractionWarning(null)
    setDeletionNotice(null)
    setSorryMessage(null)
    setConflictHeadsup(null)

    setStep('sprint_generating')
    setIsLoading(true)
    setLoadingMessage(`Writing sprint ${sprintIdx + 1} of ${SPRINTS_PER_PARAGRAPH}\u2026`)

    try {
      const freshStore = useDocumentStore.getState()
      const result: SprintGenerationResult = await apiGenerateSprint(
        freshStore.session, freshStore.document, idx, sprintIdx
      )

      // ── Handle coherence response ──────────────────────────────────────
      if (result.coherence) {
        const coh = result.coherence

        // Record conflict for frustration tracking
        if (coh.score < 70) {
          // Generate response BEFORE recording so user sees their current tone (#14)
          const tone = generateConflictResponse(
            frustrationStateRef.current.currentTone,
            `Coherence score ${coh.score}/100 \u2014 the new sprint conflicts with the established point of view.`,
            frustrationStateRef.current.totalConflicts
          )
          setRetractionWarning(tone)

          // NOW record the conflict (bumps tone for next time)
          frustrationStateRef.current = recordConflict(frustrationStateRef.current, 'coherence')
          conflictHistoryRef.current.push({
            type: 'coherence',
            paragraphIndex: idx,
            score: coh.score,
          })
        }

        // Materialize retracted sprints using exact deletions from resolver (#1)
        if (coh.deletions && coh.deletions.length > 0) {
          retractSprints(coh.deletions)

          // Reset sprint index if current paragraph was affected (#31)
          const currentParaAffected = coh.deletions.some((d) => d.paragraphIndex === idx)
          if (currentParaAffected) {
            const updatedPara = useDocumentStore.getState().document.paragraphs[idx]
            setCurrentSprintIndex(updatedPara?.sprints.length ?? 0)
          }
        } else if (coh.deletedParagraphIndices && coh.deletedParagraphIndices.length > 0) {
          // Fallback: if server didn't send exact deletions (backwards compat)
          const deletions: Array<{ paragraphIndex: number; sprintIndex: number }> = []
          const currentDoc = useDocumentStore.getState().document
          for (const pIdx of coh.deletedParagraphIndices) {
            const p = currentDoc.paragraphs[pIdx]
            if (p) {
              for (let s = p.sprints.length - 1; s >= 0; s--) {
                if (p.sprints[s].approvedText) {
                  deletions.push({ paragraphIndex: pIdx, sprintIndex: s })
                  break
                }
              }
            }
          }
          if (deletions.length > 0) {
            retractSprints(deletions)
          }
        }

        // Show deletion notice
        if ((coh.deletedParagraphCount ?? 0) >= 2) {
          setDeletionNotice(
            `${coh.deletedParagraphCount} paragraphs had sprints removed to resolve a coherence conflict.`
          )
        }

        // Show sorry message when resolver says so
        if (coh.sorry) {
          setSorryMessage(coh.reason ?? 'Sorry \u2014 your new direction conflicted with too much existing content. We had to remove some work.')
        }

        // Handle full reset
        if (coh.resetToStart) {
          // Reset frustration on full deletion
          frustrationStateRef.current = resetFrustration(frustrationStateRef.current)
          conflictHistoryRef.current = []
          resetAllRefs()

          // Reset the store to start fresh
          resetStore()

          // Re-init with the same seed prompt so user doesn't lose their topic
          const seedPrompt = freshStore.session.seedPrompt
          initSession(seedPrompt)

          setSorryMessage(
            coh.reason ??
              'Everything had to be scrapped. Your new direction was too different from what existed. Starting fresh.'
          )
          setIsLoading(false)
          setLoadingMessage('')
          return
        }
      }

      // Get the sprint id after potential addSprint call
      const freshPara = useDocumentStore.getState().document.paragraphs[idx]
      const sprint = freshPara?.sprints[sprintIdx]
      if (sprint) {
        setSprintDraft(para.id, sprint.id, result.text)
      }
      setStep('sprint_generated')
      setFocusedParagraphId(para.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate sprint')
      setStep('sprint_planning')
    } finally {
      setIsLoading(false)
      setLoadingMessage('')
    }
  }, [setStep, setIsLoading, setLoadingMessage, addSprint, setSprintDraft, setError, setFocusedParagraphId, retractSprints, resetStore, initSession, setCurrentSprintIndex])

  // ── Sprint planning (ask sprint questions then generate) ──────────────────
  const triggerSprintPlanning = useCallback(async (paragraphIndex: number, sprintIndex: number) => {
    setStep('sprint_planning')
    setIsLoading(true)
    setLoadingMessage(`Planning sprint ${sprintIndex + 1} of ${SPRINTS_PER_PARAGRAPH}\u2026`)

    try {
      const store = useDocumentStore.getState()
      const para = store.document.paragraphs[paragraphIndex]
      if (para && para.status === 'placeholder') {
        setParagraphStatus(para.id, 'gathering_sprints')
        setFocusedParagraphId(para.id)
      }
      const questions = await apiGenerateQuestions(store.session, store.document, paragraphIndex, sprintIndex)
      setActiveQuestions(questions)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate sprint questions')
    } finally {
      setIsLoading(false)
      setLoadingMessage('')
    }
  }, [setStep, setParagraphStatus, setActiveQuestions, setError, setFocusedParagraphId])

  // ── Paragraph assembly (from approved sprints) ────────────────────────────
  const triggerParagraphAssembly = useCallback(async () => {
    const store = useDocumentStore.getState()
    const idx = store.session.currentParagraphIndex
    const para = store.document.paragraphs[idx]
    if (!para) return

    setStep('paragraph_assembling')
    setIsLoading(true)
    setLoadingMessage(`Assembling paragraph ${idx + 1} from sprints\u2026`)

    try {
      const freshStore = useDocumentStore.getState()
      const text = await apiAssembleParagraph(freshStore.session, freshStore.document, idx)
      setParagraphDraft(para.id, text)
      setStep('paragraph_generated')
      setFocusedParagraphId(para.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to assemble paragraph')
    } finally {
      setIsLoading(false)
      setLoadingMessage('')
    }
  }, [setStep, setParagraphDraft, setError, setFocusedParagraphId])

  // ── Partial paragraph preview (fires mid-questioning, non-blocking) ─────────
  const triggerPartialParagraphGeneration = useCallback(async (paragraphIndex: number, paragraphId: string) => {
    const store = useDocumentStore.getState()
    try {
      const partialText = await apiGeneratePartialParagraph(store.session, store.document, paragraphIndex)
      // Apply as long as paragraph hasn't been finalised (awaiting_review/approved/locked)
      const current = useDocumentStore.getState().document.paragraphs.find((p) => p.id === paragraphId)
      if (current && (current.status === 'placeholder' || current.status === 'gathering_sprints')) {
        setParagraphDraft(paragraphId, partialText)
        setParagraphStatus(paragraphId, 'awaiting_review')
        setFocusedParagraphId(paragraphId)
      }
    } catch {
      // Partial generation is best-effort; fail silently
    }
  }, [setParagraphDraft, setParagraphStatus, setFocusedParagraphId])

  // ── Answer handler ──────────────────────────────────────────────────────────
  const handleAnswer = useCallback(async (questionId: string, answer: string, category: string) => {
    // Read from latest store state to avoid rapid-answer race (#33)
    const store = useDocumentStore.getState()
    const questionText = store.session.activeQuestions.find((q) => q.id === questionId)?.question ?? ''

    addInteraction({
      type: 'answer',
      content: answer,
      semanticHash: computeSemanticHash(answer, category),
      relatedDecisionId: questionId,
    })

    // Filter from LATEST store state, not stale closure (#33)
    const latestQuestions = useDocumentStore.getState().session.activeQuestions
    const remaining = latestQuestions.filter((q) => q.id !== questionId)
    setActiveQuestions(remaining)

    const decision: DecisionState = {
      id: questionId,
      category: category as DecisionState['category'],
      question: questionText,
      answer,
      importance: 'high',
      resolved: true,
      locked: false,
      depends_on: [],
      affected_units: [],
    }
    addGlobalDecision(decision)

    totalAnswerCountRef.current += 1

    // ── Fatigue check: acknowledge if user is tired (max 2 times) ──────────
    const fatigueAdjustment = applyFatigueAdjustment(
      ESCALATION.BASE_QUESTION_COUNT,
      store.session.fatigueScore,
      fatigueAckCountRef.current
    )

    // Show acknowledgment once per fatigue level transition, max 2 total
    // Use ref for lastFatigueAckLevel to avoid stale closure (#15)
    if (
      fatigueAckCountRef.current < 2 &&
      (fatigueAdjustment.fatigueLevel === 'moderate' || fatigueAdjustment.fatigueLevel === 'high') &&
      fatigueAdjustment.acknowledgment &&
      lastFatigueAckLevelRef.current !== fatigueAdjustment.fatigueLevel
    ) {
      setFatigueAcknowledgment(fatigueAdjustment.acknowledgment)
      lastFatigueAckLevelRef.current = fatigueAdjustment.fatigueLevel
      fatigueAckCountRef.current += 1
    }

    // ── Inconsistency check at dynamic interval (every 4-8 answers) ───────
    // Only fire during safe steps (#34)
    if (
      totalAnswerCountRef.current >= nextInconsistencyTriggerRef.current &&
      !inconsistencyWarning &&
      SAFE_STEPS_FOR_INCONSISTENCY.has(store.session.currentStep)
    ) {
      // Re-randomize next trigger
      nextInconsistencyTriggerRef.current =
        totalAnswerCountRef.current +
        ESCALATION.INCONSISTENCY_CHECK_MIN +
        Math.floor(Math.random() * (ESCALATION.INCONSISTENCY_CHECK_MAX - ESCALATION.INCONSISTENCY_CHECK_MIN + 1))
      runInconsistencyCheck() // non-blocking
    }

    // ── Headsup from past mistakes (Fix 12) ───────────────────────────────
    const pastConflictsForPara = conflictHistoryRef.current.filter(
      (c) => c.paragraphIndex === store.session.currentParagraphIndex
    )
    if (pastConflictsForPara.length > 0 && !conflictHeadsup) {
      setConflictHeadsup(
        `Heads up: this paragraph triggered coherence issues before ` +
          `(score ${pastConflictsForPara[pastConflictsForPara.length - 1].score}/100). ` +
          `Be mindful of keeping consistent with the established PoV.`
      )
    }

    // ── Orientation: show a speculative opening while user answers ──────────
    if (store.session.currentStep === 'orienting') {
      orientationAnswerCountRef.current += 1
      if (orientationAnswerCountRef.current >= nextOrientationTriggerRef.current) {
        nextOrientationTriggerRef.current = orientationAnswerCountRef.current + 2 + Math.floor(Math.random() * 3)
        const freshStore = useDocumentStore.getState()
        apiGeneratePartialParagraph(freshStore.session, freshStore.document, 0)
          .then((text) => setOrientationPreview(text))
          .catch(() => {})
      }
    }

    // ── Paragraph planning: re-generate preview every N answers ────────────
    if (store.session.currentStep === 'paragraph_planning') {
      const idx = store.session.currentParagraphIndex
      resetParagraphRefs(idx)
      paragraphAnswerCountRef.current += 1

      // Trigger a fresh partial draft when we hit the dynamic threshold, then pick a new one
      if (paragraphAnswerCountRef.current >= nextPartialTriggerRef.current) {
        nextPartialTriggerRef.current = paragraphAnswerCountRef.current + 2 + Math.floor(Math.random() * 4)
        const para = store.document.paragraphs[idx]
        if (para) {
          triggerPartialParagraphGeneration(idx, para.id)
        }
      }
    }

    // ── When batch exhausted: advance to next stage ────────────────────────
    if (remaining.length === 0 && (store.session.currentStep === 'orienting' || store.session.currentStep === 'recommending')) {
      await triggerBlueprintGeneration()
    }

    if (remaining.length === 0 && store.session.currentStep === 'paragraph_planning') {
      // Paragraph questions done — start sprint 0
      const idx = store.session.currentParagraphIndex
      await triggerSprintPlanning(idx, 0)
    }

    if (remaining.length === 0 && store.session.currentStep === 'sprint_planning') {
      await triggerSprintGeneration()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, addInteraction, setActiveQuestions, addGlobalDecision, triggerBlueprintGeneration, triggerSprintPlanning, triggerSprintGeneration, triggerPartialParagraphGeneration, runInconsistencyCheck, inconsistencyWarning])

  // ── Sprint approve ───────────────────────────────────────────────────────────
  const handleSprintApprove = useCallback(async () => {
    const store = useDocumentStore.getState()
    const idx = store.session.currentParagraphIndex
    const sprintIdx = store.session.currentSprintIndex
    const para = store.document.paragraphs[idx]
    if (!para) return

    const sprint = para.sprints[sprintIdx]
    if (!sprint) return

    approveSprint(para.id, sprint.id)
    setStep('sprint_approved')

    // Clear stale warnings
    setRetractionWarning(null)
    setConflictHeadsup(null)

    // Reduce frustration on successful sprint approval (positive reinforcement)
    frustrationStateRef.current = reduceFrustrationOnApproval(frustrationStateRef.current)

    const nextSprintIdx = sprintIdx + 1
    if (nextSprintIdx < SPRINTS_PER_PARAGRAPH) {
      // More sprints to write for this paragraph
      setCurrentSprintIndex(nextSprintIdx)
      await triggerSprintPlanning(idx, nextSprintIdx)
    } else {
      // All sprints approved — assemble the paragraph
      await triggerParagraphAssembly()
    }
  }, [approveSprint, setStep, setCurrentSprintIndex, triggerSprintPlanning, triggerParagraphAssembly])

  // ── Sprint revise ────────────────────────────────────────────────────────────
  const handleSprintRevise = useCallback(async (direction: string) => {
    const store = useDocumentStore.getState()
    const idx = store.session.currentParagraphIndex
    const sprintIdx = store.session.currentSprintIndex
    const para = store.document.paragraphs[idx]
    if (!para) return

    const sprint = para.sprints[sprintIdx]
    if (!sprint) return

    setIsLoading(true)
    setLoadingMessage('Revising sprint\u2026')
    setStep('sprint_generating')

    try {
      // Record the revision direction as a decision so the next generation honors it
      addGlobalDecision({
        id: Math.random().toString(36).slice(2, 10),
        category: 'rhetorical_move',
        question: 'Sprint revision direction',
        answer: direction,
        importance: 'high',
        resolved: true,
        locked: false,
        depends_on: [],
        affected_units: [],
      })
      const freshStore = useDocumentStore.getState()
      const result = await apiGenerateSprint(freshStore.session, freshStore.document, idx, sprintIdx)
      setSprintDraft(para.id, sprint.id, result.text)
      setStep('sprint_generated')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sprint revision failed')
      setStep('sprint_generated')
    } finally {
      setIsLoading(false)
      setLoadingMessage('')
    }
  }, [setStep, addGlobalDecision, setSprintDraft, setError])

  // ── Blueprint cancel + advisor ──────────────────────────────────────────────
  const handleBlueprintCancel = useCallback(async () => {
    setIsLoading(true)
    setLoadingMessage('Analysing your blueprint\u2026')

    try {
      const store = useDocumentStore.getState()
      const bp = store.document.blueprint
      if (!bp) return
      const result = await apiAdviseBlueprintChanges(bp, store.session.seedPrompt)
      setAdvisorResult(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get advisor guidance')
    } finally {
      setIsLoading(false)
      setLoadingMessage('')
    }
  }, [setError])

  // ── Blueprint confirm ───────────────────────────────────────────────────────
  const handleBlueprintConfirm = useCallback(async () => {
    setStep('paragraph_planning')
    setIsLoading(true)
    setLoadingMessage('Generating planning questions for paragraph 1\u2026')
    resetParagraphRefs(0)

    try {
      const store = useDocumentStore.getState()
      const questions = await apiGenerateQuestions(
        store.session,
        store.document,
        store.session.currentParagraphIndex
      )
      setActiveQuestions(questions)
      setFocusedParagraphId(store.document.paragraphs[store.session.currentParagraphIndex]?.id ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate planning questions')
    } finally {
      setIsLoading(false)
      setLoadingMessage('')
    }
  }, [setStep, setActiveQuestions, setError])

  // ── Paragraph approve ───────────────────────────────────────────────────────
  const handleApprove = useCallback(async (paragraphId: string) => {
    approveParagraph(paragraphId)
    setStep('paragraph_approved')

    const store = useDocumentStore.getState()
    const nextIdx = store.session.currentParagraphIndex
    const hasMoreParagraphs = nextIdx < (store.document.blueprint?.paragraphRoadmap.length ?? 0)

    if (hasMoreParagraphs) {
      setIsLoading(true)
      setLoadingMessage(`Generating planning questions for paragraph ${nextIdx + 1}\u2026`)
      setStep('paragraph_planning')
      resetParagraphRefs(nextIdx)

      try {
        const questions = await apiGenerateQuestions(
          store.session,
          store.document,
          nextIdx
        )
        setActiveQuestions(questions)
        setFocusedParagraphId(store.document.paragraphs[nextIdx]?.id ?? null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to generate planning questions')
      } finally {
        setIsLoading(false)
        setLoadingMessage('')
      }
    } else {
      // All paragraphs approved — user thinks they're done
      setStep('title_refinement')

      // Show the parody end message
      const store2 = useDocumentStore.getState()
      const totalInteractions = store2.session.interactionHistory.length
      const approvedParas = store2.document.paragraphs.filter(
        (p) => p.status === 'approved' || p.status === 'locked'
      ).length
      setParodyEndMessage(
        `Congratulations. After ${totalInteractions} interactions, ` +
          `${approvedParas} approved paragraphs, and countless revisions \u2014 ` +
          `you've reached the end.\n\n` +
          `Just kidding. Your permission level is ${store2.session.permissionState}. ` +
          `Export requires level 4. The gap between where you are and where you need to be ` +
          `is not a bug. It is the entire point.\n\n` +
          `This was the Impossible Document Generator. ` +
          `No documents were harmed (or generated) in the making of this experience.\n\n` +
          `It was never meant to reach here. Thank you for playing.`
      )
    }
  }, [approveParagraph, setStep, setActiveQuestions, setError])

  // ── Paragraph revise ────────────────────────────────────────────────────────
  const handleRevise = useCallback(async (paragraphId: string, direction: string) => {
    // Read from live store, not stale closure (#7)
    const para = useDocumentStore.getState().document.paragraphs.find((p) => p.id === paragraphId)
    if (!para) return

    setIsLoading(true)
    setLoadingMessage('Revising\u2026')
    setParagraphStatus(paragraphId, 'assembling')

    try {
      const store = useDocumentStore.getState()
      const { revisedText } = await apiReviseParagraph(
        paragraphId,
        para.draftText,
        direction,
        store.document.globalDecisions
      )
      setParagraphDraft(paragraphId, revisedText)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Revision failed')
      setParagraphStatus(paragraphId, 'awaiting_review')
    } finally {
      setIsLoading(false)
      setLoadingMessage('')
    }
  }, [setParagraphStatus, setParagraphDraft, setError])

  // ── Paragraph regenerate ────────────────────────────────────────────────────
  const handleRegenerate = useCallback(async (paragraphId: string) => {
    const para = useDocumentStore.getState().document.paragraphs.find((p) => p.id === paragraphId)
    if (!para) return

    setParagraphStatus(paragraphId, 'assembling')
    setIsLoading(true)
    setLoadingMessage(`Regenerating paragraph ${para.orderIndex + 1}\u2026`)

    try {
      const store = useDocumentStore.getState()
      const text = await apiGenerateParagraph(store.session, store.document, para.orderIndex)
      setParagraphDraft(paragraphId, text)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Regeneration failed')
      setParagraphStatus(paragraphId, 'stale_due_to_upstream_change')
    } finally {
      setIsLoading(false)
      setLoadingMessage('')
    }
  }, [setParagraphStatus, setParagraphDraft, setError])

  // ── Context-aware text input ────────────────────────────────────────────────
  const handleContextSubmit = useCallback(async (text: string) => {
    const store = useDocumentStore.getState()
    const step = store.session.currentStep

    if (step === 'confirming_blueprint' || step === 'clarifying_inconsistency') {
      addInteraction({
        type: 'answer',
        content: text,
        semanticHash: computeSemanticHash(text, 'intent'),
      })
      addGlobalDecision({
        id: Math.random().toString(36).slice(2, 10),
        category: 'intent',
        question: step === 'clarifying_inconsistency'
          ? 'Clarification to resolve inconsistency'
          : 'Blueprint modification request',
        answer: text,
        importance: 'high',
        resolved: true,
        locked: false,
        depends_on: [],
        affected_units: [],
      })
      setInconsistencyWarning(null)
      await triggerBlueprintGeneration()
      return
    }

    // Fix #6: paragraph_generated hasn't incremented the index yet;
    // paragraph_approved HAS (via approveParagraph).
    if (step === 'paragraph_generated') {
      const idx = store.session.currentParagraphIndex
      const para = store.document.paragraphs[idx]
      if (para) {
        await handleRevise(para.id, text)
      }
      return
    }

    if (step === 'paragraph_approved') {
      const idx = store.session.currentParagraphIndex - 1
      const para = store.document.paragraphs[idx]
      if (para) {
        await handleRevise(para.id, text)
      }
      return
    }

    addInteraction({
      type: 'answer',
      content: text,
      semanticHash: computeSemanticHash(text, 'intent'),
    })
  }, [addInteraction, addGlobalDecision, triggerBlueprintGeneration, handleRevise])

  return {
    session,
    document,
    isLoading,
    loadingMessage,
    focusedParagraphId,
    advisorResult,
    setAdvisorResult,
    inconsistencyWarning,
    setInconsistencyWarning,
    orientationPreview,
    fatigueAcknowledgment,
    setFatigueAcknowledgment,
    retractionWarning,
    setRetractionWarning,
    deletionNotice,
    setDeletionNotice,
    sorryMessage,
    setSorryMessage,
    conflictHeadsup,
    setConflictHeadsup,
    parodyEndMessage,
    handleSeedSubmit,
    handleAnswer,
    handleBlueprintCancel,
    handleBlueprintConfirm,
    handleApprove,
    handleRevise,
    handleRegenerate,
    handleContextSubmit,
    handleSprintApprove,
    handleSprintRevise,
  }
}
