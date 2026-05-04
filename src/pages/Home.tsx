import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchBar } from '../components/SearchBar'
import { DomainFilter } from '../components/DomainFilter'
import { StatsChip } from '../components/StatsChip'
import { fetchDomains, fetchStats } from '../api/search'
import type { SearchMode } from '../types'

const RECENT_KEY = 'nx_recent_searches'

function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') } catch { return [] }
}
function addRecent(q: string) {
  const prev = getRecent().filter(x => x !== q)
  localStorage.setItem(RECENT_KEY, JSON.stringify([q, ...prev].slice(0, 10)))
}

export function Home() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<SearchMode>('semantic')
  const [domain, setDomain] = useState('')
  const [domains, setDomains] = useState<string[]>([])
  const [stats, setStats] = useState({ total_patterns: 257000, total_vectors: 210000, domains: {} as Record<string, number> })
  const [recent, setRecent] = useState<string[]>(getRecent)

  useEffect(() => {
    fetchDomains().then(r => setDomains(r.domains)).catch(() => {})
    fetchStats().then(r => setStats(r)).catch(() => {})
  }, [])

  const submit = () => {
    if (!query.trim()) return
    addRecent(query.trim())
    setRecent(getRecent())
    const params = new URLSearchParams({ q: query.trim(), mode })
    if (domain) params.set('domain', domain)
    navigate(`/search?${params}`)
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
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
            onQueryChange={setQuery}
            onModeChange={setMode}
            onSubmit={submit}
            autoFocus
            size="lg"
          />
        </div>

        <div className="w-full mb-8">
          <DomainFilter domains={domains} activeDomain={domain} onChange={setDomain} variant="pills" />
        </div>

        {recent.length > 0 && (
          <div className="w-full">
            <p className="text-xs text-gray-600 uppercase tracking-wider mb-2">Recent searches</p>
            <div className="flex flex-wrap gap-2">
              {recent.map(r => (
                <button
                  key={r}
                  onClick={() => { setQuery(r); submit() }}
                  className="text-sm px-3 py-1 rounded-full bg-card border border-border text-gray-400 hover:text-gray-200 hover:border-amber-400/30 transition-colors"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
