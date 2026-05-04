import { useEffect, useRef, useCallback } from 'react'

export function useResultKeyboard(resultCount: number) {
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
      // modal open — don't interfere
      if (document.querySelector('[data-modal-open]')) return

      if (e.key === 'j') {
        e.preventDefault()
        const next = Math.min(focusedIndex.current + 1, resultCount - 1)
        focusCard(next)
      } else if (e.key === 'k') {
        e.preventDefault()
        const prev = Math.max(focusedIndex.current - 1, 0)
        focusCard(prev)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [resultCount, focusCard])

  return { setCardRef }
}
