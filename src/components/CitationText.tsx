import { useState } from 'react'
import type { SearchResult } from '../types'

type Token =
  | { type: 'text'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'code'; text: string }
  | { type: 'citation'; num: number }

export function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  const re = /\*\*(.+?)\*\*|`([^`]+)`|\[(\d+)\]/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) tokens.push({ type: 'text', text: text.slice(last, m.index) })
    if (m[1] !== undefined) tokens.push({ type: 'bold', text: m[1] })
    else if (m[2] !== undefined) tokens.push({ type: 'code', text: m[2] })
    else tokens.push({ type: 'citation', num: parseInt(m[3], 10) })
    last = m.index + m[0].length
  }
  if (last < text.length) tokens.push({ type: 'text', text: text.slice(last) })
  return tokens
}

function CitationPopover({ result }: { result: SearchResult }) {
  return (
    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-72 bg-card border border-amber-400/30 rounded-xl p-3 shadow-2xl pointer-events-none text-left block">
      <span className="text-[10px] text-amber-400/70 uppercase tracking-wider font-medium block mb-1">{result.domain}</span>
      {result.title && (
        <span className="text-xs text-gray-100 font-medium block mb-1 leading-snug">{result.title}</span>
      )}
      <span className="text-xs text-gray-400 block leading-relaxed">
        {result.content.slice(0, 150)}{result.content.length > 150 ? '…' : ''}
      </span>
      {result.url && (
        <span className="text-[10px] text-amber-400/50 truncate block mt-1.5">{result.url}</span>
      )}
    </span>
  )
}

interface CitationTextProps {
  text: string
  results?: SearchResult[]
  className?: string
}

export function CitationText({ text, results = [], className }: CitationTextProps) {
  const [hoveredCit, setHoveredCit] = useState<number | null>(null)

  const tokens = tokenize(text)
  const rendered = tokens.map((tok, i) => {
    if (tok.type === 'bold') {
      return <strong key={i} className="text-gray-100 font-semibold">{tok.text}</strong>
    }
    if (tok.type === 'code') {
      return <code key={i} className="text-xs text-amber-300 bg-bg px-1.5 py-0.5 rounded font-mono">{tok.text}</code>
    }
    if (tok.type === 'citation') {
      const result = results[tok.num - 1]
      return (
        <span key={i} className="relative inline-block">
          <sup
            className="text-[9px] font-medium text-amber-400 cursor-help px-1 py-px rounded bg-amber-400/15 hover:bg-amber-400/30 transition-colors ml-0.5 select-none border border-amber-400/20"
            onMouseEnter={() => setHoveredCit(tok.num)}
            onMouseLeave={() => setHoveredCit(null)}
          >
            {tok.num}
          </sup>
          {hoveredCit === tok.num && result && <CitationPopover result={result} />}
        </span>
      )
    }
    return tok.text
  })

  return <span className={className}>{rendered}</span>
}
