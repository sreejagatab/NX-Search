import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchDomains, fetchStats, KNOWN_DOMAINS } from '../api/search'
import type { AnswerStyle } from '../api/search'
import { addRecent } from '../lib/recentSearches'
import { getTheme, applyTheme, type Theme } from '../lib/theme'
import { useSearch } from './useSearch'
import { useAIAnswer } from './useAIAnswer'
import type { SearchResult } from '../types'
import type { Lens } from '../lib/lenses'
import { logZeroResult } from '../lib/zeroResults'

export function useResultsPage() {
  const search = useSearch()
  const [searchParams] = useSearchParams()
  const [domains, setDomains] = useState<string[]>([])
  const [stats, setStats] = useState({ total_patterns: 257000, total_vectors: 210000 })
  const [askVisible, setAskVisible] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [detailResult, setDetailResult] = useState<SearchResult | null>(null)
  const [explainResult, setExplainResult] = useState<SearchResult | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [collectionsOpen, setCollectionsOpen] = useState(false)
  const [urlSummaryOpen, setUrlSummaryOpen] = useState(false)
  const [deepResearchOpen, setDeepResearchOpen] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)
  const [theme, setThemeState] = useState<Theme>(getTheme)
  const [aiMode, setAiMode] = useState(() => localStorage.getItem('nx-ai-mode') === '1')
  const [answerStyle, setAnswerStyle] = useState<AnswerStyle>(
    () => (localStorage.getItem('nx-answer-style') as AnswerStyle) ?? 'concise'
  )
  const aiAnswer = useAIAnswer()
  const [loadedQuery, setLoadedQuery] = useState('')

  // Track which query the displayed results actually belong to
  useEffect(() => {
    if (!search.loading && search.query && search.allResults.length > 0) {
      setLoadedQuery(search.query)
    }
  }, [search.loading, search.query, search.allResults])

  // Document title
  useEffect(() => {
    if (search.query && !search.loading && search.total > 0) {
      document.title = `${search.query} (${search.total}) · NX Search`
    } else if (search.query && search.loading) {
      document.title = `Searching… · NX Search`
    } else {
      document.title = 'NeuronX Search'
    }
    return () => { document.title = 'NeuronX Search' }
  }, [search.query, search.loading, search.total])

  // Trigger AI answer when results are confirmed fresh
  useEffect(() => {
    if (aiMode && search.focusMode !== 'quick' && loadedQuery && search.query === loadedQuery && search.allResults.length > 0) {
      aiAnswer.generate(loadedQuery, search.allResults, answerStyle, search.focusMode)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiMode, loadedQuery, search.query, search.allResults, answerStyle, search.focusMode])

  // Parallel domain + stats fetch on mount
  useEffect(() => {
    Promise.all([fetchDomains(), fetchStats()])
      .then(([d, s]) => { setDomains(d.domains); setStats(s) })
      .catch(() => {})
  }, [])

  // Merge live result domains with seed list so sidebar always shows what's in view
  useEffect(() => {
    if (search.allResults.length === 0) return
    const liveDomains = [...new Set(search.allResults.map(r => r.domain.toLowerCase()))]
    setDomains(prev => {
      const merged = [...new Set([...KNOWN_DOMAINS, ...liveDomains, ...prev])]
      return merged
    })
  }, [search.allResults])

  // Log zero-result queries
  useEffect(() => {
    if (search.query && !search.loading && search.total === 0 && !search.error) {
      logZeroResult({ q: search.query, mode: search.mode, domains: search.domains })
    }
  }, [search.query, search.loading, search.total, search.error, search.mode, search.domains])

  // Save to recent searches after results land
  useEffect(() => {
    if (search.query && !search.loading && search.total > 0) {
      addRecent({
        q: search.query,
        mode: search.mode,
        domain: search.domains.join(','),
        resultCount: search.total,
        queryTimeMs: search.queryTimeMs,
        timestamp: Date.now(),
      })
    }
  }, [search.query, search.loading, search.total, search.mode, search.domains, search.queryTimeMs])

  // Auto-close Compare and Deep Research when query changes (stale results)
  useEffect(() => {
    setCompareOpen(false)
    setDeepResearchOpen(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.query])

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setPaletteOpen(v => !v) }
      if (e.altKey && e.key === 'a') { e.preventDefault(); toggleAiMode() }
      if (e.altKey && e.key === 'c') { e.preventDefault(); openCollections() }
      if (e.altKey && e.key === 'r') { e.preventDefault(); if (search.query) setDeepResearchOpen(v => !v) }
      if (e.altKey && e.key === 'v') { e.preventDefault(); if (search.query && search.allResults.length > 0) setCompareOpen(v => !v) }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.query, search.allResults.length])

  const toggleAiMode = useCallback(() => {
    setAiMode(prev => {
      const next = !prev
      localStorage.setItem('nx-ai-mode', next ? '1' : '0')
      if (!next) aiAnswer.reset()
      return next
    })
  }, [aiAnswer])

  const handleAnswerStyleChange = useCallback((s: AnswerStyle) => {
    setAnswerStyle(s)
    localStorage.setItem('nx-answer-style', s)
    if (loadedQuery && search.allResults.length > 0) aiAnswer.reset()
  }, [loadedQuery, search.allResults, aiAnswer])

  const cycleTheme = useCallback(() => {
    const order: Theme[] = ['system', 'dark', 'light']
    const next = order[(order.indexOf(theme) + 1) % order.length]
    applyTheme(next)
    setThemeState(next)
  }, [theme])

  const openAnalytics = useCallback(() => { setAnalyticsOpen(true); setCollectionsOpen(false) }, [])
  const openCollections = useCallback(() => { setCollectionsOpen(v => !v); setAnalyticsOpen(false) }, [])

  const exportJson = useCallback(() => {
    const data = {
      query: search.query, mode: search.mode, domains: search.domains,
      timestamp: new Date().toISOString(), total: search.total,
      ...(aiAnswer.answer ? { ai_answer: aiAnswer.answer, answer_style: answerStyle } : {}),
      results: search.allResults,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nx-search-${search.query.replace(/\s+/g, '-')}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [search.query, search.mode, search.domains, search.total, search.allResults, aiAnswer.answer, answerStyle])

  const handleMoreLike = useCallback((content: string) => {
    search.setMode('semantic')
    search.setQuery(content)
  }, [search])

  const handleExplain = useCallback((result: SearchResult) => {
    setExplainResult(result)
    setAskVisible(true)
    setDetailResult(null)
  }, [])

  const handleFollowUp = useCallback((q: string) => {
    search.setQuery(q)
  }, [search])

  const clearAllFilters = useCallback(() => {
    search.setDomains([])
    search.setMode('semantic')
    search.setSort('similarity')
    search.setMinConfidence(0)
    search.setActiveSources([])
  }, [search])

  const applyLens = useCallback((lens: Pick<Lens, 'domains' | 'mode' | 'sort' | 'minConfidence'>) => {
    search.setDomains(lens.domains)
    search.setMode(lens.mode)
    search.setSort(lens.sort)
    search.setMinConfidence(lens.minConfidence)
  }, [search])

  const highlightId = searchParams.get('result') ?? undefined
  const themeIcon = theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '⚙'

  return {
    // search state (pass-through)
    search,
    // derived / page-level state
    domains, stats, theme, themeIcon, aiMode, answerStyle,
    askVisible, filtersOpen, sidebarOpen, detailResult, explainResult,
    paletteOpen, analyticsOpen, collectionsOpen, loadedQuery, highlightId,
    aiAnswer,
    // setters
    setAskVisible, setFiltersOpen, setSidebarOpen,
    setDetailResult, setExplainResult, setPaletteOpen, setAnalyticsOpen, setCollectionsOpen,
    urlSummaryOpen, setUrlSummaryOpen,
    deepResearchOpen, setDeepResearchOpen,
    compareOpen, setCompareOpen,
    // handlers
    toggleAiMode, handleAnswerStyleChange, cycleTheme,
    openAnalytics, openCollections,
    exportJson, handleMoreLike, handleExplain, handleFollowUp, clearAllFilters, applyLens,
  }
}
