'use client'

import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels'
import { DocumentViewer } from '@/components/DocumentViewer'
import { DecisionConsole } from '@/components/DecisionConsole'
import { useDocumentGeneration } from '@/hooks/useDocumentGeneration'
import { useDocumentStore } from '@/lib/stores/useDocumentStore'
import { SPRINTS_PER_PARAGRAPH } from '@/lib/agents/question-generator'

export default function Home() {
  const { resetStore, rollbackSprint } = useDocumentStore()
  const {
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
  } = useDocumentGeneration()

  // Get current sprint draft for display in console
  const currentPara = document.paragraphs[session.currentParagraphIndex]
  const currentSprintDraft = currentPara?.sprints[session.currentSprintIndex]?.draftText ?? null

  const handleRollbackSprint = () => {
    setInconsistencyWarning(null)
    const activePara = document.paragraphs[session.currentParagraphIndex]
    if (!activePara) return
    const activeSprint = activePara.sprints[session.currentSprintIndex]
    if (!activeSprint) return
    rollbackSprint(activePara.id, activeSprint.id)
  }

  return (
    <div className="h-screen bg-white dark:bg-zinc-950">
      <PanelGroup orientation="horizontal" className="h-full">
        {/* Document Viewer — 70% */}
        <Panel defaultSize={70} minSize={40}>
          <DocumentViewer
            document={document}
            session={session}
            focusedParagraphId={focusedParagraphId}
            orientationPreview={orientationPreview}
            onApprove={handleApprove}
            onRevise={handleRevise}
            onRegenerate={handleRegenerate}
            onAssemble={() => {}} // assembly is automatic after all sprints approved
            onApproveSprint={() => {}} // sprint approval handled in console
            onRollbackSprint={rollbackSprint}
            activeSprintId={currentPara?.sprints[session.currentSprintIndex]?.id ?? null}
          />
        </Panel>

        <PanelResizeHandle className="w-1 cursor-col-resize bg-zinc-200 hover:bg-indigo-300 transition-colors dark:bg-zinc-700 dark:hover:bg-indigo-600" />

        {/* Decision Console — 30% */}
        <Panel defaultSize={30} minSize={20}>
          <DecisionConsole
            session={session}
            document={document}
            onSeedSubmit={handleSeedSubmit}
            onAnswer={handleAnswer}
            onBlueprintConfirm={handleBlueprintConfirm}
            onBlueprintCancel={handleBlueprintCancel}
            onContextSubmit={handleContextSubmit}
            onReset={resetStore}
            advisorResult={advisorResult}
            onAdvisorDismiss={() => setAdvisorResult(null)}
            inconsistencyWarning={inconsistencyWarning}
            onInconsistencyDismiss={() => setInconsistencyWarning(null)}
            onResolveByRollback={handleRollbackSprint}
            sprintDraft={currentSprintDraft}
            currentSprintIndex={session.currentSprintIndex}
            totalSprints={SPRINTS_PER_PARAGRAPH}
            onSprintApprove={handleSprintApprove}
            onSprintRevise={handleSprintRevise}
            isLoading={isLoading}
            loadingMessage={loadingMessage}
          />
        </Panel>
      </PanelGroup>
    </div>
  )
}
