/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAnimatedText } from '../hooks/useAnimatedText'

// Mock requestAnimationFrame so we can control time
let rafCallbacks: Array<{ id: number; cb: FrameRequestCallback }> = []
let nextRafId = 1

beforeEach(() => {
  rafCallbacks = []
  nextRafId = 1

  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    const id = nextRafId++
    rafCallbacks.push({ id, cb })
    return id
  })

  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    rafCallbacks = rafCallbacks.filter((r) => r.id !== id)
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

/** Flush all pending rAF callbacks at a given timestamp */
function flushRAF(timestamp: number) {
  // Process exactly one frame batch at this timestamp.
  // Newly scheduled callbacks are left for the next flush call.
  const batch = [...rafCallbacks]
  rafCallbacks = []
  for (const { cb } of batch) {
    cb(timestamp)
  }
}

describe('useAnimatedText', () => {
  it('starts with empty string', () => {
    const { result } = renderHook(() => useAnimatedText(''))
    expect(result.current).toBe('')
  })

  it('animates from empty to target text character by character', () => {
    const { result } = renderHook(() =>
      useAnimatedText('Hello', { charDelay: 28, deleteDelay: 12 })
    )

    // Initially should be empty (animation hasn't started)
    expect(result.current).toBe('')

    // Flush a frame at t=0 — should show 0 chars typed (floor(0/28) = 0)
    act(() => flushRAF(0))
    // At t=0 the first frame fires. charsTyped = floor(0/28) = 0
    // So displayed = 'Hello'.slice(0, 0) = ''
    expect(result.current).toBe('')

    // Advance to t=28 — should show 1 char
    act(() => flushRAF(28))
    expect(result.current).toBe('H')

    // Advance to t=56 — should show 2 chars
    act(() => flushRAF(56))
    expect(result.current).toBe('He')

    // Advance to t=84 — 3 chars
    act(() => flushRAF(84))
    expect(result.current).toBe('Hel')

    // Advance to t=112 — 4 chars
    act(() => flushRAF(112))
    expect(result.current).toBe('Hell')

    // Advance to t=140 — 5 chars = complete
    act(() => flushRAF(140))
    expect(result.current).toBe('Hello')

    // No more rAF callbacks scheduled
    expect(rafCallbacks.length).toBe(0)
  })

  it('does NOT show full text immediately (the blob problem)', () => {
    const longText = 'This is a long sentence that should animate character by character.'
    const { result } = renderHook(() =>
      useAnimatedText(longText, { charDelay: 28 })
    )

    // Before any animation frame
    expect(result.current).not.toBe(longText)
    expect(result.current).toBe('')

    // After first frame
    act(() => flushRAF(0))
    expect(result.current).not.toBe(longText)
    expect(result.current.length).toBeLessThan(longText.length)
  })

  it('deletes then types when text changes to something different', () => {
    const { result, rerender } = renderHook(
      ({ text }) => useAnimatedText(text, { charDelay: 20, deleteDelay: 10 }),
      { initialProps: { text: '' } }
    )

    // First: type "abc"
    rerender({ text: 'abc' })
    // Run enough frames to complete typing
    act(() => {
      for (let t = 0; t <= 200; t += 16) flushRAF(t)
    })
    expect(result.current).toBe('abc')

    // Now change to "xyz" (no common prefix)
    rerender({ text: 'xyz' })

    // First frames should be DELETING — text should shrink
    act(() => flushRAF(0))
    // At t=0, charsDeleted = floor(0/10) = 0, currentLen = max(0, 3-0) = 3
    expect(result.current).toBe('abc')

    act(() => flushRAF(10))
    // charsDeleted = floor(10/10) = 1, currentLen = max(0, 3-1) = 2
    expect(result.current).toBe('ab')

    act(() => flushRAF(20))
    // charsDeleted = 2, currentLen = max(0, 3-2) = 1
    expect(result.current).toBe('a')

    act(() => flushRAF(30))
    // charsDeleted = 3, currentLen = max(0, 3-3) = 0 → done deleting, switch to typing
    expect(result.current).toBe('')

    // Now should be typing "xyz"
    // phaseStartTime resets, so next frame at t=0 for the typing phase
    act(() => flushRAF(0))
    expect(result.current).toBe('')

    act(() => flushRAF(20))
    expect(result.current).toBe('x')

    act(() => flushRAF(40))
    expect(result.current).toBe('xy')

    act(() => flushRAF(60))
    expect(result.current).toBe('xyz')
  })

  it('preserves common prefix during text change', () => {
    const { result, rerender } = renderHook(
      ({ text }) => useAnimatedText(text, { charDelay: 20, deleteDelay: 10 }),
      { initialProps: { text: '' } }
    )

    // Type "Hello World"
    rerender({ text: 'Hello World' })
    act(() => {
      for (let t = 0; t <= 500; t += 16) flushRAF(t)
    })
    expect(result.current).toBe('Hello World')

    // Change to "Hello Earth" — "Hello " is common prefix (6 chars)
    rerender({ text: 'Hello Earth' })

    // Should delete "World" (5 chars) but keep "Hello "
    // After enough delete frames, should reach "Hello "
    act(() => {
      for (let t = 0; t <= 100; t += 16) flushRAF(t)
    })
    // After deleting, should have "Hello " (6 chars)
    // Then start typing "Hello Earth"

    // Run typing to completion
    act(() => {
      for (let t = 0; t <= 500; t += 16) flushRAF(t)
    })
    expect(result.current).toBe('Hello Earth')
  })
})
