import { useState, useEffect, useRef } from 'react'

interface UseAnimatedTextOptions {
  charDelay?: number   // ms per character when typing (default: 28ms)
  deleteDelay?: number // ms per character when deleting (default: 12ms)
}

/**
 * Animates text character-by-character using requestAnimationFrame.
 * - Typing: characters appear one by one
 * - Deletion: characters disappear one by one (then new text types in)
 * - Uses rAF for efficiency (~60 renders/sec, not 1 per character)
 * - Handles React Strict Mode double-effect correctly
 */
export function useAnimatedText(targetText: string, options: UseAnimatedTextOptions = {}) {
  const { charDelay = 28, deleteDelay = 12 } = options
  const [displayedText, setDisplayedText] = useState('')
  const rafId = useRef<number | null>(null)
  // Track the previous target to know what we're animating FROM.
  // Use a separate ref that is ONLY written after animation completes,
  // so Strict Mode double-fire doesn't corrupt it.
  const completedTarget = useRef('')

  useEffect(() => {
    // Cancel any running animation
    if (rafId.current !== null) {
      cancelAnimationFrame(rafId.current)
      rafId.current = null
    }

    // What was last fully rendered?
    const sourceText = completedTarget.current

    // Nothing to do
    if (targetText === sourceText) return

    // Empty target — snap to empty
    if (targetText === '') {
      completedTarget.current = ''
      setDisplayedText('')
      return
    }

    // Find the longest common prefix between source and target
    let commonLen = 0
    while (
      commonLen < sourceText.length &&
      commonLen < targetText.length &&
      sourceText[commonLen] === targetText[commonLen]
    ) {
      commonLen++
    }

    // Freeze values for the animation closure
    const frozenSource = sourceText
    const frozenTarget = targetText
    const deleteCount = frozenSource.length - commonLen

    let startTime: number | null = null
    let phase: 'deleting' | 'typing' = deleteCount > 0 ? 'deleting' : 'typing'
    let phaseStartTime: number | null = null

    const frame = (timestamp: number) => {
      if (startTime === null) startTime = timestamp
      if (phaseStartTime === null) phaseStartTime = timestamp
      const phaseElapsed = timestamp - phaseStartTime

      if (phase === 'deleting') {
        const charsDeleted = Math.floor(phaseElapsed / deleteDelay)
        const currentLen = Math.max(commonLen, frozenSource.length - charsDeleted)
        setDisplayedText(frozenSource.slice(0, currentLen))

        if (currentLen <= commonLen) {
          // Done deleting — switch to typing
          phase = 'typing'
          phaseStartTime = null // reset for next phase
          rafId.current = requestAnimationFrame(frame)
        } else {
          rafId.current = requestAnimationFrame(frame)
        }
      } else {
        const charsTyped = Math.floor(phaseElapsed / charDelay)
        const currentLen = Math.min(frozenTarget.length, commonLen + charsTyped)
        setDisplayedText(frozenTarget.slice(0, currentLen))

        if (currentLen < frozenTarget.length) {
          rafId.current = requestAnimationFrame(frame)
        } else {
          // Animation complete — mark this target as fully rendered
          completedTarget.current = frozenTarget
        }
      }
    }

    rafId.current = requestAnimationFrame(frame)

    return () => {
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current)
        rafId.current = null
      }
      // Do NOT update completedTarget here — that's the Strict Mode fix.
      // completedTarget only updates when animation actually finishes.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetText])

  return displayedText
}
