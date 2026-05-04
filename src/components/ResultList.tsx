import type { SearchResult, SortField } from '../types'
import { ResultCard } from './ResultCard'
import { SkeletonList } from './Skeleton'

interface Props {
  results: SearchResult[]
  query: string
  loading: boolean
  error: string | null
  total: number
  page: number
  totalPages: number
  sort: SortField
  onPageChange: (page: number) => void
  onSortChange: (sort: SortField) => void
}

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'similarity', label: 'Similarity' },
  { value: 'confidence', label: 'Confidence' },
  { value: 'domain', label: 'Domain' },
]

export function ResultList({ results, query, loading, error, total, page, totalPages, sort, onPageChange, onSortChange }: Props) {
  if (loading) return <SkeletonList count={5} />

  if (error) {
    return (
      <div className="bg-red-950/30 border border-red-800/50 rounded-lg p-4 text-red-400 text-sm">
        <strong className="block mb-1">Search error</strong>
        {error}
      </div>
    )
  }

  if (!loading && query && results.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <div className="text-4xl mb-3">∅</div>
        <p className="text-lg mb-1">No results for <span className="text-gray-300">"{query}"</span></p>
        <p className="text-sm">Try broader terms or switch to Semantic mode</p>
      </div>
    )
  }

  if (!query) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">
          <span className="text-gray-300 font-medium">{total}</span> results
        </p>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 mr-1">Sort:</span>
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onSortChange(opt.value)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                sort === opt.value
                  ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                  : 'text-gray-500 hover:text-gray-300 border border-transparent'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {results.map(r => (
          <ResultCard key={r.id} result={r} query={query} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-md text-sm border border-border text-gray-400 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← Prev
          </button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-md text-sm border border-border text-gray-400 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
