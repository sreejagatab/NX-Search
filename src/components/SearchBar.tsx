import { useEffect, useId, useRef, useState } from 'react'
import { useSuggest } from '../hooks/useSuggest'
import type { SearchMode } from '../types'

interface Props {
  query: string
  mode: SearchMode
  domains?: string[]
  threshold?: number
  onQueryChange: (q: string) => void
  onModeChange: (m: SearchMode) => void
  onSubmit?: () => void
  autoFocus?: boolean
  size?: 'lg' | 'sm'
}

export function SearchBar({ query, mode, domains = [], threshold = 0.7, onQueryChange, onModeChange, onSubmit, autoFocus, size = 'sm' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxId = useId()
  const [localQuery, setLocalQuery] = useState(query)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const { suggestions, clear, prefetchSuggestion, cancelPrefetch } = useSuggest(localQuery)

  useEffect(() => { setLocalQuery(query) }, [query])
  useEffect(() => { setSelectedIndex(-1) }, [suggestions])

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const visibleSuggestions = suggestions.slice(0, 8)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!showSuggestions || visibleSuggestions.length === 0) { setShowSuggestions(true); return }
      setSelectedIndex(i => Math.min(i + 1, visibleSuggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, -1))
    } else if (e.key === 'Tab' && showSuggestions && visibleSuggestions.length > 0) {
      e.preventDefault()
      const pick = visibleSuggestions[selectedIndex >= 0 ? selectedIndex : 0]
      selectSuggestion(pick)
    } else if (e.key === 'Escape') {
      if (showSuggestions) {
        setShowSuggestions(false)
        setSelectedIndex(-1)
      } else {
        setLocalQuery('')
        onQueryChange('')
        clear()
        inputRef.current?.blur()
      }
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && showSuggestions && visibleSuggestions[selectedIndex]) {
        selectSuggestion(visibleSuggestions[selectedIndex])
      } else {
        onQueryChange(localQuery)
        setShowSuggestions(false)
        onSubmit?.()
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setLocalQuery(val)
    onQueryChange(val)
    setShowSuggestions(true)
    setSelectedIndex(-1)
  }

  const selectSuggestion = (s: string) => {
    setLocalQuery(s)
    onQueryChange(s)
    setShowSuggestions(false)
    setSelectedIndex(-1)
    clear()
  }

  const isLg = size === 'lg'
  const activeDescendant = selectedIndex >= 0 ? `${listboxId}-opt-${selectedIndex}` : undefined

  return (
    <div className="relative w-full" role="search">
      <div className={`relative flex items-center bg-card border border-border rounded-xl overflow-hidden transition-colors focus-within:border-amber-400/50 ${isLg ? 'shadow-lg' : ''}`}>
        <span className={`text-gray-500 shrink-0 ${isLg ? 'pl-5 text-xl' : 'pl-4 text-base'}`} aria-hidden="true">⌕</span>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showSuggestions && visibleSuggestions.length > 0}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-activedescendant={activeDescendant}
          value={localQuery}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => visibleSuggestions.length > 0 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => { setShowSuggestions(false); setSelectedIndex(-1) }, 150)}
          placeholder="Search patterns, code, concepts…"
          className={`flex-1 bg-transparent text-gray-100 placeholder-gray-600 outline-none ${isLg ? 'px-4 py-4 text-lg' : 'px-3 py-2.5 text-sm'}`}
          data-testid="search-input"
          aria-label="Search"
          autoComplete="off"
        />
        {localQuery && (
          <button
            onMouseDown={e => { e.preventDefault(); setLocalQuery(''); onQueryChange(''); clear() }}
            className="px-3 text-gray-500 hover:text-gray-200 transition-colors"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
        <ModeToggle mode={mode} onModeChange={onModeChange} />
      </div>

      {showSuggestions && visibleSuggestions.length > 0 && (
        <ul
          id={listboxId}
          className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl overflow-hidden shadow-xl z-40"
          data-testid="suggestions-dropdown"
          role="listbox"
          aria-label="Search suggestions"
        >
          {visibleSuggestions.map((s, i) => (
            <li key={i} id={`${listboxId}-opt-${i}`} role="option" aria-selected={i === selectedIndex}>
              <button
                onMouseDown={() => selectSuggestion(s)}
                onMouseEnter={() => { setSelectedIndex(i); prefetchSuggestion(s, mode, domains, threshold) }}
                onMouseLeave={() => cancelPrefetch(s)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  i === selectedIndex ? 'bg-subtle text-gray-100' : 'text-gray-300 hover:bg-subtle'
                }`}
              >
                <span className="text-gray-500 mr-2" aria-hidden="true">⌕</span>{s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ModeToggle({ mode, onModeChange }: { mode: SearchMode; onModeChange: (m: SearchMode) => void }) {
  const modes: { value: SearchMode; label: string; title: string }[] = [
    { value: 'semantic', label: 'Semantic', title: 'FAISS vector search' },
    { value: 'pattern', label: 'Pattern', title: 'Keyword pattern search' },
    { value: 'hybrid', label: 'Hybrid', title: 'Merged semantic + pattern (RRF)' },
  ]
  const activeIdx = modes.findIndex(m => m.value === mode)
  const pct = (activeIdx / (modes.length - 1)) * 100

  return (
    <div className="flex items-center px-2 border-l border-border shrink-0">
      <div className="relative flex items-center bg-bg rounded-lg p-0.5 gap-0">
        {/* sliding pill indicator */}
        <span
          className="absolute h-[calc(100%-4px)] rounded-md bg-amber-400 transition-all duration-200 ease-out"
          style={{
            width: `${100 / modes.length}%`,
            left: `calc(${pct}% * ${(modes.length - 1) / modes.length} + 2px)`,
            top: '2px',
          }}
        />
        {modes.map(m => (
          <button
            key={m.value}
            onClick={() => onModeChange(m.value)}
            title={m.title}
            className={`relative z-10 text-xs px-2 py-1 rounded transition-colors ${
              mode === m.value ? 'text-black font-medium' : 'text-gray-500 hover:text-gray-200'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  )
}
