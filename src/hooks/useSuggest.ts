import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchSuggestions } from '../api/search'
import { searchSemantic, searchHybrid, searchPatterns } from '../api/search'
import { searchCache, cacheKey, cacheSet } from './useSearch'
import { apiFetch } from '../api/client'
import type { SearchMode } from '../types'

interface TrendingItem { query: string; count: number; avg_time_ms: number }

let trendingCache: string[] = []
let trendingFetched = false

async function fetchTrending(): Promise<string[]> {
  if (trendingFetched) return trendingCache
  trendingFetched = true
  try {
    const data = await apiFetch<TrendingItem[]>('/api/search/v2/trending')
    trendingCache = Array.isArray(data) ? data.map(t => t.query).filter(Boolean).slice(0, 8) : []
  } catch { trendingCache = [] }
  return trendingCache
}

export function useSuggest(query: string) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [trending, setTrending] = useState<string[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prefetchTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Load trending once on mount
  useEffect(() => {
    fetchTrending().then(t => setTrending(t)).catch(() => {})
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim() || query.length < 2) { setSuggestions([]); return }
    debounceRef.current = setTimeout(async () => {
      try {
        const resp = await fetchSuggestions(query)
        setSuggestions(resp.suggestions ?? [])
      } catch { setSuggestions([]) }
    }, 200)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  const prefetchSuggestion = useCallback((suggestion: string, mode: SearchMode, domains: string[]) => {
    const key = cacheKey(suggestion, domains, mode)
    if (searchCache.has(key)) return
    const existing = prefetchTimers.current.get(suggestion)
    if (existing) clearTimeout(existing)
    const t = setTimeout(async () => {
      if (searchCache.has(key)) return
      try {
        let resp
        if (mode === 'hybrid') resp = await searchHybrid(suggestion, 20, 0.7, domains[0] ?? '')
        else if (mode === 'semantic') resp = await searchSemantic(suggestion, 20, 0.7, domains[0] ?? '')
        else resp = await searchPatterns(suggestion, domains[0] ?? '', 20)
        cacheSet(key, {
          results: resp.results, total: resp.total, queryTimeMs: resp.query_time_ms,
          aiSummary: resp.ai_summary ?? '', intent: resp.intent ?? '',
          intentConfidence: resp.intent_confidence ?? 0, enginesUsed: resp.engines_used ?? [],
          resultSources: resp.sources ?? {}, relatedSearches: resp.related_searches?.filter(Boolean) ?? [],
        })
      } catch { /* ignore prefetch failures */ }
      prefetchTimers.current.delete(suggestion)
    }, 200)
    prefetchTimers.current.set(suggestion, t)
  }, [])

  const cancelPrefetch = useCallback((suggestion: string) => {
    const t = prefetchTimers.current.get(suggestion)
    if (t) { clearTimeout(t); prefetchTimers.current.delete(suggestion) }
  }, [])

  const clear = useCallback(() => setSuggestions([]), [])

  return { suggestions, trending, clear, prefetchSuggestion, cancelPrefetch }
}
