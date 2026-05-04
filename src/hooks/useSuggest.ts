import { useState, useEffect, useRef } from 'react'
import { fetchSuggestions } from '../api/search'

export function useSuggest(query: string) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim() || query.length < 2) {
      setSuggestions([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const resp = await fetchSuggestions(query)
        setSuggestions(resp.suggestions ?? [])
      } catch {
        setSuggestions([])
      }
    }, 200)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const clear = () => setSuggestions([])

  return { suggestions, clear }
}
