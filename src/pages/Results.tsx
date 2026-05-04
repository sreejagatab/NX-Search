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
import { addRecent } from '../lib/recentSearches'

export function Results() {
  const search = useSearch()
  const [searchParams] = useSearchParams()
  const [domains, setDomains] = useState<string[]>([])
  const [stats, setStats] = useState({ total_patterns: 257000, total_vectors: 210000 })
  const [askVisible, setAskVisible] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

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

  return (
    <div className="min-h-screen bg-bg flex flex-col">
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
              threshold={search.threshold}
              onQueryChange={search.setQuery}
              onModeChange={search.setMode}
              size="sm"
            />
          </div>
          <div className="hidden lg:flex items-center gap-2">
            <StatsChip
              totalPatterns={stats.total_patterns}
              totalVectors={stats.total_vectors}
              queryTimeMs={search.queryTimeMs}
            />
          </div>
          {search.allResults.length > 0 && (
            <button
              onClick={exportJson}
              className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-border text-gray-400 hover:border-amber-400/30 hover:text-gray-200 transition-colors hidden sm:block"
              title="Export results as JSON"
            >
              Export
            </button>
          )}
          <button
            onClick={() => setAskVisible(v => !v)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              askVisible
                ? 'bg-amber-400/10 text-amber-400 border-amber-400/30'
                : 'text-gray-400 border-border hover:border-amber-400/30 hover:text-gray-200'
            }`}
          >
            Ask Brain
          </button>
        </div>

        {/* Active filter chips */}
        <FilterChips
          query={search.query}
          domains={search.domains}
          mode={search.mode}
          sort={search.sort}
          threshold={search.threshold}
          minConfidence={search.minConfidence}
          activeSources={search.activeSources}
          onRemoveDomain={d => search.setDomains(search.domains.filter(x => x !== d))}
          onSetMode={search.setMode}
          onSetSort={search.setSort}
          onResetThreshold={() => search.setThreshold(0.7)}
          onResetConfidence={() => search.setMinConfidence(0)}
          onRemoveSource={s => search.setActiveSources(search.activeSources.filter(x => x !== s))}
        />
      </header>

      <div className="max-w-7xl mx-auto w-full flex gap-6 px-4 py-6">
        {/* Left sidebar */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-24">
            <SidebarFilters
              domains={domains}
              activeDomains={search.domains}
              domainCounts={search.domainCounts}
              onDomainsChange={search.setDomains}
              mode={search.mode}
              threshold={search.threshold}
              onThresholdChange={search.setThreshold}
              minConfidence={search.minConfidence}
              onMinConfidenceChange={search.setMinConfidence}
              sources={search.allSources}
              activeSources={search.activeSources}
              sourceCounts={search.sourceCounts}
              onSourcesChange={search.setActiveSources}
            />
          </div>
        </aside>

        {/* Mobile filter drawer */}
        <div className="lg:hidden w-full fixed bottom-0 left-0 right-0 z-20 bg-bg border-t border-border p-3">
          <button
            onClick={() => setFiltersOpen(v => !v)}
            className="w-full text-sm text-gray-400 flex items-center justify-center gap-2"
          >
            Filters {filtersOpen ? '▲' : '▼'}
          </button>
          {filtersOpen && (
            <div className="mt-3 pb-2 max-h-64 overflow-y-auto">
              <SidebarFilters
                domains={domains}
                activeDomains={search.domains}
                domainCounts={search.domainCounts}
                onDomainsChange={d => { search.setDomains(d); setFiltersOpen(false) }}
                mode={search.mode}
                threshold={search.threshold}
                onThresholdChange={search.setThreshold}
                minConfidence={search.minConfidence}
                onMinConfidenceChange={search.setMinConfidence}
                sources={search.allSources}
                activeSources={search.activeSources}
                sourceCounts={search.sourceCounts}
                onSourcesChange={search.setActiveSources}
              />
            </div>
          )}
        </div>

        {/* Main results */}
        <main className="flex-1 min-w-0 pb-20 lg:pb-0">
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
            />
          </ErrorBoundary>
        </main>

        {/* Right panel — Ask Brain */}
        <AskBrain
          query={search.query}
          results={search.allResults}
          visible={askVisible}
          onClose={() => setAskVisible(false)}
          onFollowUp={handleFollowUp}
        />
      </div>
    </div>
  )
}
