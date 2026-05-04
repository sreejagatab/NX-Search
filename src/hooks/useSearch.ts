import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { searchPatterns, searchSemantic, searchHybrid } from '../api/search'
import type { SearchResult, SearchMode, SortField } from '../types'

export const DISPLAY_PAGE_SIZE = 20
const FETCH_LIMIT = 50

// LRU in-memory cache — exported so useSuggest can prefetch into it
export const searchCache = new Map<string, { results: SearchResult[]; total: number; queryTimeMs: number }>()
const CACHE_MAX = 20

export function cacheKey(q: string, domains: string[], mode: SearchMode, threshold: number) {
  return `${q}|${[...domains].sort().join(',')}|${mode}|${threshold}`
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
  // client-side filters
  const [localFilter, setLocalFilter] = useState('')
  const [minConfidence, setMinConfidence] = useState(0)
  const [activeSources, setActiveSources] = useState<string[]>([])

  const query = searchParams.get('q') ?? ''
  const rawDomains = searchParams.get('domain') ?? ''
  const domains = rawDomains ? rawDomains.split(',').filter(Boolean) : []
  const mode = (searchParams.get('mode') as SearchMode) ?? 'semantic'
  const sort = (searchParams.get('sort') as SortField) ?? 'similarity'
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const threshold = parseFloat(searchParams.get('threshold') ?? '0.7')

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const runSearch = useCallback(async (q: string, doms: string[], m: SearchMode, thr: number) => {
    if (!q.trim()) {
      setResults([]); setStaleResults([]); setTotal(0); return
    }
    const key = cacheKey(q, doms, m, thr)
    const cached = searchCache.get(key)
    if (cached) {
      setResults(cached.results); setTotal(cached.total); setQueryTimeMs(cached.queryTimeMs)
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
        resp = await searchHybrid(q, FETCH_LIMIT, thr, doms[0] ?? '')
      } else if (m === 'semantic') {
        resp = await searchSemantic(q, FETCH_LIMIT, thr)
      } else {
        // multi-domain: run one search per domain, merge+dedup
        if (doms.length > 1) {
          const responses = await Promise.all(doms.map(d => searchPatterns(q, d, FETCH_LIMIT)))
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
          resp = await searchPatterns(q, doms[0] ?? '', FETCH_LIMIT)
        }
      }
      const payload = { results: resp.results, total: resp.total, queryTimeMs: resp.query_time_ms }
      cacheSet(key, payload)
      setResults(resp.results); setTotal(resp.total); setQueryTimeMs(resp.query_time_ms)
      setStaleResults([])
    } catch (e: unknown) {
      if ((e as Error).name !== 'AbortError') {
        setError((e as Error).message ?? 'Search failed')
        setStaleResults([])
      }
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(query, domains, mode, threshold), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, rawDomains, mode, threshold, runSearch])

  const setQuery = useCallback((q: string) => {
    setSearchParams(prev => { const n = new URLSearchParams(prev); if (q) n.set('q', q); else n.delete('q'); n.delete('page'); return n }, { replace: true })
  }, [setSearchParams])

  const setDomains = useCallback((ds: string[]) => {
    setSearchParams(prev => { const n = new URLSearchParams(prev); if (ds.length) n.set('domain', ds.join(',')); else n.delete('domain'); n.delete('page'); return n }, { replace: true })
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

  const setThreshold = useCallback((t: number) => {
    setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('threshold', String(t)); n.delete('page'); return n }, { replace: true })
  }, [setSearchParams])

  const retrySearch = useCallback(() => runSearch(query, domains, mode, threshold), [query, domains, mode, threshold, runSearch])

  const displayBase = loading && staleResults.length > 0 ? staleResults : results

  // client-side filters (confidence, source, local text)
  const filteredResults = displayBase.filter(r => {
    if (r.confidence < minConfidence / 100) return false
    if (activeSources.length > 0 && !activeSources.includes(r.source)) return false
    if (localFilter.trim() && !r.content.toLowerCase().includes(localFilter.toLowerCase())) return false
    return true
  })

  const sortedResults = [...filteredResults].sort((a, b) => {
    if (sort === 'confidence') return b.confidence - a.confidence
    if (sort === 'domain') return a.domain.localeCompare(b.domain)
    return b.similarity - a.similarity
  })

  const start = (page - 1) * pageSize
  const pagedResults = sortedResults.slice(start, start + pageSize)
  const totalPages = Math.ceil(filteredResults.length / pageSize)

  const allSources = [...new Set(displayBase.map(r => r.source).filter(Boolean))]
  const domainCounts = displayBase.reduce<Record<string, number>>((acc, r) => {
    acc[r.domain] = (acc[r.domain] ?? 0) + 1; return acc
  }, {})
  const sourceCounts = displayBase.reduce<Record<string, number>>((acc, r) => {
    if (r.source) acc[r.source] = (acc[r.source] ?? 0) + 1; return acc
  }, {})

  return {
    query, domains, mode, sort, page, threshold,
    results: pagedResults,
    allResults: displayBase,
    filteredCount: filteredResults.length,
    isStale: loading && staleResults.length > 0,
    total, queryTimeMs, loading, error, totalPages,
    pageSize, localFilter, minConfidence, activeSources,
    allSources, domainCounts, sourceCounts,
    setQuery, setDomains, setMode, setSort, setPage, setThreshold,
    setPageSize: setPageSizeState,
    setLocalFilter, setMinConfidence, setActiveSources,
    retrySearch,
  }
}
