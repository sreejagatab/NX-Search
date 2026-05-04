import { useState, useRef, useEffect, useCallback } from 'react'
import type { SearchResult } from '../types'
import { DomainBadge, DOMAIN_BORDER_COLOR } from './DomainFilter'
import { usePrism } from '../hooks/usePrism'

interface Props {
  result: SearchResult
  query: string
  index?: number
  onRegisterRef?: (el: HTMLElement | null, i: number) => void
  highlightId?: string
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

export function detectLanguage(domain: string, content: string): string {
  const d = domain.toLowerCase()
  if (d === 'python') return 'python'
  if (d === 'javascript') return 'javascript'
  if (d === 'typescript') return 'typescript'
  if (d === 'rust') return 'rust'
  if (d === 'go') return 'go'
  if (d === 'java') return 'java'
  if (d === 'sql') return 'sql'
  if (d === 'bash' || d === 'shell') return 'bash'
  // heuristic fallback
  if (/def |import |class |if __name__/.test(content)) return 'python'
  if (/function |const |let |var |=>/.test(content)) return 'javascript'
  if (/fn |let mut |impl |struct /.test(content)) return 'rust'
  return ''
}

export function ResultCard({ result, query, index = 0, onRegisterRef, highlightId }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const [popoverVisible, setPopoverVisible] = useState(false)
  const cardRef = useRef<HTMLElement | null>(null)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isHighlighted = highlightId === result.id

  const handleMouseEnter = () => {
    hoverTimer.current = setTimeout(() => setPopoverVisible(true), 600)
  }
  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    setPopoverVisible(false)
  }

  useEffect(() => {
    if (isHighlighted) setExpanded(true)
  }, [isHighlighted])

  const registerRef = useCallback((el: HTMLElement | null) => {
    cardRef.current = el
    onRegisterRef?.(el, index)
  }, [onRegisterRef, index])

  const lang = detectLanguage(result.domain, result.content)

  const copyContent = (content: string) => {
    const text = lang ? `\`\`\`${lang}\n${content}\n\`\`\`` : content
    return navigator.clipboard.writeText(text)
  }

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await copyContent(result.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const snippet = result.content.length > 200 ? result.content.slice(0, 200) + '…' : result.content
  const borderColor = DOMAIN_BORDER_COLOR[result.domain.toLowerCase()] ?? 'border-l-gray-700'

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); setExpanded(true) }
    if (e.key === 'c' && !expanded) { e.preventDefault(); copyContent(result.content); setCopied(true); setTimeout(() => setCopied(false), 1500) }
  }

  return (
    <>
      <article
        ref={registerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`relative bg-card border border-border border-l-4 ${borderColor} rounded-lg p-4 hover:border-amber-400/30 transition-colors cursor-pointer group outline-none focus:ring-1 focus:ring-amber-400/40 card-enter`}
        style={{ '--card-i': index } as React.CSSProperties}
        onClick={() => setExpanded(true)}
        data-testid="result-card"
        data-result-id={result.id}
        aria-label={`Result: ${result.domain} — ${snippet}`}
      >
        {/* Hover preview popover */}
        {popoverVisible && !expanded && (
          <div
            className="absolute left-full top-0 ml-3 z-30 w-80 bg-card border border-border rounded-xl p-4 shadow-2xl pointer-events-none hidden xl:block"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">{result.domain} · full content</p>
            <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-hidden">{result.content}</pre>
            {result.content.length > 300 && <p className="text-xs text-gray-600 mt-1">…{result.content.length - 300} more chars</p>}
          </div>
        )}
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
        <ExpandedModal
          result={result}
          query={query}
          lang={lang}
          onClose={() => { setExpanded(false); cardRef.current?.focus() }}
        />
      )}
    </>
  )
}

function ExpandedModal({ result, query, lang, onClose }: {
  result: SearchResult; query: string; lang: string; onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const codeRef = usePrism(result.content, lang)
  const shareUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`.replace(/[?&]result=[^&]*/g, '') + (window.location.search ? `&result=${result.id}` : `?result=${result.id}`)

  const copy = async () => {
    const text = lang ? `\`\`\`${lang}\n${result.content}\n\`\`\`` : result.content
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const shareResult = () => {
    navigator.clipboard.writeText(shareUrl)
  }

  // focus trap
  useEffect(() => {
    const el = modalRef.current
    if (!el) return
    const focusable = el.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])')
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    first?.focus()
    const trap = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return
      if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last?.focus() } }
      else { if (document.activeElement === last) { e.preventDefault(); first?.focus() } }
    }
    document.addEventListener('keydown', trap)
    return () => document.removeEventListener('keydown', trap)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      data-modal-open="true"
    >
      <div
        ref={modalRef}
        className="bg-card border border-border rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Full result: ${result.domain}`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <DomainBadge domain={result.domain} />
            {result.source && (
              <span className="text-xs text-gray-500 border border-border rounded px-1.5 py-0.5">{result.source}</span>
            )}
            {lang && <span className="text-xs text-gray-600 font-mono">{lang}</span>}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-200 transition-colors text-lg leading-none">✕</button>
        </div>

        <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
          <span>Similarity: <strong className="text-gray-300">{(result.similarity * 100).toFixed(1)}%</strong></span>
          <span>Confidence: <strong className="text-gray-300">{(result.confidence * 100).toFixed(1)}%</strong></span>
        </div>

        {lang ? (
          <pre className={`language-${lang} text-sm leading-relaxed bg-bg rounded-lg p-4 mb-4 overflow-x-auto`}>
            <code ref={codeRef} className={`language-${lang}`}>{result.content}</code>
          </pre>
        ) : (
          <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed bg-bg rounded-lg p-4 mb-4 overflow-x-auto">
            {highlight(result.content, query)}
          </pre>
        )}

        <div className="flex justify-between items-center">
          <button
            onClick={shareResult}
            className="text-xs px-3 py-1.5 rounded-lg text-gray-500 hover:text-gray-200 border border-border transition-colors"
            title="Copy link to this result"
          >
            Share ↗
          </button>
          <button
            onClick={copy}
            className="text-sm px-4 py-2 rounded-lg bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 transition-colors border border-amber-400/20"
          >
            {copied ? 'Copied!' : `Copy${lang ? ` as ${lang}` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
