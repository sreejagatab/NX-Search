import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { searchPatterns, searchSemantic, searchHybrid } from '../api/search'
import { parseOperators } from '../lib/parseOperators'
import type { SearchResult, SearchMode, SortField, FocusMode } from '../types'

export const DISPLAY_PAGE_SIZE = 10  // 2 pages of 10 from max-20 API results
const FETCH_LIMIT = 20

// LRU in-memory cache — exported so useSuggest can prefetch into it
export const searchCache = new Map<string, { results: SearchResult[]; total: number; queryTimeMs: number }>()
const CACHE_MAX = 20

export function cacheKey(q: string, domains: string[], mode: SearchMode) {
  return `${q}|${[...domains].sort().join(',')}|${mode}`
}
export function cacheSet(key: string, value: { results: SearchResult[]; total: number; queryTimeMs: number }) {
  if (searchCache.size >= CACHE_MAX) {
    const first = searchCache.keys().next().value
    if (first !== undefined) searchCache.delete(first)
  }
  searchCache.set(key, value)
}

export function useSearch() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [results, setResults] = useState<SearchResult[]>([])
  const [total, setTotal] = useState(0)
  const [queryTimeMs, setQueryTimeMs] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pageSize, setPageSizeState] = useState(DISPLAY_PAGE_SIZE)
  const [staleResults, setStaleResults] = useState<SearchResult[]>([])
  const [aiSummary, setAiSummary] = useState('')
  const [intent, setIntent] = useState('')
  const [intentConfidence, setIntentConfidence] = useState(0)
  const [enginesUsed, setEnginesUsed] = useState<string[]>([])
  const [resultSources, setResultSources] = useState<Record<string, number>>({})
  const [relatedSearches, setRelatedSearches] = useState<string[]>([])
  // client-side filters
  const [localFilter, setLocalFilter] = useState('')
  const [minConfidence, setMinConfidence] = useState(0)
  const [activeSources, setActiveSources] = useState<string[]>([])
  const [excludedDomains, setExcludedDomains] = useState<string[]>([])
  const [excludedSources, setExcludedSources] = useState<string[]>([])

  const query = searchParams.get('q') ?? ''
  const rawDomains = searchParams.get('domain') ?? ''
  const domains = rawDomains ? rawDomains.split(',').filter(Boolean) : []
  const mode = (searchParams.get('mode') as SearchMode) ?? 'semantic'
  const sort = (searchParams.get('sort') as SortField) ?? 'similarity'
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const focusMode = (searchParams.get('focus') as FocusMode) ?? 'research'

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const runSearch = useCallback(async (q: string, doms: string[], m: SearchMode) => {
    if (!q.trim()) {
      setLoading(false); setResults([]); setStaleResults([]); setTotal(0); return
    }
    const ops = parseOperators(q)
    const effectiveQ = ops.cleanQuery || q
    const effectiveDoms = ops.domains.length > 0 ? [...new Set([...doms, ...ops.domains])] : doms
    const key = cacheKey(effectiveQ, effectiveDoms, m)
    const cached = searchCache.get(key)
    if (cached) {
      setLoading(false); setResults(cached.results); setTotal(cached.total); setQueryTimeMs(cached.queryTimeMs)
      setStaleResults([]); return
    }

    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setStaleResults(prev => (prev.length > 0 ? prev : results))
    setLoading(true)
    setError(null)
    try {
      let resp
      if (m === 'hybrid') {
        resp = await searchHybrid(effectiveQ, FETCH_LIMIT, 0.7, effectiveDoms[0] ?? '')
      } else if (m === 'semantic') {
        resp = await searchSemantic(effectiveQ, FETCH_LIMIT, 0.7, effectiveDoms[0] ?? '')
      } else {
        // multi-domain: run one search per domain, merge+dedup
        if (effectiveDoms.length > 1) {
          const responses = await Promise.all(effectiveDoms.map(d => searchPatterns(effectiveQ, d, FETCH_LIMIT)))
          const seen = new Set<string>()
          const merged: SearchResult[] = []
          for (const r of responses.flatMap(r => r.results)) {
            if (!seen.has(r.id)) { seen.add(r.id); merged.push(r) }
          }
          resp = {
            results: merged.sort((a, b) => b.similarity - a.similarity),
            total: merged.length,
            query_time_ms: Math.max(...responses.map(r => r.query_time_ms)),
          }
        } else {
          resp = await searchPatterns(effectiveQ, effectiveDoms[0] ?? '', FETCH_LIMIT)
        }
      }
      const payload = { results: resp.results, total: resp.total, queryTimeMs: resp.query_time_ms }
      cacheSet(key, payload)
      setResults(resp.results); setTotal(resp.total); setQueryTimeMs(resp.query_time_ms)
      setAiSummary(resp.ai_summary ?? '')
      setIntent(resp.intent ?? '')
      setIntentConfidence(resp.intent_confidence ?? 0)
      setEnginesUsed(resp.engines_used ?? [])
      // Normalize raw source names from API to user-friendly labels
      const SOURCE_LABELS: Record<string, string> = { 'neuronx_memory.db': 'Internal', 'codebase': 'Codebase' }
      const rawSources = resp.sources ?? {}
      const normalizedSources = Object.fromEntries(
        Object.entries(rawSources).map(([k, v]) => [SOURCE_LABELS[k] ?? k, v])
      )
      setResultSources(normalizedSources)
      setRelatedSearches(resp.related_searches?.filter(Boolean) ?? [])
      setStaleResults([])
    } catch (e: unknown) {
      if ((e as Error).name !== 'AbortError') {
        const msg = (e as Error).message ?? ''
        const friendly = msg === 'Failed to fetch'
          ? 'Could not reach the search server. Check your connection or try again.'
          : msg || 'Search failed'
        setError(friendly)
        setStaleResults([])
      }
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    // Set loading immediately so loadedQuery guard doesn't misfire during the debounce gap
    if (query.trim()) setLoading(true)
    else setLoading(false)
    debounceRef.current = setTimeout(() => runSearch(query, domains, mode), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, rawDomains, mode, runSearch])

  const setQuery = useCallback((q: string) => {
    setSearchParams(prev => { const n = new URLSearchParams(prev); if (q) n.set('q', q); else n.delete('q'); n.delete('page'); return n }, { replace: true })
  }, [setSearchParams])

  const setDomains = useCallback((ds: string[]) => {
    setSearchParams(prev => {
      const n = new URLSearchParams(prev)
      if (ds.length) n.set('domain', ds.join(','))
      else n.delete('domain')
      n.delete('page')
      // If focus=web but domains are no longer exclusively ['web'], reset to research
      if (n.get('focus') === 'web' && !(ds.length === 1 && ds[0] === 'web')) {
        n.delete('focus')
      }
      return n
    }, { replace: true })
  }, [setSearchParams])

  const setMode = useCallback((m: SearchMode) => {
    setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('mode', m); n.delete('page'); return n }, { replace: true })
  }, [setSearchParams])

  const setSort = useCallback((s: SortField) => {
    setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('sort', s); return n }, { replace: true })
  }, [setSearchParams])

  const setPage = useCallback((p: number) => {
    setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('page', String(p)); return n }, { replace: true })
  }, [setSearchParams])

  const retrySearch = useCallback(() => runSearch(query, domains, mode), [query, domains, mode, runSearch])

  const setFocusMode = useCallback((f: FocusMode) => {
    setSearchParams(prev => {
      const n = new URLSearchParams(prev)
      if (f === 'research') n.delete('focus')
      else n.set('focus', f)
      // Sync domain filter with web focus mode
      if (f === 'web') n.set('domain', 'web')
      else n.delete('domain')
      n.delete('page')
      return n
    }, { replace: true })
  }, [setSearchParams])

  const displayBase = loading && staleResults.length > 0 ? staleResults : results

  // parse inline operators from the query for client-side filtering
  const ops = useMemo(() => parseOperators(query), [query])
  const effectiveMinConfidence = Math.max(minConfidence, ops.minConfidence)
  const effectiveMaxConfidence = ops.maxConfidence < 100 ? ops.maxConfidence : 100

  // client-side filters — memoized so they don't recompute on unrelated state changes
  const filteredResults = useMemo(() => displayBase.filter(r => {
    if (r.confidence < effectiveMinConfidence / 100) return false
    if (r.confidence > effectiveMaxConfidence / 100) return false
    if (domains.length > 0 && !domains.includes(r.domain.toLowerCase())) return false
    if (activeSources.length > 0 && !activeSources.includes(r.source)) return false
    if (localFilter.trim() && !r.content.toLowerCase().includes(localFilter.toLowerCase())) return false
    if (ops.excludeDomains.length > 0 && ops.excludeDomains.includes(r.domain.toLowerCase())) return false
    if (ops.exactPhrases.length > 0 && !ops.exactPhrases.every(p => r.content.toLowerCase().includes(p))) return false
    if (excludedDomains.includes(r.domain.toLowerCase())) return false
    if (excludedSources.length > 0 && excludedSources.includes(r.source)) return false
    return true
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [displayBase, effectiveMinConfidence, effectiveMaxConfidence, rawDomains, activeSources, localFilter, excludedDomains, excludedSources, ops])

  const sortedResults = useMemo(() => [...filteredResults].sort((a, b) => {
    if (sort === 'confidence') return b.confidence - a.confidence
    if (sort === 'domain') return a.domain.localeCompare(b.domain)
    return b.similarity - a.similarity
  }), [filteredResults, sort])

  const start = (page - 1) * pageSize
  const pagedResults = useMemo(() => sortedResults.slice(start, start + pageSize), [sortedResults, start, pageSize])
  const totalPages = Math.ceil(filteredResults.length / pageSize)

  const allSources = useMemo(() => [...new Set(displayBase.map(r => r.source).filter(Boolean))], [displayBase])
  const domainCounts = useMemo(() => displayBase.reduce<Record<string, number>>((acc, r) => {
    acc[r.domain] = (acc[r.domain] ?? 0) + 1; return acc
  }, {}), [displayBase])
  const sourceCounts = useMemo(() => displayBase.reduce<Record<string, number>>((acc, r) => {
    if (r.source) acc[r.source] = (acc[r.source] ?? 0) + 1; return acc
  }, {}), [displayBase])

  return {
    query, domains, mode, sort, page, focusMode,
    results: pagedResults,
    allResults: displayBase,
    filteredCount: filteredResults.length,
    isStale: loading && staleResults.length > 0,
    total, queryTimeMs, loading, error, totalPages,
    pageSize, localFilter, minConfidence, activeSources,
    allSources, domainCounts, sourceCounts,
    setQuery, setDomains, setMode, setSort, setPage, setFocusMode,
    setPageSize: setPageSizeState,
    setLocalFilter, setMinConfidence, setActiveSources,
    excludedDomains, setExcludedDomains,
    excludedSources, setExcludedSources,
    aiSummary, intent, intentConfidence, enginesUsed, resultSources, relatedSearches,
    retrySearch,
  }
}
