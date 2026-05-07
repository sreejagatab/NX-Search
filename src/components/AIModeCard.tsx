import { useState, useRef, useEffect } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import type { SearchResult } from '../types'
import { ANSWER_STYLES } from '../api/search'
import type { AnswerStyle } from '../api/search'
import { usePeopleAlsoAsk } from '../hooks/usePeopleAlsoAsk'
import { saveAnswer, isSaved } from '../lib/collections'
import { CitationText } from './CitationText'

function renderMarkdown(text: string): string {
  const raw = marked.parse(text, { async: false }) as string
  return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } })
}

interface Props {
  summary: string
  intent?: string
  intentConfidence?: number
  enginesUsed?: string[]
  sources?: Record<string, number>
  queryTimeMs: number
  relatedSearches?: string[]
  results: SearchResult[]
  onRelatedClick?: (q: string) => void
  onFollowUp?: (q: string) => void
  // LLM-generated answer (streaming)
  answer?: string
  answerLoading?: boolean
  answerError?: string | null
  onAbortAnswer?: () => void
  // Answer style
  answerStyle?: AnswerStyle
  onAnswerStyleChange?: (s: AnswerStyle) => void
  // Query (used to trigger People Also Ask)
  query?: string
}

export function AIModeCard({
  summary, intent, intentConfidence, enginesUsed = [], sources = {},
  queryTimeMs, relatedSearches = [], results, onRelatedClick, onFollowUp,
  answer = '', answerLoading = false, answerError = null, onAbortAnswer,
  answerStyle = 'concise', onAnswerStyleChange, query,
}: Props) {
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [followUp, setFollowUp] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { items: paaItems, generating: paaGenerating, generate: paaGenerate, toggle: paaToggle, reset: paaReset } = usePeopleAlsoAsk()
  const wasStreamingRef = useRef(false)

  // Trigger PAA generation when streaming answer completes
  useEffect(() => {
    if (answerLoading) {
      wasStreamingRef.current = true
    } else if (wasStreamingRef.current && answer && query) {
      wasStreamingRef.current = false
      paaGenerate(query, results, answer)
    }
  }, [answerLoading, answer, query, results, paaGenerate])

  // Reset PAA when answer is cleared (new query)
  useEffect(() => {
    if (!answer) paaReset()
  }, [answer, paaReset])

  // Use LLM answer if available, fall back to API summary
  const displayText = answer || summary
  const isStreaming = answerLoading

  if (!displayText && !intent && !isStreaming) return null

  const copySummary = async () => {
    await navigator.clipboard.writeText(displayText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const submitFollowUp = () => {
    const q = followUp.trim()
    if (!q) return
    onFollowUp?.(q)
    setFollowUp('')
    inputRef.current?.blur()
  }

  const confidencePct = intentConfidence != null && intentConfidence > 0
    ? Math.round(intentConfidence * 100)
    : null

  const summaryParagraphs = !answer && summary ? summary.split(/\n\n+/).filter(Boolean) : []

  return (
    <div className="relative p-px rounded-2xl bg-gradient-to-r from-amber-400/50 via-violet-500/40 to-amber-400/50 mb-6 shadow-lg shadow-amber-400/5 max-w-2xl">
      <div className="bg-bg rounded-2xl overflow-visible">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-amber-400 text-sm font-semibold flex items-center gap-1.5 tracking-tight">
              <span className="text-base leading-none">✦</span>
              AI Answer
            </span>
            {intent && (
              <span className="text-[10px] capitalize text-violet-300/80 border border-violet-500/25 bg-violet-500/10 rounded-full px-2 py-0.5">
                {intent}{confidencePct !== null ? ` · ${confidencePct}%` : ''}
              </span>
            )}
            {enginesUsed.map(e => (
              <span key={e} className="text-[10px] text-gray-500 border border-border rounded-full px-2 py-0.5 capitalize">{e}</span>
            ))}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Answer style pills */}
            {onAnswerStyleChange && !isStreaming && (
              <div className="flex items-center gap-0.5 bg-subtle rounded-lg p-0.5 border border-border">
                {ANSWER_STYLES.map(s => (
                  <button
                    key={s.value}
                    onClick={() => onAnswerStyleChange(s.value)}
                    className={`text-[10px] px-2 py-0.5 rounded transition-colors ${answerStyle === s.value ? 'bg-amber-400/20 text-amber-400' : 'text-gray-600 hover:text-gray-300'}`}
                    title={`Answer style: ${s.label}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
            {isStreaming && (
              <button
                onClick={onAbortAnswer}
                className="text-[10px] px-2 py-1 rounded-md border border-border text-gray-500 hover:text-red-400 hover:border-red-400/30 transition-colors"
              >
                Stop
              </button>
            )}
            {queryTimeMs > 0 && !isStreaming && (
              <span className="text-[10px] text-gray-600">{(queryTimeMs / 1000).toFixed(1)}s</span>
            )}
            {displayText && !isStreaming && (
              <button
                onClick={copySummary}
                className="text-[10px] px-2 py-1 rounded-md border border-border text-gray-500 hover:text-gray-200 hover:border-amber-400/30 transition-colors"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            )}
            {answer && !isStreaming && query && (
              <button
                onClick={() => {
                  if (!isSaved(query, answer)) {
                    saveAnswer(query, answer, results)
                    setSaved(true)
                    setTimeout(() => setSaved(false), 2000)
                  }
                }}
                className={`text-[10px] px-2 py-1 rounded-md border transition-colors ${
                  saved || (query && answer && isSaved(query, answer))
                    ? 'border-amber-400/30 text-amber-400'
                    : 'border-border text-gray-500 hover:text-amber-400 hover:border-amber-400/30'
                }`}
                title="Save to collections"
              >
                {saved ? '✓ Saved' : '🗂 Save'}
              </button>
            )}
          </div>
        </div>

        {/* Source pills */}
        {Object.keys(sources).length > 0 && (
          <div className="flex items-center gap-4 px-5 py-2 border-b border-white/5 flex-wrap">
            {Object.entries(sources).map(([src, count]) => (
              <span key={src} className="text-[10px] text-gray-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-amber-400/60 to-violet-400/60 shrink-0" />
                {src}
                <span className="text-gray-700">({count})</span>
              </span>
            ))}
          </div>
        )}

        {/* Answer body — streaming or complete */}
        {(isStreaming || answer || summaryParagraphs.length > 0 || answerError) && (
          <div className="px-5 py-4">
            {answerError && (
              <p className="text-sm text-red-400">{answerError}</p>
            )}
            {isStreaming && !answer && !answerError && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="inline-block w-1.5 h-4 bg-amber-400 rounded animate-pulse" />
                Generating answer…
              </div>
            )}
            {answer ? (
              <div
                className="prose-dark text-sm leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(answer) + (isStreaming ? '<span class="inline-block w-0.5 h-4 bg-amber-400 rounded animate-pulse align-middle ml-0.5"></span>' : '')
                }}
              />
            ) : summaryParagraphs.length > 0 ? (
              <div className="space-y-3">
                {summaryParagraphs.map((para, pi) => (
                  <p key={pi} className="text-sm text-gray-300 leading-relaxed">
                    <CitationText text={para} results={results} />
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {/* People Also Ask accordion */}
        {(paaGenerating || paaItems.length > 0) && (
          <div className="px-5 py-3 border-t border-white/5">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2.5 font-medium">People also ask</p>
            {paaGenerating && paaItems.length === 0 && (
              <p className="text-xs text-gray-600 animate-pulse">Generating questions…</p>
            )}
            <div className="space-y-1.5">
              {paaItems.map((item, i) => (
                <div key={i} className="border border-border rounded-xl overflow-hidden">
                  <div className="flex items-center">
                    <button
                      onClick={() => paaToggle(i, results)}
                      className="flex-1 flex items-center justify-between px-3.5 py-2.5 text-left text-sm text-gray-300 hover:text-gray-100 hover:bg-subtle transition-colors"
                    >
                      <span className="pr-3">{item.question}</span>
                      <span className="text-[10px] text-gray-600 shrink-0">{item.expanded ? '▲' : '▼'}</span>
                    </button>
                    <button
                      onClick={() => onFollowUp?.(item.question)}
                      className="px-2.5 py-2.5 text-[10px] text-gray-600 hover:text-amber-400 shrink-0 border-l border-border transition-colors"
                      title="Search this question"
                    >Search →</button>
                  </div>
                  {item.expanded && (
                    <div className="px-3.5 py-2.5 border-t border-border bg-subtle/50 text-xs text-gray-400 leading-relaxed">
                      {item.loading && !item.answer && (
                        <span className="text-gray-600 animate-pulse">Generating…</span>
                      )}
                      {item.answer}
                      {item.loading && item.answer && (
                        <span className="inline-block w-0.5 h-3 bg-amber-400 rounded animate-pulse align-middle ml-0.5" />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* People also searched */}
        {relatedSearches.length > 0 && (
          <div className="px-5 py-3 border-t border-white/5">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2.5 font-medium">People also searched</p>
            <div className="flex flex-wrap gap-2">
              {relatedSearches.map(q => (
                <button
                  key={q}
                  onClick={() => onRelatedClick?.(q)}
                  className="text-xs text-gray-300 hover:text-gray-100 border border-border hover:border-amber-400/30 rounded-full px-3 py-1.5 transition-colors bg-card hover:bg-subtle"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Follow-up input */}
        <div className="px-5 py-3 border-t border-white/5">
          <div className="flex items-center gap-2 bg-subtle rounded-xl px-3 py-2.5 border border-border focus-within:border-amber-400/40 transition-colors">
            <span className="text-amber-400/50 text-sm shrink-0 leading-none">✦</span>
            <input
              ref={inputRef}
              type="text"
              value={followUp}
              onChange={e => setFollowUp(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitFollowUp() }}
              placeholder="Ask a follow-up…"
              className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 outline-none"
            />
            {followUp.trim() && (
              <button
                onClick={submitFollowUp}
                className="text-xs text-amber-400 hover:text-amber-300 shrink-0 font-medium transition-colors"
              >
                Search →
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
