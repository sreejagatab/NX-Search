import { useEffect, useRef, useState } from 'react'
import type { SearchMode, SortField, FocusMode } from '../types'
import { getRecent } from '../lib/recentSearches'

export interface PaletteAction {
  id: string
  label: string
  description?: string
  shortcut?: string
  group: string
  icon?: string
  onSelect: () => void
}

interface Props {
  open: boolean
  onClose: () => void
  mode: SearchMode
  focusMode?: FocusMode
  onSetMode: (m: SearchMode) => void
  onSetSort: (s: SortField) => void
  onSetFocusMode?: (f: FocusMode) => void
  onToggleAiMode?: () => void
  onToggleCollections?: () => void
  onExport?: () => void
  onToggleTheme?: () => void
  onNavigate?: (q: string) => void
}

function fuzzyMatch(text: string, query: string): boolean {
  if (!query) return true
  const t = text.toLowerCase()
  const q = query.toLowerCase()
  let qi = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++
  }
  return qi === q.length
}

export function CommandPalette({ open, onClose, mode, focusMode, onSetMode, onSetSort, onSetFocusMode, onToggleAiMode, onToggleCollections, onExport, onToggleTheme, onNavigate }: Props) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const recent = getRecent().slice(0, 5)

  const actions: PaletteAction[] = [
    { id: 'mode-semantic', label: 'Switch to Semantic mode', group: 'Mode', icon: '⟴', onSelect: () => { onSetMode('semantic'); onClose() } },
    { id: 'mode-pattern', label: 'Switch to Pattern mode', group: 'Mode', icon: '⟴', onSelect: () => { onSetMode('pattern'); onClose() } },
    { id: 'mode-hybrid', label: 'Switch to Hybrid mode', group: 'Mode', icon: '⟴', onSelect: () => { onSetMode('hybrid'); onClose() } },
    { id: 'sort-similarity', label: 'Sort by Similarity', group: 'Sort', icon: '↕', onSelect: () => { onSetSort('similarity'); onClose() } },
    { id: 'sort-confidence', label: 'Sort by Confidence', group: 'Sort', icon: '↕', onSelect: () => { onSetSort('confidence'); onClose() } },
    { id: 'sort-domain', label: 'Sort by Domain', group: 'Sort', icon: '↕', onSelect: () => { onSetSort('domain'); onClose() } },
    ...(onSetFocusMode ? [
      { id: 'focus-research', label: 'Focus: All — all sources, deep AI', group: 'Focus Mode', icon: '◎', onSelect: () => { onSetFocusMode('research'); onClose() } },
      { id: 'focus-web', label: 'Focus: Web — web results, concise answers', group: 'Focus Mode', icon: '◎', onSelect: () => { onSetFocusMode('web'); onClose() } },
      { id: 'focus-quick', label: 'Focus: Quick — fastest, no AI', group: 'Focus Mode', icon: '◎', onSelect: () => { onSetFocusMode('quick'); onClose() } },
    ] : []),
    ...(onToggleAiMode ? [{ id: 'ai-mode', label: 'Toggle AI Mode (Alt+A)', group: 'Actions', icon: '✦', onSelect: () => { onToggleAiMode(); onClose() } }] : []),
    ...(onToggleCollections ? [{ id: 'collections', label: 'Open saved answers (Alt+C)', group: 'Actions', icon: '🗂', onSelect: () => { onToggleCollections(); onClose() } }] : []),
    ...(onExport ? [{ id: 'export', label: 'Export results as JSON', group: 'Actions', icon: '⬇', onSelect: () => { onExport(); onClose() } }] : []),
    ...(onToggleTheme ? [{ id: 'theme', label: 'Toggle theme', group: 'Actions', icon: '◑', onSelect: () => { onToggleTheme(); onClose() } }] : []),
    ...recent.map(r => ({
      id: `recent-${r.q}`,
      label: r.q,
      description: `${r.mode} · ${r.domain || 'all domains'}`,
      group: 'Recent searches',
      icon: '⌕',
      onSelect: () => { onNavigate?.(r.q); onClose() },
    })),
  ]

  const filtered = actions.filter(a =>
    fuzzyMatch(`${a.label} ${a.description ?? ''} ${a.group}`, query)
  )

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  useEffect(() => { setSelectedIndex(0) }, [query])

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); filtered[selectedIndex]?.onSelect() }
    else if (e.key === 'Escape') onClose()
  }

  if (!open) return null

  const groups = [...new Set(filtered.map(a => a.group))]

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] sm:pt-[15vh] px-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <span className="text-gray-500 shrink-0">⌕</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search…"
            className="flex-1 bg-transparent text-gray-100 placeholder-gray-600 outline-none text-sm"
            aria-label="Command search"
          />
          <kbd className="text-[10px] text-gray-600 border border-border rounded px-1.5 py-0.5">Esc</kbd>
        </div>

        {/* Results list */}
        <ul ref={listRef} className="max-h-96 overflow-y-auto py-2" role="listbox">
          {filtered.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-gray-600">No commands match "{query}"</li>
          )}
          {groups.map(group => (
            <div key={group}>
              <div className="px-4 py-1.5 text-[10px] text-gray-600 uppercase tracking-wider">{group}</div>
              {filtered.filter(a => a.group === group).map(action => {
                const idx = filtered.indexOf(action)
                return (
                  <li
                    key={action.id}
                    role="option"
                    aria-selected={idx === selectedIndex}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={action.onSelect}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                      idx === selectedIndex ? 'bg-subtle' : ''
                    }`}
                  >
                    {action.icon && <span className="text-gray-500 w-4 text-center shrink-0">{action.icon}</span>}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${idx === selectedIndex ? 'text-gray-100' : 'text-gray-300'}`}>{action.label}</p>
                      {action.description && <p className="text-xs text-gray-600 truncate">{action.description}</p>}
                    </div>
                    {action.id.startsWith('mode-') && action.id === `mode-${mode}` && (
                      <span className="text-[10px] text-amber-400 border border-amber-400/30 px-1.5 py-0.5 rounded">active</span>
                    )}
                    {action.id.startsWith('focus-') && focusMode && action.id === `focus-${focusMode}` && (
                      <span className="text-[10px] text-amber-400 border border-amber-400/30 px-1.5 py-0.5 rounded">active</span>
                    )}
                  </li>
                )
              })}
            </div>
          ))}
        </ul>

        <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-[10px] text-gray-700">
          <span><kbd className="border border-border rounded px-1">↑↓</kbd> navigate</span>
          <span><kbd className="border border-border rounded px-1">↵</kbd> select</span>
          <span><kbd className="border border-border rounded px-1">Esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
