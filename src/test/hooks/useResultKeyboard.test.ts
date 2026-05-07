import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useResultKeyboard } from '../../hooks/useResultKeyboard'
import type { SearchResult } from '../../types'

function makeResult(id: string): SearchResult {
  return { id, content: 'test', domain: 'python', similarity: 0.9, confidence: 0.8, source: 'internal' }
}

const results = [makeResult('r1'), makeResult('r2'), makeResult('r3')]

function fire(key: string) {
  act(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  })
}

describe('useResultKeyboard', () => {
  it('calls onOpen with the focused result when o is pressed', () => {
    const onOpen = vi.fn()
    const { result } = renderHook(() => useResultKeyboard(results, { onOpen }))

    // Register fake card elements
    const el0 = document.createElement('div')
    const el1 = document.createElement('div')
    document.body.appendChild(el0)
    document.body.appendChild(el1)
    act(() => { result.current.setCardRef(el0, 0); result.current.setCardRef(el1, 1) })

    fire('j') // focus index 0
    fire('o')
    expect(onOpen).toHaveBeenCalledWith(results[0])

    document.body.removeChild(el0)
    document.body.removeChild(el1)
  })

  it('calls onExplain with the focused result when e is pressed', () => {
    const onExplain = vi.fn()
    const { result } = renderHook(() => useResultKeyboard(results, { onExplain }))

    const el0 = document.createElement('div')
    document.body.appendChild(el0)
    act(() => { result.current.setCardRef(el0, 0) })

    fire('j')
    fire('e')
    expect(onExplain).toHaveBeenCalledWith(results[0])

    document.body.removeChild(el0)
  })

  it('does not fire when focused in an input', () => {
    const onOpen = vi.fn()
    renderHook(() => useResultKeyboard(results, { onOpen }))

    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'o', bubbles: true }))
    })
    expect(onOpen).not.toHaveBeenCalled()

    document.body.removeChild(input)
  })
})
