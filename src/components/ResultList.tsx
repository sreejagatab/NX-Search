import { useRef } from 'react'
import type { SearchResult, SortField } from '../types'
import { ResultCard } from './ResultCard'
import { SkeletonList } from './Skeleton'
import { useResultKeyboard } from '../hooks/useResultKeyboard'

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
}

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'similarity', label: 'Similarity' },
  { value: 'confidence', label: 'Confidence' },
  { value: 'domain', label: 'Domain' },
]

const PAGE_SIZE_OPTIONS = [20, 50, 100]

export function ResultList({
  results, query, loading, isStale, error, total, filteredCount, page, totalPages,
  sort, pageSize, localFilter, onLocalFilterChange,
  onPageChange, onSortChange, onPageSizeChange, onRetry, highlightId,
}: Props) {
  const { setCardRef } = useResultKeyboard(results.length)
  const filterInputRef = useRef<HTMLInputElement>(null)

  if (loading && !isStale) return <SkeletonList count={5} />

  if (error) {
    return (
      <div className="bg-red-950/30 border border-red-800/50 rounded-lg p-4 text-red-400 text-sm">
        <strong className="block mb-1">Search error</strong>
        <p className="mb-3">{error}</p>
        {onRetry && (
          <button onClick={onRetry} className="text-xs px-3 py-1.5 rounded border border-red-700 hover:bg-red-900/30 transition-colors">
            Retry
          </button>
        )}
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
      </div>

      {localFilter && filteredCount === 0 && (
        <p className="text-sm text-gray-500 py-8 text-center">No results match "{localFilter}"</p>
      )}

      <div className="space-y-3" aria-busy={loading}>
        {results.map((r, i) => (
          <ResultCard
            key={r.id}
            result={r}
            query={query}
            index={i}
            onRegisterRef={setCardRef}
            highlightId={highlightId}
          />
        ))}
      </div>

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
  return (
    <div className="text-center py-16 text-gray-500">
      <svg className="mx-auto mb-4 w-16 h-16 opacity-20" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="32" cy="32" r="12" />
        <circle cx="32" cy="32" r="24" strokeDasharray="4 3" />
        <line x1="32" y1="8" x2="32" y2="4" /><line x1="32" y1="60" x2="32" y2="56" />
        <line x1="8" y1="32" x2="4" y2="32" /><line x1="60" y1="32" x2="56" y2="32" />
        <circle cx="20" cy="20" r="2" fill="currentColor" stroke="none" />
        <circle cx="44" cy="20" r="2" fill="currentColor" stroke="none" />
        <circle cx="44" cy="44" r="2" fill="currentColor" stroke="none" />
        <circle cx="20" cy="44" r="2" fill="currentColor" stroke="none" />
        <line x1="32" y1="20" x2="20" y2="20" strokeDasharray="2 2" />
        <line x1="32" y1="20" x2="44" y2="20" strokeDasharray="2 2" />
        <line x1="32" y1="44" x2="20" y2="44" strokeDasharray="2 2" />
        <line x1="32" y1="44" x2="44" y2="44" strokeDasharray="2 2" />
      </svg>
      <p className="text-lg mb-1">No results for <span className="text-gray-300">"{query}"</span></p>
      <p className="text-sm">Try broader terms, lower the similarity threshold, or switch to Hybrid mode</p>
    </div>
  )
}
