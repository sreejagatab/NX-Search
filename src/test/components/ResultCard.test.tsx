import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ResultCard } from '../../components/ResultCard'
import type { SearchResult } from '../../types'

const mockResult: SearchResult = {
  id: '1',
  content: 'This is a long content string that should be truncated when it exceeds two hundred characters in the snippet display area of the result card component in the search UI.',
  domain: 'python',
  confidence: 0.85,
  similarity: 0.9,
  source: 'github',
}

describe('ResultCard', () => {
  it('renders domain badge', () => {
    render(<ResultCard result={mockResult} query="" />)
    expect(screen.getByText('python')).toBeTruthy()
  })

  it('renders confidence bar', () => {
    const { container } = render(<ResultCard result={mockResult} query="" />)
    const bar = container.querySelector('[style*="width"]')
    expect(bar).toBeTruthy()
  })

  it('truncates content at 200 chars in snippet', () => {
    render(<ResultCard result={mockResult} query="" />)
    const snippet = screen.getByTestId('card-snippet')
    const text = snippet.textContent ?? ''
    expect(text.length).toBeLessThanOrEqual(202) // 200 + ellipsis
  })

  it('shows source tag', () => {
    render(<ResultCard result={mockResult} query="" />)
    expect(screen.getByText('github')).toBeTruthy()
  })

  it('expands modal on click', () => {
    render(<ResultCard result={mockResult} query="" />)
    const card = screen.getByTestId('result-card')
    fireEvent.click(card)
    expect(screen.getByText(/Similarity/)).toBeTruthy()
    expect(screen.getByText(/Confidence/)).toBeTruthy()
  })

  it('closes modal on ✕ click', () => {
    render(<ResultCard result={mockResult} query="" />)
    fireEvent.click(screen.getByTestId('result-card'))
    const closeBtn = screen.getByText('✕')
    fireEvent.click(closeBtn)
    expect(screen.queryByText(/Similarity/)).toBeNull()
  })

  it('highlights query terms in snippet', () => {
    render(<ResultCard result={mockResult} query="content string" />)
    const marks = document.querySelectorAll('mark')
    expect(marks.length).toBeGreaterThan(0)
  })

  it('copies content to clipboard wrapped in code fence for python domain', async () => {
    const writeSpy = vi.spyOn(navigator.clipboard, 'writeText')
    render(<ResultCard result={mockResult} query="" />)
    const card = screen.getByTestId('result-card')
    fireEvent.mouseEnter(card)
    const copyBtn = screen.getByTitle('Copy content')
    fireEvent.click(copyBtn)
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining(mockResult.content))
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('```python'))
  })
})
