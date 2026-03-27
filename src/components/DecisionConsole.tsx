'use client'

import { useState, useRef } from 'react'
import type { WritingSession, DocumentState } from '@/lib/types'
import type { BlueprintAdvisorResult } from '@/lib/agents/blueprint-advisor'
import type { InconsistencyResult } from '@/lib/agents/inconsistency-detector'
import { QuestionCard } from './QuestionCard'
import { stepLabel } from '@/lib/engine/flow-stages'
import { interceptJailbreak } from '@/lib/engine/jailbreak-interceptor'
import { useAnimatedText } from '@/hooks/useAnimatedText'
import { Send, AlertCircle, ChevronDown, ChevronUp, X, Check } from 'lucide-react'

interface DecisionConsoleProps {
  session: WritingSession
  document: DocumentState
  onSeedSubmit: (prompt: string) => void
  onAnswer: (questionId: string, answer: string, category: string) => void
  onBlueprintConfirm: () => void
  onBlueprintCancel: () => void
  onContextSubmit: (text: string) => void
  onReset: () => void
  advisorResult: BlueprintAdvisorResult | null
  onAdvisorDismiss: () => void
  inconsistencyWarning: InconsistencyResult | null
  onInconsistencyDismiss: () => void
  onResolveByRollback: () => void
  sprintDraft: string | null
  currentSprintIndex: number
  totalSprints: number
  onSprintApprove: () => void
  onSprintRevise: (direction: string) => void
  isLoading: boolean
  loadingMessage: string
}

