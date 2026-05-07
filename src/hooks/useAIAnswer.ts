import { useState, useRef, useCallback } from 'react'
import { generateAIAnswer } from '../api/search'
import type { ThreadMessage, AnswerStyle } from '../api/search'
import type { SearchResult, FocusMode } from '../types'

export type { ThreadMessage }

const THREAD_KEY = 'nx-thread'

function loadThread(): ThreadMessage[] {
  try {
    const raw = sessionStorage.getItem(THREAD_KEY)
    return raw ? (JSON.parse(raw) as ThreadMessage[]) : []
  } catch { return [] }
}

function saveThread(thread: ThreadMessage[]) {
  try { sessionStorage.setItem(THREAD_KEY, JSON.stringify(thread)) } catch { /* ignore */ }
}

export function useAIAnswer() {
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [thread, setThread] = useState<ThreadMessage[]>(loadThread)
  const abortRef = useRef<AbortController | null>(null)
  const lastKeyRef = useRef('')
  const isGeneratingRef = useRef(false)

  const generate = useCallback(async (
    query: string,
    results: SearchResult[],
    answerStyle: AnswerStyle = 'concise',
    focusMode: FocusMode = 'research',
  ) => {
    if (!query.trim() || results.length === 0) return
    const key = `${query}|${results.slice(0, 6).map(r => r.id).join(',')}`
    if (key === lastKeyRef.current) return

    abortRef.current?.abort()
    abortRef.current = new AbortController()
    lastKeyRef.current = key
    isGeneratingRef.current = true
    setAnswer('')
    setLoading(true)
    setError(null)

    // Use current thread from sessionStorage to get latest state
    const currentThread = loadThread()

    try {
      let fullAnswer = ''
      await generateAIAnswer(query, results, token => {
        fullAnswer += token
        setAnswer(prev => prev + token)
      }, abortRef.current.signal, currentThread, answerStyle, focusMode)

      // Append this exchange to the thread
      const newThread: ThreadMessage[] = [
        ...currentThread,
        { role: 'user', content: query },
        { role: 'assistant', content: fullAnswer },
      ]
      setThread(newThread)
      saveThread(newThread)
    } catch (e: unknown) {
      if ((e as Error).name !== 'AbortError') {
        setError((e as Error).message ?? 'AI answer failed')
      }
    } finally {
      setLoading(false)
      isGeneratingRef.current = false
    }
  }, [])

  const abort = useCallback(() => {
    abortRef.current?.abort()
    setLoading(false)
    isGeneratingRef.current = false
    lastKeyRef.current = ''
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setAnswer('')
    setLoading(false)
    setError(null)
    lastKeyRef.current = ''
    isGeneratingRef.current = false
  }, [])

  const clearThread = useCallback(() => {
    abortRef.current?.abort()
    setAnswer('')
    setLoading(false)
    setError(null)
    setThread([])
    lastKeyRef.current = ''
    isGeneratingRef.current = false
    sessionStorage.removeItem(THREAD_KEY)
  }, [])

  return { answer, loading, error, thread, generate, abort, reset, clearThread }
}
