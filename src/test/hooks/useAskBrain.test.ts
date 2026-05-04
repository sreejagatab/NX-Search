import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAskBrain } from '../../hooks/useAskBrain'
import * as searchApi from '../../api/search'

const mockResults = [
  { id: '1', content: 'Python decorators explanation', domain: 'python', confidence: 0.9, similarity: 0.85, source: 'gh' },
]

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useAskBrain', () => {
  it('starts idle', () => {
    const { result } = renderHook(() => useAskBrain())
    expect(result.current.answer).toBe('')
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('accumulates SSE tokens', async () => {
    vi.spyOn(searchApi, 'askBrain').mockImplementation(async (_q, _ctx, onToken) => {
      onToken('Hello')
      onToken(' world')
    })
    const { result } = renderHook(() => useAskBrain())
    await act(async () => { await result.current.ask('test', mockResults) })
    expect(result.current.answer).toBe('Hello world')
  })

  it('sets loading true during ask, false after', async () => {
    let resolve!: () => void
    vi.spyOn(searchApi, 'askBrain').mockImplementation(() => new Promise<void>(r => { resolve = r }))
    const { result } = renderHook(() => useAskBrain())
    act(() => { result.current.ask('q', mockResults) })
    await waitFor(() => expect(result.current.loading).toBe(true))
    await act(async () => resolve())
    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  it('abort() stops loading', async () => {
    vi.spyOn(searchApi, 'askBrain').mockImplementation(() => new Promise<void>(() => {}))
    const { result } = renderHook(() => useAskBrain())
    act(() => { result.current.ask('q', mockResults) })
    await waitFor(() => expect(result.current.loading).toBe(true))
    act(() => result.current.abort())
    expect(result.current.loading).toBe(false)
  })

  it('reset() clears answer and error', async () => {
    vi.spyOn(searchApi, 'askBrain').mockImplementation(async (_q, _ctx, onToken) => { onToken('test') })
    const { result } = renderHook(() => useAskBrain())
    await act(async () => { await result.current.ask('q', mockResults) })
    expect(result.current.answer).toBe('test')
    act(() => result.current.reset())
    expect(result.current.answer).toBe('')
  })
})
