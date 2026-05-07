import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAIAnswer } from '../../hooks/useAIAnswer'
import * as searchApi from '../../api/search'
import type { SearchResult } from '../../types'

const makeResults = (ids: string[]): SearchResult[] =>
  ids.map(id => ({ id, content: `content-${id}`, domain: 'web', confidence: 0.9, similarity: 0.9, source: 'test' }))

beforeEach(() => {
  vi.restoreAllMocks()
  sessionStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
  sessionStorage.clear()
})

describe('useAIAnswer', () => {
  it('generates an answer and accumulates tokens', async () => {
    vi.spyOn(searchApi, 'generateAIAnswer').mockImplementation(async (_q, _r, onToken) => {
      onToken('Hello'); onToken(' world')
    })
    const { result } = renderHook(() => useAIAnswer())
    await act(async () => {
      await result.current.generate('python', makeResults(['1', '2', '3']), 'concise')
    })
    expect(result.current.answer).toBe('Hello world')
    expect(result.current.loading).toBe(false)
  })

  it('deduplicates identical key — second call is a no-op', async () => {
    const impl = vi.spyOn(searchApi, 'generateAIAnswer').mockImplementation(async (_q, _r, onToken) => {
      onToken('answer')
    })
    const results = makeResults(['1', '2', '3'])
    const { result } = renderHook(() => useAIAnswer())
    await act(async () => { await result.current.generate('python', results, 'concise') })
    await act(async () => { await result.current.generate('python', results, 'concise') })
    expect(impl).toHaveBeenCalledTimes(1)
  })

  // THE KEY BUG FIX: second call with a different query/results must NOT be blocked
  it('follow-up with different query generates a new answer (was blocked by isGeneratingRef)', async () => {
    let callCount = 0

    vi.spyOn(searchApi, 'generateAIAnswer').mockImplementation((_q, _r, onToken) => {
      callCount++
      if (callCount === 1) {
        // First call: hang indefinitely (simulates slow in-flight generation)
        return new Promise<void>(() => {})
      }
      // Second call: resolve immediately
      onToken('follow-up answer')
      return Promise.resolve()
    })

    const { result } = renderHook(() => useAIAnswer())

    // Start first generation (hangs)
    act(() => { result.current.generate('python', makeResults(['a', 'b', 'c']), 'concise') })
    await waitFor(() => expect(result.current.loading).toBe(true))

    // Fire follow-up while first is still in progress
    await act(async () => {
      await result.current.generate('javascript', makeResults(['x', 'y', 'z']), 'concise')
    })

    expect(callCount).toBe(2)
    expect(result.current.answer).toBe('follow-up answer')
    expect(result.current.loading).toBe(false)
  })

  it('reset() clears answer and allows re-generation with same key', async () => {
    vi.spyOn(searchApi, 'generateAIAnswer').mockImplementation(async (_q, _r, onToken) => {
      onToken('fresh')
    })
    const results = makeResults(['1', '2'])
    const { result } = renderHook(() => useAIAnswer())
    await act(async () => { await result.current.generate('python', results, 'concise') })
    expect(result.current.answer).toBe('fresh')
    act(() => result.current.reset())
    await act(async () => { await result.current.generate('python', results, 'concise') })
    expect(result.current.answer).toBe('fresh')
  })

  it('appends exchange to thread after generation', async () => {
    vi.spyOn(searchApi, 'generateAIAnswer').mockImplementation(async (_q, _r, onToken) => {
      onToken('the answer')
    })
    const { result } = renderHook(() => useAIAnswer())
    await act(async () => {
      await result.current.generate('what is python', makeResults(['1']), 'concise')
    })
    expect(result.current.thread).toHaveLength(2)
    expect(result.current.thread[0]).toEqual({ role: 'user', content: 'what is python' })
    expect(result.current.thread[1]).toEqual({ role: 'assistant', content: 'the answer' })
  })

  it('clearThread() resets thread and answer', async () => {
    vi.spyOn(searchApi, 'generateAIAnswer').mockImplementation(async (_q, _r, onToken) => {
      onToken('ans')
    })
    const { result } = renderHook(() => useAIAnswer())
    await act(async () => { await result.current.generate('q', makeResults(['1']), 'concise') })
    expect(result.current.thread).toHaveLength(2)
    act(() => result.current.clearThread())
    expect(result.current.thread).toHaveLength(0)
    expect(result.current.answer).toBe('')
  })
})

// --- useSearch: immediate loading flag ---
import { renderHook as renderSearchHook } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { useSearch } from '../../hooks/useSearch'

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(MemoryRouter, { initialEntries: ['/search'] }, children)
}

describe('useSearch — immediate loading on query change', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

  it('sets loading=true immediately (before debounce) when query is set', async () => {
    vi.spyOn(searchApi, 'searchSemantic').mockResolvedValue({ results: [], total: 0, query_time_ms: 0 })
    const { result } = renderSearchHook(() => useSearch(), { wrapper })
    // Before query change loading is false
    expect(result.current.loading).toBe(false)
    act(() => { result.current.setQuery('python') })
    // Immediately after setQuery, before 300ms debounce, loading must be true
    expect(result.current.loading).toBe(true)
  })

  it('sets loading=false immediately when query is cleared', async () => {
    vi.spyOn(searchApi, 'searchSemantic').mockResolvedValue({ results: [], total: 0, query_time_ms: 0 })
    const { result } = renderSearchHook(() => useSearch(), { wrapper })
    act(() => { result.current.setQuery('python') })
    expect(result.current.loading).toBe(true)
    act(() => { result.current.setQuery('') })
    expect(result.current.loading).toBe(false)
  })
})
