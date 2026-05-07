import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchSuggestions } from '../api/search'
import { searchSemantic, searchHybrid, searchPatterns } from '../api/search'
import { searchCache, cacheKey, cacheSet } from './useSearch'
import type { SearchMode } from '../types'

export function useSuggest(query: string) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prefetchTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

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
        cacheSet(key, { results: resp.results, total: resp.total, queryTimeMs: resp.query_time_ms })
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

  return { suggestions, clear, prefetchSuggestion, cancelPrefetch }
}
