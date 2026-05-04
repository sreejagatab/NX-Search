import { useState, useRef, useCallback } from 'react'
import { askBrain } from '../api/search'
import type { SearchResult } from '../types'

export function useAskBrain() {
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const ask = useCallback(async (query: string, results: SearchResult[]) => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setAnswer('')
    setError(null)
    setLoading(true)

    const context = results.slice(0, 5).map(r => ({ content: r.content }))
    try {
      await askBrain(query, context, (token) => {
        setAnswer(prev => prev + token)
      }, abortRef.current.signal)
    } catch (e: unknown) {
      if ((e as Error).name !== 'AbortError') {
        setError((e as Error).message ?? 'Ask Brain failed')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const abort = useCallback(() => {
    abortRef.current?.abort()
    setLoading(false)
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setAnswer('')
    setError(null)
    setLoading(false)
  }, [])

  return { answer, loading, error, ask, abort, reset }
}
