import { useState, useRef } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { llmStream } from '../api/client'
import type { SearchResult } from '../types'
import { ANSWER_STYLES, type AnswerStyle } from '../api/search'

interface Props {
  open: boolean
  query: string
  results: SearchResult[]
  onClose: () => void
}

interface PanelState {
  answer: string
  loading: boolean
  error: string | null
}

const STYLES_TO_COMPARE: AnswerStyle[] = ['concise', 'detailed']

const STYLE_PROMPTS: Record<AnswerStyle, string> = {
  concise: 'Answer in 2-3 clear, direct sentences. Key facts only.',
  detailed: 'Give a thorough answer. Use ## headers and bullet points. Cover all relevant aspects.',
  eli5: 'Explain as if to someone with no background. Use plain language and simple analogies.',
  bullets: 'Respond as a structured markdown bullet list. Use sub-bullets for detail.',
}

async function runAnswer(
  query: string,
  results: SearchResult[],
  style: AnswerStyle,
  onToken: (t: string) => void,
  signal: AbortSignal,
) {
  const context = results.slice(0, 5).map((r, i) => {
    const label = r.title ?? r.file_path ?? `Result ${i + 1}`
    return `[${i + 1}] ${label}: ${r.content.slice(0, 300).replace(/\n+/g, ' ')}`
  }).join('\n\n')

  return llmStream(
    '/v1/chat/completions',
    {
      model: 'neuronx',
      messages: [
        {
          role: 'system',
          content: `You are a precise AI assistant. ${STYLE_PROMPTS[style]} Cite sources as [1], [2]. Use **bold** for key terms.`,
        },
        {
          role: 'user',
          content: `Search results for "${query}":\n\n${context}\n\nAnswer: "${query}"`,
        },
      ],
      max_tokens: style === 'detailed' ? 700 : 300,
      stream: true,
    },
    onToken,
    signal,
  )
}

function renderMd(text: string): string {
  return DOMPurify.sanitize(marked.parse(text, { async: false }) as string)
}

export function AnswerCompare({ open, query, results, onClose }: Props) {
  const [panels, setPanels] = useState<PanelState[]>([
    { answer: '', loading: false, error: null },
    { answer: '', loading: false, error: null },
  ])
  const [started, setStarted] = useState(false)
  const abortRefs = useRef<AbortController[]>([new AbortController(), new AbortController()])

  if (!open) return null

  async function compare() {
    abortRefs.current.forEach(a => a.abort())
    abortRefs.current = [new AbortController(), new AbortController()]
    setPanels([{ answer: '', loading: true, error: null }, { answer: '', loading: true, error: null }])
    setStarted(true)

    await Promise.all(STYLES_TO_COMPARE.map(async (style, idx) => {
      const signal = abortRefs.current[idx].signal
      const acc = { text: '' }
      try {
        await runAnswer(
          query,
          results,
          style,
          token => {
            acc.text += token
            setPanels(prev => prev.map((p, i) => i === idx ? { ...p, answer: acc.text } : p))
          },
          signal,
        )
        setPanels(prev => prev.map((p, i) => i === idx ? { ...p, loading: false } : p))
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          setPanels(prev => prev.map((p, i) => i === idx ? { ...p, loading: false, error: (e as Error).message || 'Failed' } : p))
        }
      }
    }))
  }

  function handleClose() {
    abortRefs.current.forEach(a => a.abort())
    setStarted(false)
    setPanels([{ answer: '', loading: false, error: null }, { answer: '', loading: false, error: null }])
    onClose()
  }

  const styleLabels = STYLES_TO_COMPARE.map(s => ANSWER_STYLES.find(a => a.value === s)?.label ?? s)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-14 px-4" onClick={e => { if (e.target === e.currentTarget) handleClose() }}>
      <div className="w-full max-w-4xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-amber-400">⚖</span>
            <div>
              <h2 className="text-sm font-semibold text-gray-200">Compare Answers</h2>
              <p className="text-[10px] text-gray-600">Same query · two prompt styles side by side</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-200 transition-colors">✕</button>
        </div>

        {/* Query display */}
        <div className="px-5 py-2.5 border-b border-border shrink-0">
          <p className="text-sm text-gray-400 truncate">"{query}"</p>
        </div>

        {/* Idle */}
        {!started && (
          <div className="p-6 text-center">
            <p className="text-xs text-gray-600 mb-5">
              Runs <span className="text-amber-400">Concise</span> and <span className="text-amber-400">Detailed</span> prompt styles in parallel, then shows them side by side so you can pick the best answer.
            </p>
            <button
              onClick={compare}
              disabled={!query.trim() || results.length === 0}
              className="px-6 py-2.5 bg-amber-400/15 text-amber-400 border border-amber-400/30 rounded-xl hover:bg-amber-400/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              Compare Answers
            </button>
          </div>
        )}

        {/* Results */}
        {started && (
          <div className="flex-1 overflow-y-auto min-h-0 p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
              {STYLES_TO_COMPARE.map((style, idx) => {
                const panel = panels[idx]
                return (
                  <div key={style} className="flex flex-col border border-border rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-subtle shrink-0">
                      <span className="text-xs font-medium text-gray-300">{styleLabels[idx]} Style</span>
                      {panel.loading && <span className="text-[10px] text-amber-400/60 animate-pulse">generating…</span>}
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 min-h-0">
                      {panel.error && <p className="text-red-400 text-sm">{panel.error}</p>}
                      {!panel.error && !panel.answer && panel.loading && (
                        <div className="flex items-center gap-2 text-gray-500 text-sm">
                          <span className="inline-block w-1 h-4 bg-amber-400 animate-pulse rounded" />
                          Generating…
                        </div>
                      )}
                      {panel.answer && (
                        <div
                          className="prose-dark text-sm leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: renderMd(panel.answer) + (panel.loading ? '<span class="inline-block w-1 h-4 bg-amber-400 animate-pulse rounded align-middle ml-0.5"></span>' : '')
                          }}
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        {started && !panels.some(p => p.loading) && (
          <div className="px-5 py-3 border-t border-border shrink-0 flex items-center justify-between">
            <p className="text-xs text-gray-600">Which answer was better?</p>
            <button onClick={compare} className="text-xs text-gray-500 hover:text-amber-400 border border-border rounded px-3 py-1 transition-colors">
              Regenerate both
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
