import { Lock, RefreshCw, AlertTriangle, CheckCircle, Package } from 'lucide-react'
import { useAnimatedText } from '@/hooks/useAnimatedText'
import type { ParagraphState } from '@/lib/types'
import { SprintBlock } from './SprintBlock'

interface ParagraphBlockProps {
  paragraph: ParagraphState
  isFocused: boolean
  activeSprintId: string | null
  onApprove: (id: string) => void
  onRevise: (id: string, direction: string) => void
  onRegenerate: (id: string) => void
  onAssemble: (id: string) => void
  onApproveSprint: (paragraphId: string, sprintId: string) => void
  onRollbackSprint: (paragraphId: string, sprintId: string) => void
}

export function ParagraphBlock({
  paragraph,
  isFocused,
  activeSprintId,
  onApprove,
  onRevise,
  onRegenerate,
  onAssemble,
  onApproveSprint,
  onRollbackSprint,
}: ParagraphBlockProps) {
  const { id, orderIndex, status, draftText, approvedText, sprints } = paragraph

  // Animate draft text — only when the paragraph is actively being reviewed
  const paragraphTextToAnimate = (status === 'awaiting_review' || status === 'assembling') ? draftText : ''
  const animatedDraftText = useAnimatedText(paragraphTextToAnimate, {
    charDelay: 22,
    deleteDelay: 10,
  })

  const focusRing = isFocused ? 'ring-2 ring-indigo-400 ring-offset-2' : ''

  if (status === 'placeholder') {
    return (
      <div className={`rounded-lg border-2 border-dashed border-zinc-200 p-4 dark:border-zinc-700 ${focusRing}`}>
        <div className="space-y-2">
          <div className="h-3 w-3/4 rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-3 w-full rounded bg-zinc-100 dark:bg-zinc-800" />
        </div>
        <p className="mt-2 text-xs text-zinc-400">Paragraph {orderIndex + 1} — not started</p>
      </div>
    )
  }

  if (status === 'planning_intent') {
    return (
      <div className={`rounded-lg border border-zinc-200 p-4 dark:border-zinc-700 ${focusRing}`}>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
          <span className="text-xs text-zinc-500">Defining intent for paragraph {orderIndex + 1}…</span>
        </div>
        <div className="mt-2 space-y-2 animate-pulse">
          <div className="h-3 w-3/4 rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-3 w-full rounded bg-zinc-100 dark:bg-zinc-800" />
        </div>
      </div>
    )
  }

  if (status === 'gathering_sprints') {
    const allApproved = sprints.length > 0 && sprints.every(s => s.status === 'approved')
    
    return (
      <div className={`rounded-lg border border-zinc-200 p-4 dark:border-zinc-700 ${focusRing}`}>
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Paragraph {orderIndex + 1} Sprints</span>
          {allApproved && (
            <button 
              onClick={() => onAssemble(id)}
              className="flex items-center gap-1 rounded-full bg-indigo-500 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-600 transition-colors shadow-sm"
            >
              <Package size={12} /> Wrap into Paragraph
            </button>
          )}
        </div>
        <div className="space-y-4">
          {sprints.map(sprint => (
            <SprintBlock 
              key={sprint.id}
              paragraphId={id}
              sprint={sprint}
              isFocused={sprint.id === activeSprintId}
              onApprove={onApproveSprint}
              onRollback={onRollbackSprint}
            />
          ))}
          {/* If no sprints yet, show a starting indicator */}
          {sprints.length === 0 && (
             <div className="py-4 text-center">
                <p className="text-xs text-zinc-400 italic">Starting first sprint...</p>
             </div>
          )}
        </div>
      </div>
    )
  }

  if (status === 'assembling') {
    return (
      <div className={`rounded-lg border border-indigo-200 bg-indigo-50/20 p-6 text-center dark:border-indigo-900 dark:bg-indigo-950/20 ${focusRing}`}>
        <RefreshCw size={24} className="mx-auto mb-3 animate-spin text-indigo-400" />
        <h4 className="text-sm font-medium text-indigo-900 dark:text-indigo-100">Assembling Paragraph…</h4>
        <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400">Synthesizing sprints into a single cohesive unit.</p>
      </div>
    )
  }

  if (status === 'awaiting_review') {
    return (
      <div className={`rounded-lg border border-indigo-300 bg-indigo-50 p-4 dark:border-indigo-700 dark:bg-indigo-950 ${focusRing}`}>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
            Paragraph {orderIndex + 1} — awaiting your review
          </span>
        </div>
        <p className="mb-3 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
          {animatedDraftText}
          {animatedDraftText !== draftText && (
            <span className="animate-pulse text-indigo-400">▌</span>
          )}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => onApprove(id)}
            className="flex items-center gap-1 rounded-full bg-green-500 px-3 py-1 text-xs font-medium text-white hover:bg-green-600"
          >
            <CheckCircle size={12} /> Approve Paragraph
          </button>
          <button
            onClick={() => {
              const direction = window.prompt('Revision direction:')
              if (direction) onRevise(id, direction)
            }}
            className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Revise
          </button>
        </div>
      </div>
    )
  }

  if (status === 'approved' || status === 'locked') {
    return (
      <div className={`group rounded-lg border border-zinc-200 p-4 dark:border-zinc-700 ${focusRing}`}>
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs text-zinc-400">Paragraph {orderIndex + 1}</span>
          {status === 'locked' && <Lock size={12} className="text-zinc-400" />}
        </div>
        <p className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">{approvedText}</p>
      </div>
    )
  }

  if (status === 'stale_due_to_upstream_change') {
    return (
      <div className={`rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950 ${focusRing}`}>
        <div className="mb-2 flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-500" />
          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
            Paragraph {orderIndex + 1} — stale (upstream decision changed)
          </span>
        </div>
        <p className="mb-2 text-sm leading-relaxed text-zinc-500 line-through dark:text-zinc-500">
          {approvedText}
        </p>
        <button
          onClick={() => onRegenerate(id)}
          className="flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-xs font-medium text-white hover:bg-amber-600"
        >
          <RefreshCw size={12} /> Regenerate
        </button>
      </div>
    )
  }

  return null
}
