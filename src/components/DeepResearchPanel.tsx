import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useDeepResearch } from '../hooks/useDeepResearch'
import type { SearchResult } from '../types'

interface Props {
  open: boolean
  query: string
  domain?: string
  onClose: () => void
  onSearch?: (q: string) => void
  onResultsReady?: (results: SearchResult[]) => void
}

export function DeepResearchPanel({ open, query, domain, onClose, onSearch }: Props) {
  const { state, run, abort, reset } = useDeepResearch()

  if (!open) return null

  function handleStart() {
    if (query.trim()) run(query, domain)
  }

  function handleClose() {
    abort()
    reset()
    onClose()
  }

  const { phase, subQueries, completedQueries, totalQueries, mergedResults, report, error } = state
  const progress = totalQueries > 0 ? Math.round((completedQueries / totalQueries) * 100) : 0
  const isActive = phase === 'planning' || phase === 'searching' || phase === 'synthesizing'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4" onClick={e => { if (e.target === e.currentTarget) handleClose() }}>
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-violet-400 text-lg">🔬</span>
            <div>
              <h2 className="text-sm font-semibold text-gray-200">Deep Research</h2>
              <p className="text-[10px] text-gray-600">Multi-query synthesis · {mergedResults.length > 0 ? `${mergedResults.length} sources` : 'up to 4 queries'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isActive && <button onClick={abort} className="text-xs text-gray-500 hover:text-gray-200 border border-border rounded px-2 py-1 transition-colors">Stop</button>}
            <button onClick={handleClose} className="text-gray-500 hover:text-gray-200 transition-colors">✕</button>
          </div>
        </div>

        {/* Idle state */}
        {phase === 'idle' && (
          <div className="p-6 text-center">
            <p className="text-gray-400 text-sm mb-1">Research: <span className="text-amber-400">"{query}"</span></p>
            <p className="text-xs text-gray-600 mb-6">Chains 4 search queries, merges results, synthesizes a structured report</p>
            <button
              onClick={handleStart}
              disabled={!query.trim()}
              className="px-6 py-2.5 bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-xl hover:bg-violet-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              Start Deep Research
            </button>
          </div>
        )}

        {/* Progress */}
        {(phase === 'planning' || phase === 'searching') && (
          <div className="p-5 space-y-4 shrink-0">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-gray-500">
                  {phase === 'planning' ? 'Planning sub-queries…' : `Searching ${completedQueries}/${totalQueries}`}
                </p>
                <span className="text-xs text-violet-400">{progress}%</span>
              </div>
              <div className="h-1.5 bg-subtle rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500 rounded-full transition-all duration-500"
                  style={{ width: `${phase === 'planning' ? 15 : progress}%` }}
                />
              </div>
            </div>
            {subQueries.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider">Sub-queries</p>
                {[query, ...subQueries].map((q, i) => (
                  <div key={i} className={`flex items-center gap-2 text-xs ${i < completedQueries ? 'text-gray-500' : i === completedQueries ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className="shrink-0 w-4 text-center">
                      {i < completedQueries ? '✓' : i === completedQueries ? '…' : '○'}
                    </span>
                    <span className="truncate">{q}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Synthesizing indicator */}
        {phase === 'synthesizing' && report.length === 0 && (
          <div className="p-5 shrink-0">
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span className="inline-block w-1 h-4 bg-violet-400 animate-pulse rounded" />
              Synthesizing report from {mergedResults.length} sources…
            </div>
          </div>
        )}

        {/* Report */}
        {report && (
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-5">
              <div
                className="prose-dark text-sm leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(marked.parse(report, { async: false }) as string)
                    + (phase === 'synthesizing' ? '<span class="inline-block w-1 h-4 bg-violet-400 animate-pulse rounded align-middle ml-0.5"></span>' : '')
                }}
              />
            </div>

            {/* Sources */}
            {phase === 'done' && mergedResults.length > 0 && (
              <div className="px-5 pb-5">
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">{mergedResults.length} sources searched</p>
                <div className="flex flex-wrap gap-1.5">
                  {[...new Set(mergedResults.map(r => r.domain))].slice(0, 8).map(d => (
                    <span key={d} className="text-[10px] bg-subtle border border-border rounded-full px-2 py-0.5 text-gray-500">{d}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {error && <p className="px-5 py-3 text-sm text-red-400">{error}</p>}

        {/* Footer */}
        {phase === 'done' && report && (
          <div className="px-5 py-3 border-t border-border shrink-0 flex items-center justify-between">
            <button
              onClick={() => { navigator.clipboard.writeText(report).catch(() => {}) }}
              className="text-xs text-gray-500 hover:text-amber-400 transition-colors"
            >
              Copy report
            </button>
            <div className="flex items-center gap-2">
              {onSearch && subQueries.slice(0, 2).map(q => (
                <button
                  key={q}
                  onClick={() => { onSearch(q); handleClose() }}
                  className="text-[10px] text-gray-600 hover:text-violet-400 transition-colors border border-border rounded px-2 py-1"
                >
                  Search: {q.slice(0, 25)}…
                </button>
              ))}
              <button onClick={reset} className="text-[10px] text-gray-600 hover:text-gray-300 transition-colors border border-border rounded px-2 py-1">
                New research
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
