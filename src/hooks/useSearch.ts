import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { searchPatterns, searchSemantic } from '../api/search'
import type { SearchResult, SearchMode, SortField } from '../types'

const PAGE_SIZE = 20

export function useSearch() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [results, setResults] = useState<SearchResult[]>([])
  const [total, setTotal] = useState(0)
  const [queryTimeMs, setQueryTimeMs] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const query = searchParams.get('q') ?? ''
  const domain = searchParams.get('domain') ?? ''
  const mode = (searchParams.get('mode') as SearchMode) ?? 'semantic'
  const sort = (searchParams.get('sort') as SortField) ?? 'similarity'
  const page = parseInt(searchParams.get('page') ?? '1', 10)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const runSearch = useCallback(async (q: string, dom: string, m: SearchMode) => {
    if (!q.trim()) {
      setResults([])
      setTotal(0)
      return
    }
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setLoading(true)
    setError(null)
    try {
      const resp = m === 'semantic'
        ? await searchSemantic(q, PAGE_SIZE)
        : await searchPatterns(q, dom, PAGE_SIZE)
      setResults(resp.results)
      setTotal(resp.total)
      setQueryTimeMs(resp.query_time_ms)
    } catch (e: unknown) {
      if ((e as Error).name !== 'AbortError') {
        setError((e as Error).message ?? 'Search failed')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      runSearch(query, domain, mode)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, domain, mode, runSearch])

  const setQuery = useCallback((q: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (q) next.set('q', q); else next.delete('q')
      next.delete('page')
      return next
    }, { replace: true })
  }, [setSearchParams])

  const setDomain = useCallback((d: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (d) next.set('domain', d); else next.delete('domain')
      next.delete('page')
      return next
    }, { replace: true })
  }, [setSearchParams])

  const setMode = useCallback((m: SearchMode) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('mode', m)
      next.delete('page')
      return next
    }, { replace: true })
  }, [setSearchParams])

  const setSort = useCallback((s: SortField) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('sort', s)
      return next
    }, { replace: true })
  }, [setSearchParams])

  const setPage = useCallback((p: number) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.set('page', String(p))
      return next
    }, { replace: true })
  }, [setSearchParams])

  const sortedResults = [...results].sort((a, b) => {
    if (sort === 'confidence') return b.confidence - a.confidence
    if (sort === 'domain') return a.domain.localeCompare(b.domain)
    return b.similarity - a.similarity
  })

  const start = (page - 1) * PAGE_SIZE
  const pagedResults = sortedResults.slice(start, start + PAGE_SIZE)
  const totalPages = Math.ceil(results.length / PAGE_SIZE)

  return {
    query, domain, mode, sort, page,
    results: pagedResults,
    allResults: results,
    total, queryTimeMs, loading, error, totalPages,
    setQuery, setDomain, setMode, setSort, setPage,
  }
}
