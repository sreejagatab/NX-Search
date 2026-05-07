import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'
import { useSearch } from '../../hooks/useSearch'
import * as searchApi from '../../api/search'

const mockResults = [
  { id: '1', content: 'Python test', domain: 'python', confidence: 0.9, similarity: 0.85, source: 'github' },
  { id: '2', content: 'JS test', domain: 'javascript', confidence: 0.7, similarity: 0.75, source: 'so' },
]

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(MemoryRouter, { initialEntries: ['/search'] }, children)
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(searchApi, 'searchSemantic').mockResolvedValue({ results: mockResults, total: 2, query_time_ms: 42 })
  vi.spyOn(searchApi, 'searchPatterns').mockResolvedValue({ results: mockResults, total: 2, query_time_ms: 30 })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useSearch', () => {
  it('starts with empty state', () => {
    const { result } = renderHook(() => useSearch(), { wrapper })
    expect(result.current.query).toBe('')
    expect(result.current.results).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  it('debounces search by 300ms', async () => {
    const { result } = renderHook(() => useSearch(), { wrapper })
    act(() => { result.current.setQuery('python') })
    expect(searchApi.searchSemantic).not.toHaveBeenCalled()
    await act(async () => { await vi.runAllTimersAsync() })
    expect(searchApi.searchSemantic).toHaveBeenCalledWith('python', 20, 0.7, '')
  })

  it('does not search for empty query', async () => {
    const { result } = renderHook(() => useSearch(), { wrapper })
    act(() => { result.current.setQuery('') })
    await act(async () => { await vi.runAllTimersAsync() })
    expect(searchApi.searchSemantic).not.toHaveBeenCalled()
  })

  it('updates domain filter via URL param', () => {
    const { result } = renderHook(() => useSearch(), { wrapper })
    act(() => { result.current.setDomains(['python']) })
    expect(result.current.domains).toContain('python')
  })

  it('setDomains deselects when empty array passed', () => {
    const { result } = renderHook(() => useSearch(), { wrapper })
    act(() => { result.current.setDomains(['python']) })
    act(() => { result.current.setDomains([]) })
    expect(result.current.domains).toEqual([])
  })

  it('sets mode to pattern and calls searchPatterns', async () => {
    const { result } = renderHook(() => useSearch(), { wrapper })
    act(() => { result.current.setMode('pattern') })
    act(() => { result.current.setQuery('react') })
    await act(async () => { await vi.runAllTimersAsync() })
    expect(searchApi.searchPatterns).toHaveBeenCalled()
  })

  it('populates results after search', async () => {
    const { result } = renderHook(() => useSearch(), { wrapper })
    act(() => { result.current.setQuery('python') })
    await act(async () => { await vi.runAllTimersAsync() })
    expect(result.current.results.length).toBeGreaterThan(0)
    expect(result.current.total).toBe(2)
  })
})
