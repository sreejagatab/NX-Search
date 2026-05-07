import { useState } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useUrlSummarizer } from '../hooks/useUrlSummarizer'

interface Props {
  open: boolean
  onClose: () => void
  onSearch?: (q: string) => void
}

function isValidUrl(s: string): boolean {
  try { new URL(s.startsWith('http') ? s : `https://${s}`); return true } catch { return false }
}

function normalizeUrl(s: string): string {
  return s.startsWith('http') ? s : `https://${s}`
}

export function UrlSummarizer({ open, onClose, onSearch }: Props) {
  const [input, setInput] = useState('')
  const { loading, error, rawStream, result, summarize, abort, reset } = useUrlSummarizer()

  if (!open) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValidUrl(input)) return
    summarize(normalizeUrl(input))
  }

  function handleClose() {
    abort()
    reset()
    setInput('')
    onClose()
  }

  function handleNewUrl() {
    reset()
    setInput('')
  }

  const showStream = loading && rawStream

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4" onClick={e => { if (e.target === e.currentTarget) handleClose() }}>
      <div className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 text-sm">🔗</span>
            <span className="text-sm font-medium text-gray-200">URL Summarizer</span>
            {loading && <span className="text-[10px] text-gray-600 border border-gray-700 rounded px-1 animate-pulse">fetching…</span>}
          </div>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-200 transition-colors">✕</button>
        </div>

        {/* URL input */}
        {!result && (
          <form onSubmit={handleSubmit} className="p-4 shrink-0">
            <div className="flex gap-2">
              <input
                autoFocus
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Paste any URL — docs, articles, GitHub repos…"
                className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-amber-400/50 transition-colors"
              />
              <button
                type="submit"
                disabled={!isValidUrl(input) || loading}
                className="px-3 py-2 text-xs bg-amber-400/15 text-amber-400 border border-amber-400/30 rounded-lg hover:bg-amber-400/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
              >
                {loading ? '…' : 'Summarize'}
              </button>
            </div>
          </form>
        )}

        {/* Streaming / result */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

          {showStream && !result && (
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Generating summary…</p>
              <div
                className="prose-dark text-sm leading-relaxed text-gray-300"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(rawStream, { async: false }) as string) + '<span class="inline-block w-1 h-4 bg-amber-400 animate-pulse rounded align-middle ml-0.5"></span>' }}
              />
              <button onClick={abort} className="mt-3 text-xs text-gray-600 hover:text-gray-300 transition-colors">Stop</button>
            </div>
          )}

          {result && (
            <div className="space-y-4 mt-1">
              <div>
                <p className="text-[10px] text-amber-400/60 uppercase tracking-wider mb-1 truncate">{result.url}</p>
                <p className="text-sm text-gray-300 leading-relaxed">{result.summary}</p>
              </div>

              {result.keyPoints.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Key points</p>
                  <ul className="space-y-1.5">
                    {result.keyPoints.map((pt, i) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-400">
                        <span className="text-amber-400/50 shrink-0 mt-0.5">·</span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.suggestedSearches.length > 0 && onSearch && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Explore further</p>
                  <div className="flex flex-col gap-1">
                    {result.suggestedSearches.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => { onSearch(q); handleClose() }}
                        className="text-left text-xs text-gray-400 hover:text-amber-400 transition-colors py-1 px-2 rounded hover:bg-subtle"
                      >
                        → {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleNewUrl}
                className="text-xs text-gray-600 hover:text-gray-300 transition-colors border border-border rounded px-2 py-1"
              >
                Summarize another URL
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
