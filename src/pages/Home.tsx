import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchBar } from '../components/SearchBar'
import { DomainFilter } from '../components/DomainFilter'
import { StatsChip } from '../components/StatsChip'
import { OfflineBanner } from '../components/OfflineBanner'
import { fetchDomains, fetchStats } from '../api/search'
import { getRecent, addRecent, timeAgo, type RecentSearch } from '../lib/recentSearches'
import type { SearchMode } from '../types'

export function Home() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<SearchMode>('semantic')
  const [domains, setDomains] = useState<string[]>([])
  const [allDomains, setAllDomains] = useState<string[]>([])
  const [stats, setStats] = useState({ total_patterns: 257000, total_vectors: 210000, domains: {} as Record<string, number> })
  const [recent, setRecent] = useState<RecentSearch[]>(getRecent)

  // parallel initial fetch (task 27)
  useEffect(() => {
    Promise.all([fetchDomains(), fetchStats()])
      .then(([d, s]) => { setAllDomains(d.domains); setStats(s) })
      .catch(() => {})
  }, [])

  const submit = () => {
    if (!query.trim()) return
    const entry: RecentSearch = { q: query.trim(), mode, domain: domains.join(','), resultCount: 0, queryTimeMs: 0, timestamp: Date.now() }
    addRecent(entry)
    setRecent(getRecent())
    const params = new URLSearchParams({ q: query.trim(), mode })
    if (domains.length) params.set('domain', domains.join(','))
    navigate(`/search?${params}`)
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <OfflineBanner />
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="text-amber-400 font-bold text-xl tracking-tight">NeuronX</span>
          <span className="text-gray-600 text-sm">Search</span>
        </div>
        <StatsChip totalPatterns={stats.total_patterns} totalVectors={stats.total_vectors} />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 max-w-3xl mx-auto w-full">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-100 mb-3">
            Search <span className="text-amber-400">NeuronX</span>
          </h1>
          <p className="text-gray-500">
            {stats.total_patterns.toLocaleString()} learned patterns · {stats.total_vectors.toLocaleString()} FAISS vectors · 16 domains
          </p>
        </div>

        <div className="w-full mb-4">
          <SearchBar
            query={query}
            mode={mode}
            domains={domains}
            onQueryChange={setQuery}
            onModeChange={setMode}
            onSubmit={submit}
            autoFocus
            size="lg"
          />
        </div>

        <div className="w-full mb-8">
          <DomainFilter domains={allDomains} activeDomains={domains} onChange={setDomains} variant="pills" />
        </div>

        {recent.length > 0 && (
          <div className="w-full">
            <p className="text-xs text-gray-600 uppercase tracking-wider mb-2">Recent searches</p>
            <div className="flex flex-col gap-1.5">
              {recent.map(r => (
                <button
                  key={r.q + r.timestamp}
                  onClick={() => navigate(`/search?q=${encodeURIComponent(r.q)}&mode=${r.mode}${r.domain ? `&domain=${r.domain}` : ''}`)}
                  className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-card border border-border text-gray-400 hover:text-gray-200 hover:border-amber-400/30 transition-colors group"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-gray-600">⌕</span>
                    <span className="group-hover:text-gray-100 transition-colors">{r.q}</span>
                    {r.domain && <span className="text-xs text-gray-600">{r.domain}</span>}
                  </span>
                  <span className="flex items-center gap-3 text-xs text-gray-600 shrink-0">
                    {r.resultCount > 0 && <span>{r.resultCount} results</span>}
                    {r.queryTimeMs > 0 && <span>{r.queryTimeMs}ms</span>}
                    <span>{timeAgo(r.timestamp)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
