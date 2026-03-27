'use client'

import { CheckCircle, RefreshCw } from 'lucide-react'
import type { SprintState } from '@/lib/types'

interface SprintBlockProps {
  paragraphId: string
  sprint: SprintState
  isFocused: boolean
  onApprove: (paragraphId: string, sprintId: string) => void
  onRollback: (paragraphId: string, sprintId: string) => void
}

export function SprintBlock({
  paragraphId,
  sprint,
  isFocused,
  onApprove,
  onRollback,
}: SprintBlockProps) {
  const { id, orderIndex, status, draftText, approvedText } = sprint

  const focusRing = isFocused ? 'ring-2 ring-indigo-400 ring-offset-1' : ''

  if (status === 'placeholder') {
    return (
      <div className={`rounded border border-dashed border-zinc-200 p-3 dark:border-zinc-700 ${focusRing}`}>
        <div className="space-y-1">
          <div className="h-2 w-3/4 rounded bg-zinc-50 dark:bg-zinc-800" />
          <div className="h-2 w-full rounded bg-zinc-50 dark:bg-zinc-800" />
        </div>
        <p className="mt-1 text-[10px] text-zinc-400 uppercase tracking-tighter">Sprint {orderIndex + 1}</p>
      </div>
    )
  }

  if (status === 'planning' || (status === 'draft' && !draftText)) {
    return (
      <div className={`rounded border border-zinc-200 p-3 dark:border-zinc-700 ${focusRing}`}>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 animate-spin rounded-full border border-indigo-400 border-t-transparent" />
          <span className="text-[10px] text-zinc-500 uppercase">Sprint {orderIndex + 1} Planning…</span>
        </div>
        <div className="mt-2 space-y-1 animate-pulse">
          <div className="h-2 w-full rounded bg-zinc-50 dark:bg-zinc-800" />
          <div className="h-2 w-5/6 rounded bg-zinc-50 dark:bg-zinc-800" />
        </div>
      </div>
    )
  }

  if (status === 'draft' && draftText) {
    return (
      <div className={`rounded border border-indigo-200 bg-indigo-50/30 p-3 dark:border-indigo-800 dark:bg-indigo-950/20 ${focusRing}`}>
        <div className="mb-1 flex items-center gap-2">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400" />
          <span className="text-[10px] text-zinc-400 uppercase">Sprint {orderIndex + 1} Preview</span>
        </div>
        <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">{draftText}</p>
      </div>
    )
  }

  if (status === 'awaiting_review') {
    return (
      <div className={`rounded border border-indigo-300 bg-indigo-50 p-3 dark:border-indigo-700 dark:bg-indigo-950 ${focusRing}`}>
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
            Sprint {orderIndex + 1} Review
          </span>
        </div>
        <p className="mb-2 text-xs leading-relaxed text-zinc-800 dark:text-zinc-200">{draftText}</p>
        <div className="flex gap-2">
          <button
            onClick={() => onApprove(paragraphId, id)}
            className="flex items-center gap-1 rounded bg-green-500 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-green-600"
          >
            <CheckCircle size={10} /> Approve Sprint
          </button>
        </div>
      </div>
    )
  }

  if (status === 'approved') {
    return (
      <div className={` group relative rounded border border-transparent p-1 hover:border-zinc-100 dark:hover:border-zinc-800 ${focusRing}`}>
        <p className="text-xs leading-relaxed text-zinc-800 dark:text-zinc-200">{approvedText}</p>
        <div className="absolute -right-2 top-0 hidden group-hover:block">
           <div className="flex gap-1 bg-white p-1 rounded border shadow-sm dark:bg-zinc-900 dark:border-zinc-700">
               <button onClick={() => onRollback(paragraphId, id)} title="Rollback Sprint">
                    <RefreshCw size={10} className="text-zinc-400 hover:text-indigo-400" />
               </button>
           </div>
        </div>
      </div>
    )
  }

  return null
}
