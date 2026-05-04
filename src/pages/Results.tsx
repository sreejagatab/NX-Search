import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SearchBar } from '../components/SearchBar'
import { DomainFilter } from '../components/DomainFilter'
import { ResultList } from '../components/ResultList'
import { AskBrain } from '../components/AskBrain'
import { StatsChip } from '../components/StatsChip'
import { useSearch } from '../hooks/useSearch'
import { fetchDomains, fetchStats } from '../api/search'

const RECENT_KEY = 'nx_recent_searches'

function addRecent(q: string) {
  try {
    const prev: string[] = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    const next = [q, ...prev.filter(x => x !== q)].slice(0, 10)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch { /* ignore */ }
}

export function Results() {
  const search = useSearch()
  const [domains, setDomains] = useState<string[]>([])
  const [stats, setStats] = useState({ total_patterns: 257000, total_vectors: 210000 })
  const [askVisible, setAskVisible] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    fetchDomains().then(r => setDomains(r.domains)).catch(() => {})
    fetchStats().then(r => setStats(r)).catch(() => {})
  }, [])

  useEffect(() => {
    if (search.query) addRecent(search.query)
  }, [search.query])

  const domainCounts = search.allResults.reduce<Record<string, number>>((acc, r) => {
    acc[r.domain] = (acc[r.domain] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-bg/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link to="/" className="text-amber-400 font-bold text-lg tracking-tight shrink-0">NX</Link>
          <div className="flex-1 min-w-0">
            <SearchBar
              query={search.query}
              mode={search.mode}
              onQueryChange={search.setQuery}
              onModeChange={search.setMode}
              size="sm"
            />
          </div>
          <div className="hidden lg:block">
            <StatsChip
              totalPatterns={stats.total_patterns}
              totalVectors={stats.total_vectors}
              queryTimeMs={search.queryTimeMs}
            />
          </div>
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
      </header>

      <div className="max-w-7xl mx-auto w-full flex gap-6 px-4 py-6">
        {/* Left sidebar — domain filters */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-20">
            <p className="text-xs text-gray-600 uppercase tracking-wider mb-3">Domains</p>
            <DomainFilter
              domains={domains}
              activeDomain={search.domain}
              domainCounts={domainCounts}
              onChange={search.setDomain}
              variant="checkboxes"
            />
          </div>
        </aside>

        {/* Mobile domain filter toggle */}
        <div className="lg:hidden w-full fixed bottom-0 left-0 right-0 z-20 bg-bg border-t border-border p-3">
          <button
            onClick={() => setFiltersOpen(v => !v)}
            className="w-full text-sm text-gray-400 flex items-center justify-center gap-2"
          >
            Filters {filtersOpen ? '▲' : '▼'}
          </button>
          {filtersOpen && (
            <div className="mt-3 pb-2">
              <DomainFilter
                domains={domains}
                activeDomain={search.domain}
                domainCounts={domainCounts}
                onChange={(d) => { search.setDomain(d); setFiltersOpen(false) }}
                variant="pills"
              />
            </div>
          )}
        </div>

        {/* Main results */}
        <main className="flex-1 min-w-0 pb-20 lg:pb-0">
          <ResultList
            results={search.results}
            query={search.query}
            loading={search.loading}
            error={search.error}
            total={search.total}
            page={search.page}
            totalPages={search.totalPages}
            sort={search.sort}
            onPageChange={search.setPage}
            onSortChange={search.setSort}
          />
        </main>

        {/* Right panel — Ask Brain */}
        <AskBrain
          query={search.query}
          results={search.allResults}
          visible={askVisible}
          onClose={() => setAskVisible(false)}
        />
      </div>
    </div>
  )
}
