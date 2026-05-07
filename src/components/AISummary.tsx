import { useState } from 'react'
import type { SearchResult } from '../types'
import { CitationText } from './CitationText'

interface Props {
  summary: string
  intent?: string
  enginesUsed?: string[]
  sources?: Record<string, number>
  queryTimeMs: number
  relatedSearches?: string[]
  results?: SearchResult[]
  onRelatedClick?: (q: string) => void
}

export function AISummary({ summary, intent, enginesUsed = [], sources = {}, queryTimeMs, relatedSearches = [], results = [], onRelatedClick }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  if (!summary && !intent) return null

  const totalResults = Object.values(sources).reduce((a, b) => a + b, 0)

  return (
    <div className="mb-4 rounded-xl border border-amber-400/20 bg-amber-400/5 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-amber-400/10">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-amber-400 font-medium">AI Summary</span>
          {intent && (
            <span className="text-[10px] text-gray-500 border border-border rounded-full px-2 py-0.5 capitalize">{intent}</span>
          )}
          {enginesUsed.map(e => (
            <span key={e} className="text-[10px] text-gray-600 border border-border rounded-full px-2 py-0.5">{e}</span>
          ))}
          {totalResults > 0 && (
            <span className="text-[10px] text-gray-600">{totalResults} results</span>
          )}
          {queryTimeMs > 0 && (
            <span className="text-[10px] text-gray-700">{(queryTimeMs / 1000).toFixed(1)}s</span>
          )}
        </div>
        {summary && (
          <button
            onClick={() => setCollapsed(v => !v)}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors shrink-0"
          >
            {collapsed ? 'show ▼' : 'hide ▲'}
          </button>
        )}
      </div>

      {/* Source breakdown */}
      {Object.keys(sources).length > 0 && !collapsed && (
        <div className="flex items-center gap-3 px-4 py-1.5 border-b border-amber-400/10 flex-wrap">
          {Object.entries(sources).map(([src, count]) => (
            <span key={src} className="text-[10px] text-gray-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400/40 inline-block" />
              {src} ({count})
            </span>
          ))}
        </div>
      )}

      {/* Summary text with inline citation formatting */}
      {summary && !collapsed && (
        <p className="px-4 py-3 text-sm text-gray-300 leading-relaxed">
          <CitationText text={summary} results={results} />
        </p>
      )}

      {/* Related searches */}
      {relatedSearches.length > 0 && !collapsed && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-t border-amber-400/10 flex-wrap">
          <span className="text-[10px] text-gray-600 shrink-0">Related:</span>
          {relatedSearches.map(q => (
            <button
              key={q}
              onClick={() => onRelatedClick?.(q)}
              className="text-[10px] text-gray-400 hover:text-amber-400 border border-border hover:border-amber-400/30 rounded-full px-2 py-0.5 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
