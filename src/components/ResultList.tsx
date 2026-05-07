import { useRef, useState, useMemo } from 'react'
import type { SearchResult, SortField } from '../types'
import { ResultCard } from './ResultCard'
import { SkeletonList } from './Skeleton'
import { useResultKeyboard } from '../hooks/useResultKeyboard'
import { clusterResults } from '../lib/clusterResults'
import { getDensity, setDensity, DENSITY_CLASSES, type Density } from '../lib/density'

interface Props {
  results: SearchResult[]
  query: string
  loading: boolean
  isStale?: boolean
  error: string | null
  total: number
  filteredCount: number
  page: number
  totalPages: number
  sort: SortField
  pageSize: number
  localFilter: string
  onLocalFilterChange: (v: string) => void
  onPageChange: (page: number) => void
  onSortChange: (sort: SortField) => void
  onPageSizeChange: (size: number) => void
  onRetry?: () => void
  highlightId?: string
  onMoreLike?: (content: string) => void
  onCardClick?: (result: SearchResult) => void
  onExplain?: (result: SearchResult) => void
  compact?: boolean
  detailOpen?: boolean
}

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'similarity', label: 'Similarity' },
  { value: 'confidence', label: 'Confidence' },
  { value: 'domain', label: 'Domain' },
]

const PAGE_SIZE_OPTIONS = [5, 10, 20]

