import { useEffect, useRef, useCallback } from 'react'
import type { SearchResult } from '../types'

interface Callbacks {
  onOpen?: (result: SearchResult) => void
  onExplain?: (result: SearchResult) => void
}

export function useResultKeyboard(
  results: SearchResult[],
  { onOpen, onExplain }: Callbacks = {}
) {
  const focusedIndex = useRef(-1)
  const cardRefs = useRef<(HTMLElement | null)[]>([])

  const setCardRef = useCallback((el: HTMLElement | null, i: number) => {
    cardRefs.current[i] = el
  }, [])

  const focusCard = useCallback((i: number) => {
    const el = cardRefs.current[i]
    if (el) { el.focus(); focusedIndex.current = i }
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement
      const inInput = active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA'
      if (inInput) return
      if (document.querySelector('[data-modal-open]')) return

      const count = results.length
      const idx = focusedIndex.current

      if (e.key === 'j') {
        e.preventDefault()
        focusCard(Math.min(idx + 1, count - 1))
      } else if (e.key === 'k') {
        e.preventDefault()
        focusCard(Math.max(idx - 1, 0))
      } else if (e.key === 'o' && idx >= 0 && results[idx]) {
        e.preventDefault()
        onOpen?.(results[idx])
      } else if (e.key === 'e' && idx >= 0 && results[idx]) {
        e.preventDefault()
        onExplain?.(results[idx])
      } else if (e.key === 'Escape' && idx >= 0) {
        e.preventDefault()
        focusedIndex.current = -1
        ;(document.activeElement as HTMLElement)?.blur()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [results, focusCard, onOpen, onExplain])

  return { setCardRef }
}
