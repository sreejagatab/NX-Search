import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchBar } from '../components/SearchBar'
import { DomainFilter } from '../components/DomainFilter'
import { StatsChip } from '../components/StatsChip'
import { OfflineBanner } from '../components/OfflineBanner'
import { fetchDomains, fetchStats } from '../api/search'
import { getRecent, timeAgo, getSaved, saveSearch, deleteSaved, type RecentSearch, type SavedSearch } from '../lib/recentSearches'
import type { SearchMode } from '../types'

export function Home() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [mode] = useState<SearchMode>('semantic')
  const [domains, setDomains] = useState<string[]>([])
  const [allDomains, setAllDomains] = useState<string[]>([])
  const [stats, setStats] = useState({ total_patterns: 257000, total_vectors: 210000, domains: {} as Record<string, number> })
  const [recent] = useState<RecentSearch[]>(getRecent)
  const [saved, setSaved] = useState<SavedSearch[]>(getSaved)
  const [saveNameInput, setSaveNameInput] = useState('')
  const [showSaveInput, setShowSaveInput] = useState(false)

  useEffect(() => {
    Promise.all([fetchDomains(), fetchStats()])
      .then(([d, s]) => { setAllDomains(d.domains); setStats(s) })
      .catch(() => {})
  }, [])

  const submit = () => {
    if (!query.trim()) return
    const params = new URLSearchParams({ q: query.trim(), mode })
    if (domains.length) params.set('domain', domains.join(','))
    navigate(`/search?${params}`)
  }

  const handleSave = () => {
    if (!saveNameInput.trim() || !query.trim()) return
    saveSearch({ name: saveNameInput.trim(), q: query.trim(), mode, domain: domains.join(',') })
    setSaved(getSaved())
    setSaveNameInput('')
    setShowSaveInput(false)
  }

  const handleDeleteSaved = (id: string) => {
    deleteSaved(id)
    setSaved(getSaved())
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <OfflineBanner />

      {/* Compact header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-amber-400 font-bold text-base tracking-tight">NX</span>
          <span className="text-gray-600 text-xs hidden sm:inline">NeuronX Search</span>
        </div>
        <StatsChip totalPatterns={stats.total_patterns} totalVectors={stats.total_vectors} />
      </header>

      {/* Main — centered, ~40% from top */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-2xl mx-auto w-full">

        {/* Wordmark + subtitle — compact */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-100 tracking-tight mb-1.5">
            <span className="text-amber-400">Neuron</span>X Search
          </h1>
          <p className="text-sm text-gray-600">
            {stats.total_patterns.toLocaleString()} patterns
            {allDomains.length > 0 ? ` · ${allDomains.length} domains` : ''}
          </p>
        </div>

        {/* Search bar */}
        <div className="w-full mb-3">
          <SearchBar
            query={query}
            mode={mode}
            domains={domains}
            onQueryChange={setQuery}
            onSubmit={submit}
            autoFocus
            size="lg"
          />
        </div>

        {/* Example queries — shown when no query typed */}
        {!query && (
          <div className="w-full mb-4 flex flex-wrap gap-2 justify-center">
            {[
              'semantic search in Python',
              'REST API design patterns',
              'SQL query optimization',
              'async error handling',
              'authentication best practices',
            ].map(ex => (
              <button
                key={ex}
                onClick={() => navigate(`/search?q=${encodeURIComponent(ex)}&mode=${mode}`)}
                className="text-xs px-3 py-1.5 rounded-full border border-border text-gray-500 hover:border-amber-400/40 hover:text-amber-400 transition-colors bg-card"
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        {/* Domain pills — single horizontal scrollable row */}
        {allDomains.length > 0 && (
          <div className="w-full mb-6 overflow-x-auto scrollbar-none pb-1">
            <DomainFilter domains={allDomains} activeDomains={domains} onChange={setDomains} variant="pills" />
          </div>
        )}

        {/* Save current search */}
        {query.trim() && (
          <div className="w-full mb-4">
            {showSaveInput ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={saveNameInput}
                  onChange={e => setSaveNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setShowSaveInput(false) }}
                  placeholder="Name this search…"
                  autoFocus
                  className="flex-1 text-sm px-3 py-1.5 bg-card border border-border rounded-lg text-gray-200 placeholder-gray-600 outline-none focus:border-amber-400/40"
                />
                <button onClick={handleSave} className="text-xs px-3 py-1.5 rounded-lg bg-amber-400/10 text-amber-400 border border-amber-400/20 hover:bg-amber-400/20 transition-colors">Save</button>
                <button onClick={() => setShowSaveInput(false)} className="text-xs text-gray-600 hover:text-gray-300">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setShowSaveInput(true)} className="text-xs text-gray-600 hover:text-amber-400 transition-colors">
                + Save this search
              </button>
            )}
          </div>
        )}

        {/* Saved + Recent — 2-column grid when both present */}
        {(saved.length > 0 || recent.length > 0) && (
          <div className={`w-full grid gap-6 ${saved.length > 0 && recent.length > 0 ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>

            {/* Saved searches */}
            {saved.length > 0 && (
              <section>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Saved</p>
                <div className="flex flex-col gap-1">
                  {saved.map(s => (
                    <div key={s.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-card border border-amber-400/10 text-gray-400 group hover:border-amber-400/20 transition-colors">
                      <button
                        onClick={() => navigate(`/search?q=${encodeURIComponent(s.q)}&mode=${s.mode}${s.domain ? `&domain=${s.domain}` : ''}`)}
                        className="flex items-center gap-2 flex-1 text-left min-w-0"
                      >
                        <span className="text-amber-400/50 text-xs shrink-0">★</span>
                        <span className="text-xs text-gray-300 truncate">{s.name}</span>
                      </button>
                      <button
                        onClick={() => handleDeleteSaved(s.id)}
                        className="opacity-0 group-hover:opacity-100 text-[10px] text-gray-700 hover:text-red-400 transition-all shrink-0"
                      >✕</button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Recent searches */}
            {recent.length > 0 && (
              <section>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Recent</p>
                <div className="flex flex-col gap-1">
                  {recent.slice(0, 8).map((r, i) => (
                    <button
                      key={`${i}-${r.q}-${r.timestamp || i}`}
                      onClick={() => navigate(`/search?q=${encodeURIComponent(r.q)}&mode=${r.mode}${r.domain ? `&domain=${r.domain}` : ''}`)}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-card border border-border text-left text-gray-400 hover:text-gray-200 hover:border-amber-400/20 transition-colors group"
                    >
                      <span className="text-gray-700 text-xs shrink-0">⌕</span>
                      <span className="text-xs text-gray-400 group-hover:text-gray-200 transition-colors truncate flex-1">{r.q}</span>
                      <span className="text-[10px] text-gray-700 shrink-0">{timeAgo(r.timestamp)}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