export function ResultList({
  results, query, loading, isStale, error, total, filteredCount, page, totalPages,
  sort, pageSize, localFilter, onLocalFilterChange,
  onPageChange, onSortChange, onPageSizeChange, onRetry, highlightId, onMoreLike, onCardClick, onExplain, compact, detailOpen,
}: Props) {
  const { setCardRef } = useResultKeyboard(results, { onOpen: onCardClick, onExplain })
  const filterInputRef = useRef<HTMLInputElement>(null)
  const [clustered, setClustered] = useState(false)
  const [collapsedClusters, setCollapsedClusters] = useState<Set<string>>(new Set())
  const [density, setDensityState] = useState<Density>(getDensity)

  const handleDensityChange = (d: Density) => {
    setDensityState(d)
    setDensity(d)
  }

  const densityCfg = DENSITY_CLASSES[density]

  const clusters = useMemo(() => clustered ? clusterResults(results) : [], [clustered, results])

  const toggleCluster = (id: string) => {
    setCollapsedClusters(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (loading && !isStale) return <SkeletonList count={5} />

  if (error) {
    return (
      <div className="bg-red-950/30 border border-red-800/50 rounded-xl p-5 text-sm">
        <div className="flex items-start gap-3">
          <span className="text-red-400 text-lg shrink-0">⚠</span>
          <div className="flex-1 min-w-0">
            <strong className="block text-red-300 mb-1">Search failed</strong>
            <p className="text-red-400/80 mb-4 leading-relaxed">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-xs px-4 py-2 rounded-lg bg-red-900/40 text-red-300 border border-red-700/50 hover:bg-red-900/60 hover:text-red-200 transition-colors"
              >
                Try again
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!loading && query && results.length === 0 && !localFilter) {
    return <EmptyState query={query} />
  }

  if (!query) return null

  return (
    <div className={isStale ? 'opacity-50 pointer-events-none transition-opacity' : 'transition-opacity'}>
      {/* Controls row */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        {/* Search within */}
        <div className="relative flex-1 min-w-[160px]">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-600 text-sm" aria-hidden>⌕</span>
          <input
            ref={filterInputRef}
            type="text"
            value={localFilter}
            onChange={e => onLocalFilterChange(e.target.value)}
            placeholder="Filter results…"
            className="w-full pl-7 pr-3 py-1.5 text-xs bg-card border border-border rounded-lg text-gray-300 placeholder-gray-600 outline-none focus:border-amber-400/40 transition-colors"
          />
          {localFilter && (
            <button onClick={() => onLocalFilterChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 text-xs">✕</button>
          )}
        </div>

        <p className="text-sm text-gray-500 whitespace-nowrap" aria-live="polite" aria-atomic="true">
          <span className="text-gray-300 font-medium">{filteredCount}</span>
          {filteredCount !== total && <span> / {total}</span>}
          {isStale && <span className="ml-1 text-amber-400/60 text-xs">updating…</span>}
        </p>

        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">Show:</span>
          {PAGE_SIZE_OPTIONS.map(n => (
            <button key={n} onClick={() => onPageSizeChange(n)}
              className={`text-xs px-2 py-1 rounded-md transition-colors ${pageSize === n ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' : 'text-gray-500 hover:text-gray-300 border border-transparent'}`}>
              {n}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">Sort:</span>
          {SORT_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => onSortChange(opt.value)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${sort === opt.value ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' : 'text-gray-500 hover:text-gray-300 border border-transparent'}`}>
              {opt.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setClustered(v => !v)}
          title="Group results by similarity clusters"
          className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${clustered ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' : 'text-gray-500 hover:text-gray-300 border-transparent'}`}
        >
          Cluster
        </button>

        <div className="flex items-center gap-0.5 border border-border rounded-md overflow-hidden">
          {(['compact', 'comfortable', 'spacious'] as Density[]).map(d => (
            <button
              key={d}
              onClick={() => handleDensityChange(d)}
              title={d}
              className={`text-xs px-2 py-1 transition-colors ${density === d ? 'bg-amber-400/10 text-amber-400' : 'text-gray-600 hover:text-gray-300'}`}
            >
              {d === 'compact' ? '▬' : d === 'comfortable' ? '▭' : '□'}
            </button>
          ))}
        </div>
      </div>

      {/* Keyboard hint */}
      {results.length > 0 && !compact && (
        <div className="hidden lg:flex items-center gap-3 text-[10px] text-gray-700 mb-2 px-0.5">
          <span><kbd className="border border-gray-700 rounded px-1 font-mono">j</kbd><kbd className="border border-gray-700 rounded px-1 font-mono ml-0.5">k</kbd> navigate</span>
          <span><kbd className="border border-gray-700 rounded px-1 font-mono">o</kbd> open</span>
          <span><kbd className="border border-gray-700 rounded px-1 font-mono">e</kbd> explain</span>
          <span><kbd className="border border-gray-700 rounded px-1 font-mono">c</kbd> copy</span>
          <span><kbd className="border border-gray-700 rounded px-1 font-mono">/</kbd> focus search</span>
        </div>
      )}

      {localFilter && filteredCount === 0 && (
        <p className="text-sm text-gray-500 py-8 text-center">No results match "{localFilter}"</p>
      )}

      {clustered ? (
        <div className="space-y-4" aria-busy={loading}>
          {clusters.map(cluster => {
            const collapsed = collapsedClusters.has(cluster.id)
            return (
              <div key={cluster.id} className="border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleCluster(cluster.id)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-subtle hover:bg-card transition-colors text-left"
                >
                  <span className="text-xs text-gray-400 font-medium">{cluster.label}</span>
                  <span className="text-gray-600 text-xs">{collapsed ? '▼' : '▲'}</span>
                </button>
                {!collapsed && (
                  <div className={compact ? 'grid grid-cols-1 lg:grid-cols-2 gap-2 p-2' : 'divide-y divide-border'}>
                    {cluster.results.map((r, i) => (
                      <div key={r.id} className={compact ? '' : 'px-2 py-2'}>
                        <ResultCard
                          result={r}
                          query={query}
                          index={i}
                          onRegisterRef={setCardRef}
                          highlightId={highlightId}
                          onMoreLike={onMoreLike}
                          onCardClick={onCardClick}
                          onExplain={onExplain}
                          cardPadding={compact ? 'px-3 py-3' : densityCfg.card}
                          snippetLength={compact ? 120 : densityCfg.snippet}
                          disablePopover={detailOpen}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className={compact ? 'grid grid-cols-1 lg:grid-cols-2 gap-2' : 'space-y-3'} aria-busy={loading}>
          {results.map((r, i) => (
            <ResultCard
              key={r.id}
              result={r}
              query={query}
              index={i}
              onRegisterRef={setCardRef}
              highlightId={highlightId}
              onMoreLike={onMoreLike}
              onCardClick={onCardClick}
              onExplain={onExplain}
              cardPadding={compact ? 'px-3 py-3' : densityCfg.card}
              snippetLength={compact ? 120 : densityCfg.snippet}
              disablePopover={detailOpen}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button onClick={() => onPageChange(page - 1)} disabled={page <= 1}
            className="px-3 py-1.5 rounded-md text-sm border border-border text-gray-400 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            ← Prev
          </button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-md text-sm border border-border text-gray-400 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            Next →
          </button>
        </div>
      )}
    </div>
  )
}

function EmptyState({ query }: { query: string }) {
  const tips = [
    'Use fewer or simpler keywords',
    'Remove domain: or source: filters if active',
    'Try "Research" or "Web" focus mode from the search bar',
    'Use "≈ More" on a related result to find similar content',
  ]
  return (
    <div className="text-center py-16 px-4">
      <div className="text-5xl mb-4 opacity-30">◎</div>
      <p className="text-lg text-gray-300 mb-1">No results for <span className="text-amber-400/80">"{query}"</span></p>
      <p className="text-sm text-gray-600 mb-6">The search ran but found nothing matching your query.</p>
      <ul className="inline-flex flex-col gap-2 text-left text-sm text-gray-500">
        {tips.map(tip => (
          <li key={tip} className="flex items-start gap-2">
            <span className="text-amber-400/40 shrink-0 mt-0.5">›</span>
            {tip}
          </li>
        ))}
      </ul>
    </div>
  )
}
