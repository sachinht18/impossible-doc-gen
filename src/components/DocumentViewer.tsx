'use client'

import type { DocumentState, WritingSession } from '@/lib/types'
import { ParagraphBlock } from './ParagraphBlock'
import { useAnimatedText } from '@/hooks/useAnimatedText'
import { FileText } from 'lucide-react'

interface DocumentViewerProps {
  document: DocumentState
  session: WritingSession
  focusedParagraphId: string | null
  orientationPreview: string | null
  onApprove: (id: string) => void
  onRevise: (id: string, direction: string) => void
  onRegenerate: (id: string) => void
  onAssemble: (id: string) => void
  onApproveSprint: (paragraphId: string, sprintId: string) => void
  onRollbackSprint: (paragraphId: string, sprintId: string) => void
  activeSprintId: string | null
}

export function DocumentViewer({
  document,
  session,
  focusedParagraphId,
  orientationPreview,
  onApprove,
  onRevise,
  onRegenerate,
  onAssemble,
  onApproveSprint,
  onRollbackSprint,
  activeSprintId,
}: DocumentViewerProps) {
  const { blueprint, paragraphs } = document
  const animatedPreview = useAnimatedText(orientationPreview ?? '', { charDelay: 28, deleteDelay: 12 })
  const title = blueprint?.selectedTitle ?? 'Untitled Document'
  const thesis = blueprint?.thesis
  const structureMap = blueprint?.structureMap

  // Group paragraphs by section
  const sections = blueprint?.sectionPlan ?? []
  const sectionGroups = sections.reduce(
    (acc, section) => {
      const end = acc.cursor + section.paragraphCount
      return {
        cursor: end,
        groups: [
          ...acc.groups,
          {
            section,
            sectionParagraphs: paragraphs.slice(acc.cursor, end),
          },
        ],
      }
    },
    {
      cursor: 0,
      groups: [] as Array<{
        section: (typeof sections)[number]
        sectionParagraphs: typeof paragraphs
      }>,
    }
  ).groups

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-white px-8 py-8 dark:bg-zinc-950">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <FileText size={16} className="text-zinc-400" />
          <span className="text-xs font-medium uppercase tracking-widest text-zinc-400">
            Document
          </span>
        </div>

        <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
        </h1>

        {thesis && (
          <p className="mb-2 text-sm italic text-zinc-500 dark:text-zinc-400">{thesis}</p>
        )}

        {structureMap && (
          <div className="flex flex-wrap items-center gap-1">
            {structureMap.split('→').map((part, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span className="text-zinc-300 dark:text-zinc-600">→</span>}
                <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {part.trim()}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Metadata badges */}
      {blueprint && (
        <div className="mb-6 flex flex-wrap gap-2">
          <Badge label="Tone" value={blueprint.toneProfile.split(',')[0]} />
        </div>
      )}

      {/* No blueprint yet — idle */}
      {!blueprint && session.currentStep === 'idle' && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-3 text-4xl">✍️</div>
          <p className="text-sm text-zinc-500">
            Start by entering your topic on the right. I&apos;ll ask you the right questions to
            build something precise.
          </p>
        </div>
      )}

      {/* Orientation preview — live draft before blueprint exists */}
      {!blueprint && orientationPreview && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-indigo-400" />
            <span className="text-xs text-zinc-400">Early draft — updating as you answer…</span>
          </div>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
            {animatedPreview}
            {animatedPreview !== orientationPreview && (
              <span className="animate-pulse text-indigo-400">▌</span>
            )}
          </p>
        </div>
      )}

      {/* Paragraphs by section */}
      {sections.length > 0 ? (
        <div className="space-y-8">
          {sectionGroups.map(({ section, sectionParagraphs }, sectionIdx) => {
            return (
              <div key={sectionIdx}>
                <div className="mb-3 flex items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                    {section.title}
                  </span>
                  <div className="flex-1 border-t border-zinc-100 dark:border-zinc-800" />
                  <span className="text-xs text-zinc-300 dark:text-zinc-600">{section.role}</span>
                </div>
                <div className="space-y-3">
                  {sectionParagraphs.map((para) => (
                    <ParagraphBlock
                      key={para.id}
                      paragraph={para}
                      isFocused={para.id === focusedParagraphId}
                      activeSprintId={activeSprintId}
                      onApprove={onApprove}
                      onRevise={onRevise}
                      onRegenerate={onRegenerate}
                      onAssemble={onAssemble}
                      onApproveSprint={onApproveSprint}
                      onRollbackSprint={onRollbackSprint}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {paragraphs.map((para) => (
            <ParagraphBlock
              key={para.id}
              paragraph={para}
              isFocused={para.id === focusedParagraphId}
              activeSprintId={activeSprintId}
              onApprove={onApprove}
              onRevise={onRevise}
              onRegenerate={onRegenerate}
              onAssemble={onAssemble}
              onApproveSprint={onApproveSprint}
              onRollbackSprint={onRollbackSprint}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-zinc-200 px-2 py-0.5 dark:border-zinc-700">
      <span className="text-xs text-zinc-400">{label}:</span>
      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{value}</span>
    </div>
  )
}
