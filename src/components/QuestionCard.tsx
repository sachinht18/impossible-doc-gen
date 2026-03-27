'use client'

import { useState } from 'react'
import type { QuestionCard as QuestionCardType } from '@/lib/types'

interface QuestionCardProps {
  card: QuestionCardType
  onAnswer: (questionId: string, answer: string, category: string) => void
  isActive: boolean
  fatigueScore: number
}

export function QuestionCard({ card, onAnswer, isActive, fatigueScore }: QuestionCardProps) {
  const [customValue, setCustomValue] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [freetextValue, setFreetextValue] = useState('')

  if (!isActive) return null

  const isFreetext = card.inputType === 'freetext' || card.options.length === 0

  const handleOption = (label: string) => {
    setSelected(label)
    onAnswer(card.id, label, card.category)
  }

  const handleCustomSubmit = () => {
    if (customValue.trim()) {
      onAnswer(card.id, customValue.trim(), card.category)
      setCustomValue('')
      setShowCustom(false)
    }
  }

  const handleFreetextSubmit = () => {
    if (freetextValue.trim()) {
      onAnswer(card.id, freetextValue.trim(), card.category)
      setFreetextValue('')
    }
  }

  const handlePickForMe = () => {
    const firstOption = card.options[0]
    if (firstOption) {
      setSelected(`[Pick for me] ${firstOption.label}`)
      onAnswer(card.id, `pick for me → ${firstOption.label}`, card.category)
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-1 flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          card.questionScope === 'sprint'
            ? 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300'
            : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
        }`}>
          {card.category.replace('_', ' ')}
        </span>
        {isFreetext && (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            open
          </span>
        )}
      </div>

      <p className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {card.question}
      </p>
      <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">{card.helperText}</p>

      {isFreetext ? (
        /* ── Freetext mode: plain text input ── */
        <div className="flex flex-col gap-2">
          <textarea
            value={freetextValue}
            onChange={(e) => setFreetextValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleFreetextSubmit()
              }
            }}
            placeholder="Type your answer… (Enter to submit, Shift+Enter for newline)"
            rows={3}
            className="w-full resize-none rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            autoFocus
          />
          <button
            onClick={handleFreetextSubmit}
            disabled={!freetextValue.trim()}
            className="self-start rounded-full bg-indigo-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-600 disabled:opacity-40"
          >
            Submit
          </button>
        </div>
      ) : (
        /* ── Choice mode: option chips ── */
        <>
          <div className="flex flex-wrap gap-2">
            {card.options.map((opt) => (
              <button
                key={opt.label}
                onClick={() => handleOption(opt.label)}
                title={opt.consequence}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  selected === opt.label
                    ? 'border-indigo-500 bg-indigo-500 text-white'
                    : 'border-zinc-300 bg-white text-zinc-700 hover:border-indigo-400 hover:bg-indigo-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                }`}
              >
                {opt.label}
              </button>
            ))}

            {card.allowCustom && (
              <button
                onClick={() => setShowCustom((v) => !v)}
                className="rounded-full border border-dashed border-zinc-400 px-3 py-1 text-xs text-zinc-500 hover:border-zinc-600 dark:text-zinc-400"
              >
                Other…
              </button>
            )}
          </div>

          {showCustom && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
                placeholder="Type your answer..."
                className="flex-1 rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
                autoFocus
              />
              <button
                onClick={handleCustomSubmit}
                className="rounded bg-indigo-500 px-3 py-1 text-xs text-white hover:bg-indigo-600"
              >
                OK
              </button>
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <button
              onClick={handlePickForMe}
              className="text-xs text-zinc-400 hover:text-indigo-500 dark:hover:text-indigo-400"
            >
              Pick for me
            </button>
            {fatigueScore >= 50 && (
              <span className="text-xs text-amber-500">
                (strong recommendation leading)
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}
