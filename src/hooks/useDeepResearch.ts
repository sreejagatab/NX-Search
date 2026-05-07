import { useState, useCallback, useRef } from 'react'
import { llmStream } from '../api/client'
import { searchHybrid } from '../api/search'
import type { SearchResult } from '../types'

export interface DeepResearchState {
  phase: 'idle' | 'planning' | 'searching' | 'synthesizing' | 'done' | 'error'
  subQueries: string[]
  completedQueries: number
  totalQueries: number
  mergedResults: SearchResult[]
  report: string
  error: string | null
}

const INITIAL: DeepResearchState = {
  phase: 'idle', subQueries: [], completedQueries: 0, totalQueries: 0,
  mergedResults: [], report: '', error: null,
}

export function useDeepResearch() {
  const [state, setState] = useState<DeepResearchState>(INITIAL)
  const abortRef = useRef<AbortController | null>(null)

  const run = useCallback(async (query: string, domain = '') => {
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    const signal = abortRef.current.signal

    setState({ ...INITIAL, phase: 'planning' })

    // Step 1: Generate sub-queries
    let subQueriesRaw = ''
    try {
      await llmStream(
        '/v1/chat/completions',
        {
          model: 'neuronx',
          messages: [{
            role: 'user',
            content: `You are a research planner. For the query: "${query}"

Generate 3 complementary sub-queries that together cover the topic comprehensively. Return ONLY a JSON array of 3 strings. Example: ["sub-query 1", "sub-query 2", "sub-query 3"]`,
          }],
          max_tokens: 120,
          stream: true,
        },
        token => { subQueriesRaw += token },
        signal,
      )
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }

    let subQueries: string[] = []
    try {
      const match = subQueriesRaw.match(/\[[\s\S]*?\]/)
      if (match) {
        const parsed = JSON.parse(match[0]) as unknown[]
        if (Array.isArray(parsed)) subQueries = (parsed as string[]).filter(s => typeof s === 'string').slice(0, 3)
      }
    } catch { /* use fallback */ }

    // Fallback: generate basic sub-queries
    if (subQueries.length === 0) {
      subQueries = [`${query} overview`, `${query} examples`, `${query} best practices`]
    }

    const allQueries = [query, ...subQueries]
    setState(s => ({ ...s, phase: 'searching', subQueries, totalQueries: allQueries.length, completedQueries: 0 }))

    // Step 2: Run all searches in parallel
    const seen = new Set<string>()
    const merged: SearchResult[] = []

    const searchOne = async (q: string) => {
      try {
        const resp = await searchHybrid(q, 20, 0.7, domain)
        for (const r of resp.results) {
          if (!seen.has(r.id)) { seen.add(r.id); merged.push(r) }
        }
      } catch { /* skip failed sub-query */ }
      setState(s => ({ ...s, completedQueries: s.completedQueries + 1 }))
    }

    await Promise.all(allQueries.map(q => searchOne(q)))

    if (signal.aborted) return

    // Sort by confidence, take top 20
    const topResults = [...merged].sort((a, b) => b.confidence - a.confidence).slice(0, 20)
    setState(s => ({ ...s, phase: 'synthesizing', mergedResults: topResults }))

    // Step 3: Synthesize a long-form report
    const context = topResults.slice(0, 10).map((r, i) => {
      const label = r.title ?? r.file_path ?? `Result ${i + 1}`
      const snippet = r.content.slice(0, 400).replace(/\n+/g, ' ')
      return `[${i + 1}] ${label} (${r.domain}): ${snippet}`
    }).join('\n\n')

    const reportPrompt = `You are a research synthesizer. Create a comprehensive research report on: "${query}"

You have searched ${allQueries.length} related queries and found ${topResults.length} results. Here are the top sources:

${context}

Write a well-structured research report with:
## Executive Summary
(2-3 sentences overview)

## Key Findings
(3-5 bullet points of most important insights, cite sources as [1], [2], etc.)

## Deep Analysis
(2-3 paragraphs of detailed analysis with citations)

## Practical Applications
(2-3 specific use cases or examples)

## Confidence Assessment
(Brief note on source quality and coverage gaps)

Use **bold** for key terms. Cite sources inline as [1], [2], etc.`

    let report = ''
    try {
      await llmStream(
        '/v1/chat/completions',
        {
          model: 'neuronx',
          messages: [{ role: 'user', content: reportPrompt }],
          max_tokens: 1200,
          stream: true,
        },
        token => {
          report += token
          setState(s => ({ ...s, report }))
        },
        signal,
      )
      setState(s => ({ ...s, phase: 'done' }))
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setState(s => ({ ...s, phase: 'error', error: (e as Error).message || 'Synthesis failed' }))
      }
    }
  }, [])

  const abort = useCallback(() => {
    abortRef.current?.abort()
    setState(s => ({ ...s, phase: s.phase === 'idle' ? 'idle' : 'done' }))
  }, [])

  const reset = useCallback(() => { setState(INITIAL) }, [])

  return { state, run, abort, reset }
}
