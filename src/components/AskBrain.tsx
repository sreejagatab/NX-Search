import { useEffect, useRef, useState, useCallback } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useAskBrain } from '../hooks/useAskBrain'
import { ANSWER_STYLES } from '../api/search'
import type { AnswerStyle } from '../api/search'
import type { SearchResult } from '../types'
import type { ThreadMessage } from '../hooks/useAIAnswer'
import { ThreadView } from './ThreadView'

interface Props {
  query: string
  results: SearchResult[]
  visible: boolean
  onClose: () => void
  onFollowUp?: (q: string) => void
  explainResult?: SearchResult | null
  onExplainDone?: () => void
  thread?: ThreadMessage[]
  onClearThread?: () => void
  onExchange?: (q: string, a: string) => void
}

// Minimal safe markdown render
function renderMarkdown(text: string): string {
  const raw = marked.parse(text, { async: false }) as string
  return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } })
}

// Extract 3 follow-up suggestions from the tail of an answer
function extractFollowUps(answer: string, query: string): string[] {
  const sentences = answer.split(/[.!?]\s+/).filter(s => s.length > 10 && s.length < 100)
  const last = sentences.slice(-6)
  const candidates = last
    .map(s => s.trim().replace(/^[^a-zA-Z]+/, ''))
    .filter(s => s.length > 5 && !s.toLowerCase().startsWith('the '))
    .slice(0, 3)
  if (candidates.length >= 2) return candidates
  // fallback: prepend "How to" / "What is" to the original query
  return [`How does ${query} work?`, `Best practices for ${query}`, `${query} examples`].slice(0, 3)
}

// Parse [1], [2] citations from answer text
function parseCitations(answer: string): Set<number> {
  const found = new Set<number>()
  const matches = answer.matchAll(/\[(\d+)\]/g)
  for (const m of matches) found.add(parseInt(m[1]))
  return found
}

export function AskBrain({ query, results, visible, onClose, onFollowUp, explainResult, onExplainDone, thread = [], onClearThread, onExchange }: Props) {
  const { answer, loading, error, ask, abort, reset } = useAskBrain()
  const [lastQuery, setLastQuery] = useState('')
  const [copied, setCopied] = useState(false)
  const [answerStyle, setAnswerStyle] = useState<AnswerStyle>(() => (localStorage.getItem('nx-answer-style') as AnswerStyle) ?? 'detailed')
  const answerRef = useRef<HTMLDivElement>(null)

  const triggerAsk = useCallback(() => {
    if (query && results.length > 0) { ask(query, results, answerStyle, onExchange); setLastQuery(query) }
  }, [query, results, ask, answerStyle, onExchange])

  // Handle per-result explain mode
  useEffect(() => {
    if (visible && explainResult) {
      const explainQuery = `Explain this in detail: ${explainResult.title ?? explainResult.domain}`
      ask(explainQuery, [explainResult], 'detailed', onExchange)
      setLastQuery(explainQuery)
      onExplainDone?.()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [explainResult])

  useEffect(() => {
    // Use fresh triggerAsk so it picks up latest results/answerStyle
    if (visible && query && query !== lastQuery && !explainResult) triggerAsk()
    if (!visible && !lastQuery) reset()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, query, triggerAsk])

  // auto-scroll answer as tokens arrive
  useEffect(() => {
    if (answerRef.current) answerRef.current.scrollTop = answerRef.current.scrollHeight
  }, [answer])

  const copyAnswer = async () => {
    await navigator.clipboard.writeText(answer)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  const citations = answer ? parseCitations(answer) : new Set<number>()
  const citedResults = results.slice(0, 5).filter((_, i) => citations.has(i + 1))
  const followUps = !loading && answer.length > 100 ? extractFollowUps(answer, query) : []

  if (!visible) return null

  const isCached = answer && query === lastQuery && !loading

  return (
    <aside className="w-full lg:w-80 shrink-0 bg-card border border-border rounded-xl overflow-hidden flex flex-col max-h-[calc(100vh-100px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-sm font-medium text-gray-200">Brain 72B</span>
          {isCached && <span className="text-[10px] text-gray-600 border border-gray-700 rounded px-1">cached</span>}
        </div>
        <div className="flex items-center gap-2">
          {/* Answer style selector */}
          {!loading && (
            <div className="flex items-center gap-0.5 bg-subtle rounded-lg p-0.5 border border-border">
              {ANSWER_STYLES.map(s => (
                <button
                  key={s.value}
                  onClick={() => { setAnswerStyle(s.value); localStorage.setItem('nx-answer-style', s.value) }}
                  className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${answerStyle === s.value ? 'bg-amber-400/20 text-amber-400' : 'text-gray-600 hover:text-gray-300'}`}
                  title={`Style: ${s.label}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
          {!loading && answer && (
            <button onClick={triggerAsk} className="text-xs text-gray-500 hover:text-gray-200 transition-colors" title="Regenerate answer">↺</button>
          )}
          {loading && (
            <button onClick={abort} className="text-xs text-gray-500 hover:text-gray-200 transition-colors">Stop</button>
          )}
          <button onClick={onClose} className="text-gray-500 hover:text-gray-200 transition-colors text-sm">✕</button>
        </div>
      </div>

      {/* Answer */}
      <div ref={answerRef} className="flex-1 p-4 overflow-y-auto min-h-0">
        {/* Prior thread exchanges from AI Mode */}
        {thread.length > 0 && (
          <div className="mb-3">
            <p className="text-[10px] text-gray-700 uppercase tracking-wider mb-2">AI Mode history</p>
            <ThreadView thread={thread} onClear={onClearThread ?? (() => {})} />
          </div>
        )}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {!error && !answer && loading && (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <span className="inline-block w-1 h-4 bg-amber-400 animate-pulse rounded" />
            Generating answer…
          </div>
        )}
        {answer && (
          <>
            <div
              className="prose-dark text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(answer) + (loading ? '<span class="inline-block w-1 h-4 bg-amber-400 animate-pulse rounded align-middle ml-0.5"></span>' : '') }}
            />

            {/* Follow-up chips */}
            {followUps.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-xs text-gray-600 mb-2">Follow-up</p>
                <div className="flex flex-col gap-1.5">
                  {followUps.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => onFollowUp?.(q)}
                      className="text-left text-xs text-gray-400 hover:text-amber-400 transition-colors py-1 px-2 rounded hover:bg-subtle"
                    >
                      → {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Citations */}
            {citedResults.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-gray-600 mb-2">Sources cited</p>
                <div className="space-y-1">
                  {citedResults.map((r, i) => (
                    <div key={r.id} className="text-xs text-gray-500 flex gap-1.5">
                      <span className="text-amber-400/60 shrink-0">[{i + 1}]</span>
                      <span className="truncate">{r.content.slice(0, 60)}…</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-border shrink-0 flex items-center justify-between">
        <p className="text-xs text-gray-600">Top {Math.min(results.length, 5)} results as context</p>
        {answer && (
          <button
            onClick={copyAnswer}
            className="text-xs text-gray-500 hover:text-amber-400 transition-colors"
          >
            {copied ? '✓ Copied' : 'Copy answer'}
          </button>
        )}
      </div>
    </aside>
  )
}