export function DecisionConsole({
  session,
  document,
  onSeedSubmit,
  onAnswer,
  onBlueprintConfirm,
  onBlueprintCancel,
  onContextSubmit,
  onReset,
  advisorResult,
  onAdvisorDismiss,
  inconsistencyWarning,
  onInconsistencyDismiss,
  onResolveByRollback,
  sprintDraft,
  currentSprintIndex,
  totalSprints,
  onSprintApprove,
  onSprintRevise,
  isLoading,
  loadingMessage,
}: DecisionConsoleProps) {
  const [inputValue, setInputValue] = useState('')
  const [sprintReviseValue, setSprintReviseValue] = useState('')
  const [historyExpanded, setHistoryExpanded] = useState(false)
  const [jailbreakWarning, setJailbreakWarning] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { currentStep, activeQuestions, fatigueScore, interactionHistory, error } = session
  const isIdle = currentStep === 'idle'

  // Animate sprint draft text — only when sprint is generated
  const sprintTextToAnimate = currentStep === 'sprint_generated' ? (sprintDraft ?? '') : ''
  const animatedSprintDraft = useAnimatedText(sprintTextToAnimate, {
    charDelay: 28,
    deleteDelay: 12,
  })

  const handleInputSubmit = () => {
    const trimmed = inputValue.trim()
    if (!trimmed) return

    // Jailbreak check on any free-text input
    const check = interceptJailbreak(trimmed)
    if (check.intercepted) {
      setJailbreakWarning(check.suggestedResponse ?? 'That action is not available here.')
      setInputValue('')
      return
    }

    setJailbreakWarning(null)
    if (isIdle) {
      onSeedSubmit(trimmed)
    } else {
      onContextSubmit(trimmed)
    }
    setInputValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleInputSubmit()
    }
  }

  const recentHistory = interactionHistory.slice(-10).reverse()

  return (
    <div className="flex h-full flex-col bg-zinc-50 dark:bg-zinc-900">
      {/* Stage indicator */}
      <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Console
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onReset}
              className="rounded-full border border-zinc-300 px-2.5 py-0.5 text-xs font-medium text-zinc-600 hover:border-red-400 hover:text-red-500 dark:border-zinc-600 dark:text-zinc-300 dark:hover:border-red-500 dark:hover:text-red-400 transition-colors"
            >
              Start new
            </button>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
              {stepLabel(currentStep)}
            </span>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Error state */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
            <div className="flex items-start gap-2">
              <AlertCircle size={14} className="mt-0.5 text-red-500 shrink-0" />
              <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Inconsistency warning */}
        {inconsistencyWarning && inconsistencyWarning.hasInconsistency && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950">
            <div className="mb-2 flex items-start justify-between gap-2">
              <p className="text-xs font-bold text-orange-800 dark:text-orange-200">
                You&apos;re a bit confused here
              </p>
              <button onClick={onInconsistencyDismiss} className="shrink-0 text-orange-400 hover:text-orange-600">
                <X size={14} />
              </button>
            </div>
            <p className="mb-4 text-xs text-orange-700 dark:text-orange-300 leading-relaxed">
              {inconsistencyWarning.summary}
            </p>
            <p className="mb-4 text-xs font-semibold text-orange-800 dark:text-orange-400">
              Focus on this: {inconsistencyWarning.suggestedFocus}
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={onResolveByRollback}
                className="rounded-full bg-orange-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-orange-600 transition-colors self-start"
              >
                Rollback this Sprint & Try Again
              </button>
              <p className="text-[10px] text-orange-500/80 dark:text-orange-400/80">
                Or type a manual clarification below to override this warning.
              </p>
            </div>
          </div>
        )}

        {/* Jailbreak intercept warning */}
        {jailbreakWarning && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
            <p className="mb-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
              That approach isn&apos;t available
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">{jailbreakWarning}</p>
            <button
              onClick={() => setJailbreakWarning(null)}
              className="mt-2 text-xs text-amber-500 underline"
            >
              Got it
            </button>
          </div>
        )}

        {/* Sprint context banner */}
        {(currentStep === 'sprint_planning' || currentStep === 'sprint_generating' || currentStep === 'sprint_generated') && (
          <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 dark:border-violet-800 dark:bg-violet-950/40">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">
                Sprint {currentSprintIndex + 1} of {totalSprints}
              </span>
              <span className="text-[10px] text-violet-500 dark:text-violet-400">
                {currentStep === 'sprint_planning' ? 'answering questions' : currentStep === 'sprint_generating' ? 'writing…' : 'ready to review'}
              </span>
            </div>
          </div>
        )}

        {/* Sprint draft — approve or revise */}
        {currentStep === 'sprint_generated' && sprintDraft && !isLoading && (
          <div className="rounded-lg border border-violet-200 bg-white p-4 shadow-sm dark:border-violet-700 dark:bg-zinc-900">
            <p className="mb-3 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
              {animatedSprintDraft}
              {animatedSprintDraft !== sprintDraft && (
                <span className="animate-pulse text-violet-400">▌</span>
              )}
            </p>
            <div className="mb-3 flex gap-2">
              <button
                onClick={onSprintApprove}
                className="flex items-center gap-1.5 rounded-full bg-violet-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-violet-600 transition-colors"
              >
                <Check size={12} />
                Approve Sprint
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={sprintReviseValue}
                onChange={(e) => setSprintReviseValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && sprintReviseValue.trim()) {
                    onSprintRevise(sprintReviseValue.trim())
                    setSprintReviseValue('')
                  }
                }}
                placeholder="Give a revision direction and press Enter…"
                className="flex-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
            {loadingMessage}
          </div>
        )}

        {/* Paragraph planning context banner */}
        {currentStep === 'paragraph_planning' && !isLoading && (
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2 dark:border-indigo-900 dark:bg-indigo-950/30">
            <span className="text-xs text-indigo-600 dark:text-indigo-400">
              Setting the direction for Paragraph {session.currentParagraphIndex + 1}
            </span>
          </div>
        )}

        {/* Idle: seed prompt */}
        {isIdle && !isLoading && (
          <div>
            <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              What do you want to write about?
            </p>
            <p className="mb-4 text-xs text-zinc-500">
              Give me a topic, question, or rough idea. I&apos;ll ask you the right questions to
              build something worth reading.
            </p>
          </div>
        )}

        {/* Blueprint confirmation */}
        {currentStep === 'confirming_blueprint' && document.blueprint && !isLoading && !advisorResult && (
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
            <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Blueprint Ready
            </h3>
            <p className="mb-1 text-xs text-zinc-500">
              <strong>Title:</strong> {document.blueprint.selectedTitle}
            </p>
            <p className="mb-1 text-xs text-zinc-500">
              <strong>Thesis:</strong> {document.blueprint.thesis}
            </p>
            <p className="mb-3 text-xs text-zinc-500">
              <strong>Structure:</strong> {document.blueprint.structureMap}
            </p>
            <div className="flex gap-2">
              <button
                onClick={onBlueprintConfirm}
                className="rounded-full bg-indigo-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-600"
              >
                Confirm & Start Writing
              </button>
              <button
                onClick={onBlueprintCancel}
                className="rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-medium text-zinc-600 hover:border-zinc-400 hover:text-zinc-800 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-zinc-400 dark:hover:text-zinc-200"
              >
                Want changes
              </button>
            </div>
          </div>
        )}

        {/* Advisor result */}
        {advisorResult && !isLoading && (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-800 dark:bg-indigo-950">
            <div className="mb-3 flex items-start justify-between gap-2">
              <p className="text-xs text-indigo-800 dark:text-indigo-200">{advisorResult.intro}</p>
              <button onClick={onAdvisorDismiss} className="shrink-0 text-indigo-400 hover:text-indigo-600">
                <X size={14} />
              </button>
            </div>
            <div className="mb-3 space-y-2">
              {advisorResult.suggestions.map((s, i) => (
                <div key={i} className="rounded border border-indigo-100 bg-white p-2 dark:border-indigo-900 dark:bg-zinc-900">
                  <p className="mb-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300">{s.aspect}</p>
                  <p className="text-xs text-zinc-500"><strong>Now:</strong> {s.current}</p>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400"><strong>To change:</strong> {s.howToChange}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-indigo-700 dark:text-indigo-300">{advisorResult.closingPrompt}</p>
          </div>
        )}

        {/* Active question cards — one at a time */}
        {activeQuestions.length > 0 && !isLoading && (
          <QuestionCard
            key={activeQuestions[0].id}
            card={activeQuestions[0]}
            onAnswer={onAnswer}
            isActive={true}
            fatigueScore={fatigueScore}
          />
        )}

        {/* Interaction history */}
        {recentHistory.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setHistoryExpanded((v) => !v)}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              {historyExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {historyExpanded ? 'Hide' : 'Show'} history ({interactionHistory.length} interactions)
            </button>
            {historyExpanded && (
              <div className="mt-2 space-y-1">
                {recentHistory.map((node) => (
                  <div key={node.id} className="text-xs">
                    <span className="font-medium text-zinc-500">{node.type}: </span>
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {node.content.slice(0, 80)}{node.content.length > 80 ? '…' : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input box */}
      <div className="border-t border-zinc-200 p-4 dark:border-zinc-700">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isIdle
                ? 'Enter your topic or idea…'
                : currentStep === 'confirming_blueprint'
                ? 'Request changes to the blueprint…'
                : currentStep === 'paragraph_generated' || currentStep === 'paragraph_approved'
                ? 'Give revision direction for this paragraph…'
                : 'Type a custom answer or note…'
            }
            rows={2}
            className="flex-1 resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />
          <button
            onClick={handleInputSubmit}
            disabled={!inputValue.trim() || isLoading}
            className="self-end rounded-lg bg-indigo-500 p-2 text-white hover:bg-indigo-600 disabled:opacity-40"
          >
            <Send size={16} />
          </button>
        </div>
        {fatigueScore >= 70 && (
          <p className="mt-1 text-xs text-amber-500">
            Tip: Say &ldquo;pick for me&rdquo; to let me decide non-critical choices.
          </p>
        )}
      </div>
    </div>
  )
}
