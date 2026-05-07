import { useState, useRef, useCallback } from 'react'
import { generateRelatedQuestions, generateMiniAnswer } from '../api/search'
import type { SearchResult } from '../types'

export interface PAAItem {
  question: string
  answer: string
  loading: boolean
  expanded: boolean
}

export function usePeopleAlsoAsk() {
  const [items, setItems] = useState<PAAItem[]>([])
  const [generating, setGenerating] = useState(false)
  const lastKeyRef = useRef('')
  const abortRef = useRef<AbortController | null>(null)

  const generate = useCallback(async (
    query: string,
    results: SearchResult[],
    mainAnswer: string,
  ) => {
    if (!query.trim() || results.length === 0 || !mainAnswer.trim()) return
    const key = `${query}|${results.slice(0, 4).map(r => r.id).join(',')}`
    if (key === lastKeyRef.current) return

    abortRef.current?.abort()
    abortRef.current = new AbortController()
    lastKeyRef.current = key
    setItems([])
    setGenerating(true)

    try {
      const questions = await generateRelatedQuestions(query, results, mainAnswer, abortRef.current.signal)
      setItems(questions.map(q => ({ question: q, answer: '', loading: false, expanded: false })))
    } catch { /* abort or network error */ } finally {
      setGenerating(false)
    }
  }, [])

  const toggle = useCallback(async (index: number, results: SearchResult[]) => {
    let shouldFetch = false
    let question = ''

    setItems(prev => {
      const item = prev[index]
      if (!item) return prev
      const next = [...prev]
      const willExpand = !item.expanded
      next[index] = { ...item, expanded: willExpand }
      if (willExpand && !item.answer && !item.loading) {
        shouldFetch = true
        question = item.question
        next[index] = { ...next[index], loading: true }
      }
      return next
    })

    if (!shouldFetch || !question) return

    try {
      await generateMiniAnswer(question, results, token => {
        setItems(prev => {
          const next = [...prev]
          if (next[index]) next[index] = { ...next[index], answer: next[index].answer + token }
          return next
        })
      }, abortRef.current?.signal)
    } catch { /* abort */ }

    setItems(prev => {
      const next = [...prev]
      if (next[index]) next[index] = { ...next[index], loading: false }
      return next
    })
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    lastKeyRef.current = ''
    setItems([])
    setGenerating(false)
  }, [])

  return { items, generating, generate, toggle, reset }
}
