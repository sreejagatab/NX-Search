import { useState } from 'react'
import type { SearchResult } from '../types'
import { DomainBadge } from './DomainFilter'

interface Props {
  result: SearchResult
  query: string
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const words = query.trim().split(/\s+/).filter(Boolean)
  const pattern = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
  const parts = text.split(pattern)
  return parts.map((part, i) =>
    pattern.test(part) ? <mark key={i} className="bg-amber-400/20 text-amber-300 rounded px-0.5">{part}</mark> : part
  )
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  const color = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-400' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-subtle rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
    </div>
  )
}

export function ResultCard({ result, query }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const snippet = result.content.length > 200 ? result.content.slice(0, 200) + '…' : result.content

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await navigator.clipboard.writeText(result.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <>
      <article
        className="bg-card border border-border rounded-lg p-4 hover:border-amber-400/30 transition-colors cursor-pointer group"
        onClick={() => setExpanded(true)}
        data-testid="result-card"
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <DomainBadge domain={result.domain} />
            {result.source && (
              <span className="text-xs text-gray-500 border border-border rounded px-1.5 py-0.5">{result.source}</span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-500">{(result.similarity * 100).toFixed(0)}% sim</span>
            <button
              onClick={copy}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-gray-200 text-xs px-2 py-0.5 rounded border border-border"
              title="Copy content"
            >
              {copied ? '✓' : 'Copy'}
            </button>
          </div>
        </div>

        <p className="text-sm text-gray-300 leading-relaxed mb-3" data-testid="card-snippet">
          {highlight(snippet, query)}
        </p>

        <ConfidenceBar value={result.confidence} />
      </article>

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setExpanded(false)}
        >
          <div
            className="bg-card border border-border rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <DomainBadge domain={result.domain} />
                {result.source && (
                  <span className="text-xs text-gray-500 border border-border rounded px-1.5 py-0.5">{result.source}</span>
                )}
              </div>
              <button
                onClick={() => setExpanded(false)}
                className="text-gray-500 hover:text-gray-200 transition-colors text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
              <span>Similarity: <strong className="text-gray-300">{(result.similarity * 100).toFixed(1)}%</strong></span>
              <span>Confidence: <strong className="text-gray-300">{(result.confidence * 100).toFixed(1)}%</strong></span>
            </div>

            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed bg-bg rounded-lg p-4 mb-4 overflow-x-auto">
              {highlight(result.content, query)}
            </pre>

            <div className="flex justify-end">
              <button
                onClick={copy}
                className="text-sm px-4 py-2 rounded-lg bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 transition-colors border border-amber-400/20"
              >
                {copied ? 'Copied!' : 'Copy content'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
