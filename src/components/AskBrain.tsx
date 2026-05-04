import { useEffect } from 'react'
import { useAskBrain } from '../hooks/useAskBrain'
import type { SearchResult } from '../types'

interface Props {
  query: string
  results: SearchResult[]
  visible: boolean
  onClose: () => void
}

export function AskBrain({ query, results, visible, onClose }: Props) {
  const { answer, loading, error, ask, abort, reset } = useAskBrain()

  useEffect(() => {
    if (visible && query && results.length > 0) {
      ask(query, results)
    }
    if (!visible) reset()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, query])

  if (!visible) return null

  return (
    <aside className="w-full lg:w-80 shrink-0 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-sm font-medium text-gray-200">Brain 72B</span>
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <button onClick={abort} className="text-xs text-gray-500 hover:text-gray-200 transition-colors">
              Stop
            </button>
          )}
          <button onClick={onClose} className="text-gray-500 hover:text-gray-200 transition-colors text-sm">
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto min-h-0 max-h-[60vh] lg:max-h-none">
        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}
        {!error && !answer && loading && (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <span className="inline-block w-1 h-4 bg-amber-400 animate-pulse rounded" />
            Generating answer…
          </div>
        )}
        {answer && (
          <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
            {answer}
            {loading && <span className="inline-block w-1 h-4 bg-amber-400 animate-pulse rounded ml-0.5 align-middle" />}
          </div>
        )}
      </div>

      <div className="px-4 py-2 border-t border-border">
        <p className="text-xs text-gray-600">Based on top {Math.min(results.length, 5)} results</p>
      </div>
    </aside>
  )
}
