import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SearchBar } from '../components/SearchBar'
import { ResultList } from '../components/ResultList'
import { AskBrain } from '../components/AskBrain'
import { StatsChip } from '../components/StatsChip'
import { SidebarFilters } from '../components/SidebarFilters'
import { FilterChips } from '../components/FilterChips'
import { ProgressBar } from '../components/ProgressBar'
import { OfflineBanner } from '../components/OfflineBanner'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { useSearch } from '../hooks/useSearch'
import { fetchDomains, fetchStats } from '../api/search'
import type { AnswerStyle } from '../api/search'
import { addRecent } from '../lib/recentSearches'
import { getTheme, applyTheme, type Theme } from '../lib/theme'
import { DetailPane } from '../components/DetailPane'
import { CommandPalette } from '../components/CommandPalette'
import { AnalyticsPanel } from '../components/AnalyticsPanel'
import { AISummary } from '../components/AISummary'
import { AIModeCard } from '../components/AIModeCard'
import { CollectionsPanel } from '../components/CollectionsPanel'
import { useAIAnswer } from '../hooks/useAIAnswer'
import type { SearchResult } from '../types'

export function Results() {
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
  const [theme, setThemeState] = useState<Theme>(getTheme)
  const [aiMode, setAiMode] = useState(() => localStorage.getItem('nx-ai-mode') === '1')
  const [answerStyle, setAnswerStyle] = useState<AnswerStyle>(() => (localStorage.getItem('nx-answer-style') as AnswerStyle) ?? 'concise')
  const aiAnswer = useAIAnswer()
  // Track which query the current results actually belong to (avoids generating with stale results
  // during the 300ms debounce gap between a query change and loading starting)
  const [loadedQuery, setLoadedQuery] = useState('')

  const toggleAiMode = () => {
    setAiMode(prev => {
      const next = !prev
      localStorage.setItem('nx-ai-mode', next ? '1' : '0')
      if (!next) aiAnswer.reset()
      return next
    })
  }

  const openAnalytics = () => { setAnalyticsOpen(true); setCollectionsOpen(false) }
  const openCollections = () => { setCollectionsOpen(v => !v); setAnalyticsOpen(false) }

  const handleAnswerStyleChange = (s: AnswerStyle) => {
    setAnswerStyle(s)
    localStorage.setItem('nx-answer-style', s)
    // Re-generate with new style if we have results
    if (loadedQuery && search.allResults.length > 0) {
      aiAnswer.reset()
    }
  }

  // Record the query that the currently-displayed results belong to
  useEffect(() => {
    if (!search.loading && search.query && search.allResults.length > 0) {
      setLoadedQuery(search.query)
    }
  }, [search.loading, search.query, search.allResults])

  // Update browser tab title
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

  // Trigger AI answer generation only when results are confirmed fresh for the current query
  // Skip generation in Quick focus mode
  useEffect(() => {
    if (aiMode && search.focusMode !== 'quick' && loadedQuery && search.query === loadedQuery && search.allResults.length > 0) {
      aiAnswer.generate(loadedQuery, search.allResults, answerStyle, search.focusMode)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiMode, loadedQuery, search.query, search.allResults, answerStyle, search.focusMode])

  const cycleTheme = () => {
    const order: Theme[] = ['system', 'dark', 'light']
    const next = order[(order.indexOf(theme) + 1) % order.length]
    applyTheme(next)
    setThemeState(next)
  }

  const themeIcon = theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '⚙'

  // share deep link: ?result=id
  const highlightId = searchParams.get('result') ?? undefined

  // parallel initial fetches (task 27)
  useEffect(() => {
    Promise.all([fetchDomains(), fetchStats()])
      .then(([d, s]) => { setDomains(d.domains); setStats(s) })
      .catch(() => {})
  }, [])

  // save to rich recent searches after results land
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

  // JSON export (task 31)
  const exportJson = () => {
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
  }

  const handleFollowUp = (q: string) => {
    search.setQuery(q)
  }

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(v => !v)
      }
      // Alt+A — toggle AI Mode
      if (e.altKey && e.key === 'a') {
        e.preventDefault()
        toggleAiMode()
      }
      // Alt+C — open Collections
      if (e.altKey && e.key === 'c') {
        e.preventDefault()
        openCollections()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleMoreLike = (content: string) => {
    search.setMode('semantic')
    search.setQuery(content)
  }

  const handleExplain = (result: SearchResult) => {
    setExplainResult(result)
    setAskVisible(true)
    // Close detail pane so Ask Brain panel has room
    setDetailResult(null)
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        mode={search.mode}
        focusMode={search.focusMode}
        onSetMode={search.setMode}
        onSetSort={search.setSort}
        onSetFocusMode={search.setFocusMode}
        onToggleAiMode={toggleAiMode}
        onToggleCollections={openCollections}
        onExport={search.allResults.length > 0 ? exportJson : undefined}
        onToggleTheme={cycleTheme}
        onNavigate={q => { search.setQuery(q); setPaletteOpen(false) }}
      />
      <AnalyticsPanel open={analyticsOpen} onClose={() => setAnalyticsOpen(false)} />
      <CollectionsPanel
        open={collectionsOpen}
        onClose={() => setCollectionsOpen(false)}
        onNavigate={q => { search.setQuery(q); setCollectionsOpen(false) }}
        currentQuery={aiAnswer.answer ? search.query : undefined}
        currentAnswer={aiAnswer.answer || undefined}
        currentResults={search.allResults}
      />
      <OfflineBanner />
      <ProgressBar loading={search.loading} />

      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-bg/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="text-amber-400 font-bold text-lg tracking-tight shrink-0">NX</Link>
          <div className="flex-1 min-w-0">
            <SearchBar
              query={search.query}
              mode={search.mode}
              domains={search.domains}
              focusMode={search.focusMode}
              onQueryChange={search.setQuery}
              onFocusModeChange={search.setFocusMode}
              size="sm"
            />
          </div>
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <StatsChip
              totalPatterns={stats.total_patterns}
              totalVectors={stats.total_vectors}
              queryTimeMs={search.queryTimeMs}
            />
          </div>

          {/* Secondary actions — icon strip (hidden on mobile) */}
          <div className="hidden sm:flex items-center shrink-0 border border-border rounded-lg overflow-hidden divide-x divide-border">
            <button onClick={cycleTheme} title={`Theme: ${theme}`}
              className="px-2.5 py-2 text-gray-500 hover:text-gray-200 hover:bg-subtle transition-colors text-sm">
              {themeIcon}
            </button>
            <button onClick={openAnalytics} title="Search analytics"
              className={`px-2.5 py-2 transition-colors text-sm ${analyticsOpen ? 'text-amber-400 bg-amber-400/10' : 'text-gray-500 hover:text-gray-200 hover:bg-subtle'}`}>
              📊
            </button>
            <button onClick={openCollections} title="Saved answers (Alt+C)"
              className={`px-2.5 py-2 transition-colors text-sm ${collectionsOpen ? 'text-amber-400 bg-amber-400/10' : 'text-gray-500 hover:text-gray-200 hover:bg-subtle'}`}>
              🗂
            </button>
            {search.allResults.length > 0 && (
              <button onClick={exportJson} title="Export results as JSON"
                className="px-2.5 py-2 text-gray-500 hover:text-gray-200 hover:bg-subtle transition-colors text-sm">
                ⬇
              </button>
            )}
            <button onClick={() => setPaletteOpen(true)} title="Command palette (⌘K)"
              className="px-2.5 py-2 text-gray-500 hover:text-amber-400 hover:bg-subtle transition-colors text-[11px] font-medium tracking-tight">
              ⌘K
            </button>
          </div>

          {/* Primary action toggles */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={toggleAiMode}
              title="Toggle AI Mode (Alt+A)"
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-medium ${
                aiMode
                  ? 'text-amber-300 border-amber-400/50 bg-gradient-to-r from-amber-400/15 to-violet-500/15 shadow-sm shadow-amber-400/10'
                  : 'text-gray-400 border-border hover:border-amber-400/30 hover:text-gray-200'
              }`}
            >
              ✦ AI
            </button>
            <button
              onClick={() => setAskVisible(v => !v)}
              title="Ask Brain panel"
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                askVisible
                  ? 'bg-amber-400/10 text-amber-400 border-amber-400/30'
                  : 'text-gray-400 border-border hover:border-amber-400/30 hover:text-gray-200'
              }`}
            >
              Ask
            </button>
          </div>
        </div>

        {/* Active filter chips */}
        <FilterChips
          domains={search.domains}
          mode={search.mode}
          sort={search.sort}
          minConfidence={search.minConfidence}
          activeSources={search.activeSources}
          onRemoveDomain={d => search.setDomains(search.domains.filter(x => x !== d))}
          onSetMode={search.setMode}
          onSetSort={search.setSort}
          onResetConfidence={() => search.setMinConfidence(0)}
          onRemoveSource={s => search.setActiveSources(search.activeSources.filter(x => x !== s))}
          onClearAll={() => {
            search.setDomains([])
            search.setMode('semantic')
            search.setSort('similarity')
            search.setMinConfidence(0)
            search.setActiveSources([])
          }}
        />
      </header>

      <div className="max-w-7xl mx-auto w-full flex gap-0 px-4 py-6">

        {/* Left sidebar — collapsible on desktop */}
        <aside className={`hidden lg:flex flex-col shrink-0 transition-all duration-200 ${sidebarOpen ? 'w-52 mr-6' : 'w-8 mr-3'}`}>
          <div className="sticky top-24 flex flex-col gap-2">
            {/* Toggle tab */}
            <button
              onClick={() => setSidebarOpen(v => !v)}
              title={sidebarOpen ? 'Collapse filters' : 'Expand filters'}
              className="self-start flex items-center gap-1.5 text-[10px] text-gray-600 hover:text-gray-300 transition-colors mb-1 uppercase tracking-wider"
            >
              {sidebarOpen ? (
                <><span>◀</span><span>Filters</span></>
              ) : (
                <span title="Filters">▶</span>
              )}
            </button>
            {sidebarOpen && (
              <SidebarFilters
                domains={domains}
                activeDomains={search.domains}
                domainCounts={search.domainCounts}
                onDomainsChange={search.setDomains}
                excludedDomains={search.excludedDomains}
                onExcludedDomainsChange={search.setExcludedDomains}
                minConfidence={search.minConfidence}
                onMinConfidenceChange={search.setMinConfidence}
                sources={search.allSources}
                activeSources={search.activeSources}
                sourceCounts={search.sourceCounts}
                onSourcesChange={search.setActiveSources}
                excludedSources={search.excludedSources}
                onExcludedSourcesChange={search.setExcludedSources}
              />
            )}
          </div>
        </aside>

        {/* Main results */}
        <main className="flex-1 min-w-0 pb-36 lg:pb-0">
          {search.focusMode === 'quick' ? (
            search.query && !search.loading && (
              <div className="flex items-center gap-2 text-xs text-gray-600 mb-4 px-1">
                <span className="text-amber-400/50">⚡</span>
                Quick mode — AI disabled for fastest results
              </div>
            )
          ) : aiMode ? (
            <AIModeCard
              query={search.query}
              summary={search.aiSummary}
              intent={search.intent}
              intentConfidence={search.intentConfidence}
              enginesUsed={search.enginesUsed}
              sources={search.resultSources}
              queryTimeMs={search.queryTimeMs}
              relatedSearches={search.relatedSearches}
              results={search.allResults}
              onRelatedClick={q => { search.setQuery(q); search.setPage(1) }}
              onFollowUp={q => { search.setQuery(q); search.setPage(1) }}
              answer={aiAnswer.answer}
              answerLoading={aiAnswer.loading}
              answerError={aiAnswer.error}
              onAbortAnswer={aiAnswer.abort}
              answerStyle={answerStyle}
              onAnswerStyleChange={handleAnswerStyleChange}
            />
          ) : (
            <AISummary
              summary={search.aiSummary}
              intent={search.intent}
              enginesUsed={search.enginesUsed}
              sources={search.resultSources}
              queryTimeMs={search.queryTimeMs}
              relatedSearches={search.relatedSearches}
              results={search.allResults}
              onRelatedClick={q => { search.setQuery(q); search.setPage(1) }}
            />
          )}
          <ErrorBoundary>
            <ResultList
              results={search.results}
              query={search.query}
              loading={search.loading}
              isStale={search.isStale}
              error={search.error}
              total={search.total}
              filteredCount={search.filteredCount}
              page={search.page}
              totalPages={search.totalPages}
              sort={search.sort}
              pageSize={search.pageSize}
              localFilter={search.localFilter}
              onLocalFilterChange={search.setLocalFilter}
              onPageChange={search.setPage}
              onSortChange={search.setSort}
              onPageSizeChange={search.setPageSize}
              onRetry={search.retrySearch}
              highlightId={highlightId}
              onMoreLike={handleMoreLike}
              onCardClick={setDetailResult}
              onExplain={handleExplain}
              compact={aiMode}
              detailOpen={detailResult !== null}
            />
          </ErrorBoundary>
        </main>

        {/* Right panel — Detail pane or Ask Brain — slide in */}
        <div className={`hidden lg:block shrink-0 transition-all duration-200 ${(detailResult || askVisible) ? 'w-80 ml-4' : 'w-0'}`}>
          {detailResult ? (
            <DetailPane
              result={detailResult}
              query={search.query}
              onClose={() => setDetailResult(null)}
            />
          ) : (
            <AskBrain
              query={search.query}
              results={search.allResults}
              visible={askVisible}
              onClose={() => setAskVisible(false)}
              onFollowUp={handleFollowUp}
              explainResult={explainResult}
              onExplainDone={() => setExplainResult(null)}
              thread={aiAnswer.thread}
              onClearThread={aiAnswer.clearThread}
            />
          )}
        </div>

        {/* Mobile: Ask Brain as bottom sheet */}
        {askVisible && !detailResult && (
          <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 bg-bg border-t border-border rounded-t-2xl shadow-2xl max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-center pt-2 pb-1 shrink-0">
              <div className="w-10 h-1 bg-border rounded-full" />
            </div>
            <div className="flex-1 overflow-y-auto">
              <AskBrain
                query={search.query}
                results={search.allResults}
                visible={askVisible}
                onClose={() => setAskVisible(false)}
                onFollowUp={handleFollowUp}
                explainResult={explainResult}
                onExplainDone={() => setExplainResult(null)}
                thread={aiAnswer.thread}
                onClearThread={aiAnswer.clearThread}
              />
            </div>
          </div>
        )}

        {/* Mobile filter drawer — above any bottom sheet */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-bg border-t border-border">
          <button
            onClick={() => setFiltersOpen(v => !v)}
            className="w-full text-xs text-gray-500 flex items-center justify-center gap-2 py-2.5"
          >
            <span>⊞</span> Filters {filtersOpen ? '▲' : '▼'}
          </button>
          {filtersOpen && (
            <div className="pb-4 px-4 max-h-60 overflow-y-auto border-t border-border">
              <SidebarFilters
                domains={domains}
                activeDomains={search.domains}
                domainCounts={search.domainCounts}
                onDomainsChange={d => { search.setDomains(d); setFiltersOpen(false) }}
                excludedDomains={search.excludedDomains}
                onExcludedDomainsChange={search.setExcludedDomains}
                minConfidence={search.minConfidence}
                onMinConfidenceChange={search.setMinConfidence}
                sources={search.allSources}
                activeSources={search.activeSources}
                sourceCounts={search.sourceCounts}
                onSourcesChange={search.setActiveSources}
                excludedSources={search.excludedSources}
                onExcludedSourcesChange={search.setExcludedSources}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
