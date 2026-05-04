import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSuggest } from '../../hooks/useSuggest'
import * as searchApi from '../../api/search'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useSuggest', () => {
  it('returns empty suggestions for short query', async () => {
    const { result } = renderHook(() => useSuggest('a'))
    await act(async () => { await vi.runAllTimersAsync() })
    expect(result.current.suggestions).toEqual([])
  })

  it('debounces and fetches suggestions', async () => {
    vi.spyOn(searchApi, 'fetchSuggestions').mockResolvedValue({ suggestions: ['python loops', 'python dict'] })
    const { result } = renderHook(() => useSuggest('py'))
    expect(searchApi.fetchSuggestions).not.toHaveBeenCalled()
    await act(async () => { await vi.runAllTimersAsync() })
    expect(result.current.suggestions).toEqual(['python loops', 'python dict'])
  })

  it('handles empty response gracefully', async () => {
    vi.spyOn(searchApi, 'fetchSuggestions').mockResolvedValue({ suggestions: [] })
    const { result } = renderHook(() => useSuggest('xyz'))
    await act(async () => { await vi.runAllTimersAsync() })
    expect(result.current.suggestions).toEqual([])
  })

  it('clear() empties suggestions', async () => {
    vi.spyOn(searchApi, 'fetchSuggestions').mockResolvedValue({ suggestions: ['foo'] })
    const { result } = renderHook(() => useSuggest('fo'))
    await act(async () => { await vi.runAllTimersAsync() })
    expect(result.current.suggestions.length).toBeGreaterThan(0)
    act(() => result.current.clear())
    expect(result.current.suggestions).toEqual([])
  })
})
