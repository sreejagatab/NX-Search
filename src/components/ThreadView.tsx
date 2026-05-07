import type { ThreadMessage } from '../hooks/useAIAnswer'

interface Props {
  thread: ThreadMessage[]
  onClear: () => void
}

export function ThreadView({ thread, onClear }: Props) {
  if (thread.length === 0) return null

  // Show prior exchanges (all but the last assistant turn which is shown live in AIModeCard)
  const priorExchanges: { query: string; answer: string }[] = []
  for (let i = 0; i + 1 < thread.length; i += 2) {
    const user = thread[i]
    const assistant = thread[i + 1]
    if (user?.role === 'user' && assistant?.role === 'assistant') {
      priorExchanges.push({ query: user.content, answer: assistant.content })
    }
  }

  if (priorExchanges.length === 0) return null

  return (
    <div className="mb-4 space-y-3">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] text-gray-600 uppercase tracking-wider font-medium">
          Thread · {priorExchanges.length} prior {priorExchanges.length === 1 ? 'exchange' : 'exchanges'}
        </span>
        <button
          onClick={onClear}
          className="text-[10px] text-gray-600 hover:text-red-400 transition-colors border border-border rounded px-2 py-0.5"
          title="Clear thread and start fresh"
        >
          New thread
        </button>
      </div>

      {priorExchanges.map((ex, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card/50 overflow-hidden text-sm"
        >
          {/* User query */}
          <div className="flex items-start gap-2 px-4 py-2.5 border-b border-border/50">
            <span className="text-amber-400/60 shrink-0 mt-0.5 text-xs">You</span>
            <p className="text-gray-400 text-xs leading-relaxed">{ex.query}</p>
          </div>
          {/* Assistant answer — collapsed to 3 lines */}
          <div className="px-4 py-2.5">
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">
              {ex.answer.replace(/\*\*(.+?)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1')}
            </p>
          </div>
        </div>
      ))}

      <div className="border-t border-border/30 pt-1" />
    </div>
  )
}
