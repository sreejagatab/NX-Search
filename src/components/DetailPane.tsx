import { useEffect, useRef, useState } from 'react'
import type { SearchResult } from '../types'
import { DomainBadge } from './DomainFilter'
import { usePrism } from '../hooks/usePrism'
import { detectLanguage } from './ResultCard'
import { highlight } from '../lib/highlight'

interface Props {
  result: SearchResult | null
  query: string
  onClose: () => void
}

export function DetailPane({ result, query, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const lang = result ? detectLanguage(result.domain, result.content, result.file_path) : ''
  const codeRef = usePrism(result?.content ?? '', lang)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (result) closeRef.current?.focus()
  }, [result])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && result) onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [result, onClose])

  const copy = async () => {
    if (!result) return
    const text = lang ? `\`\`\`${lang}\n${result.content}\n\`\`\`` : result.content
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const shareResult = () => {
    if (!result) return
    const url = `${window.location.origin}${window.location.pathname}${window.location.search}`.replace(/[?&]result=[^&]*/g, '') +
      (window.location.search.includes('?') ? `&result=${result.id}` : `?result=${result.id}`)
    navigator.clipboard.writeText(url)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 1500)
  }

  if (!result) return null

  const simPct = Math.round(result.similarity * 100)

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/50 lg:hidden"
        onClick={onClose}
        aria-hidden
      />

      <aside
        className="fixed inset-y-0 right-0 z-40 w-full max-w-lg bg-card border-l border-border shadow-2xl flex flex-col lg:static lg:z-auto lg:w-96 lg:shadow-none lg:rounded-xl lg:border lg:border-border lg:max-h-[calc(100vh-8rem)] lg:sticky lg:top-24"
        role="complementary"
        aria-label="Result detail"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <DomainBadge domain={result.domain} />
            {result.source && (
              <span className="text-xs text-gray-500 border border-border rounded px-1.5 py-0.5">{result.source}</span>
            )}
            {lang && <span className="text-xs text-gray-600 font-mono">{lang}</span>}
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            className="text-gray-500 hover:text-gray-200 transition-colors text-lg leading-none ml-3"
            aria-label="Close detail pane"
          >✕</button>
        </div>

        {/* Relevance score */}
        <div className="px-5 py-3 flex items-center gap-3 text-sm border-b border-border shrink-0">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider shrink-0">Relevance</p>
          <div className="flex items-center gap-2 flex-1">
            <div className="flex-1 h-1.5 bg-subtle rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${simPct >= 70 ? 'bg-green-500' : simPct >= 40 ? 'bg-amber-400' : 'bg-red-500'}`} style={{ width: `${simPct}%` }} />
            </div>
            <span className="text-xs text-amber-400 w-8 text-right">{simPct}%</span>
          </div>
        </div>

        {/* Title / URL */}
        {(result.title || (result.url && !result.url.startsWith('file://'))) && (
          <div className="px-5 py-3 border-b border-border shrink-0">
            {result.title && <p className="text-sm font-medium text-gray-100 mb-1">{result.title}</p>}
            {result.url && !result.url.startsWith('file://') && (
              <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-400/70 hover:text-amber-400 break-all transition-colors">{result.url}</a>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {lang ? (
            <pre className={`language-${lang} text-sm leading-relaxed bg-bg rounded-lg p-4 overflow-x-auto`}>
              <code ref={codeRef} className={`language-${lang}`}>{result.content}</code>
            </pre>
          ) : (
            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed bg-bg rounded-lg p-4">
              {highlight(result.content, query)}
            </pre>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3 border-t border-border flex items-center justify-between shrink-0">
          <button
            onClick={shareResult}
            className="text-xs px-3 py-1.5 rounded-lg text-gray-500 hover:text-gray-200 border border-border transition-colors"
            title="Copy share link"
          >{linkCopied ? '✓ Link copied!' : 'Share ↗'}</button>
          <button
            onClick={copy}
            className="text-sm px-4 py-2 rounded-lg bg-amber-400/10 text-amber-400 hover:bg-amber-400/20 transition-colors border border-amber-400/20"
          >
            {copied ? 'Copied!' : `Copy${lang ? ` as ${lang}` : ''}`}
          </button>
        </div>
      </aside>
    </>
  )
}
