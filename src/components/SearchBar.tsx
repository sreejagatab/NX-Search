import { useEffect, useRef, useState } from 'react'
import { useSuggest } from '../hooks/useSuggest'
import type { SearchMode } from '../types'

interface Props {
  query: string
  mode: SearchMode
  onQueryChange: (q: string) => void
  onModeChange: (m: SearchMode) => void
  onSubmit?: () => void
  autoFocus?: boolean
  size?: 'lg' | 'sm'
}

export function SearchBar({ query, mode, onQueryChange, onModeChange, onSubmit, autoFocus, size = 'sm' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [localQuery, setLocalQuery] = useState(query)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const { suggestions, clear } = useSuggest(localQuery)

  useEffect(() => { setLocalQuery(query) }, [query])

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setLocalQuery('')
      onQueryChange('')
      clear()
      setShowSuggestions(false)
      inputRef.current?.blur()
    } else if (e.key === 'Enter') {
      onQueryChange(localQuery)
      setShowSuggestions(false)
      onSubmit?.()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setLocalQuery(val)
    onQueryChange(val)
    setShowSuggestions(true)
  }

  const selectSuggestion = (s: string) => {
    setLocalQuery(s)
    onQueryChange(s)
    setShowSuggestions(false)
    clear()
  }

  const isLg = size === 'lg'

  return (
    <div className="relative w-full">
      <div className={`relative flex items-center bg-card border border-border rounded-xl overflow-hidden transition-colors focus-within:border-amber-400/50 ${isLg ? 'shadow-lg' : ''}`}>
        <span className={`text-gray-500 shrink-0 ${isLg ? 'pl-5 text-xl' : 'pl-4 text-base'}`}>⌕</span>
        <input
          ref={inputRef}
          type="text"
          value={localQuery}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
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
        <div className="flex items-center gap-1 px-3 border-l border-border shrink-0">
          <button
            onClick={() => onModeChange('semantic')}
            className={`text-xs px-2 py-1 rounded transition-colors ${mode === 'semantic' ? 'bg-amber-400 text-black font-medium' : 'text-gray-500 hover:text-gray-200'}`}
            title="FAISS vector search"
          >
            Semantic
          </button>
          <button
            onClick={() => onModeChange('pattern')}
            className={`text-xs px-2 py-1 rounded transition-colors ${mode === 'pattern' ? 'bg-amber-400 text-black font-medium' : 'text-gray-500 hover:text-gray-200'}`}
            title="Keyword pattern search"
          >
            Pattern
          </button>
        </div>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <ul
          className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl overflow-hidden shadow-xl z-40"
          data-testid="suggestions-dropdown"
          role="listbox"
        >
          {suggestions.slice(0, 8).map((s, i) => (
            <li key={i}>
              <button
                onMouseDown={() => selectSuggestion(s)}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-subtle transition-colors"
                role="option"
              >
                <span className="text-gray-500 mr-2">⌕</span>{s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
