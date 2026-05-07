import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CitationText, tokenize } from '../../components/CitationText'

describe('tokenize', () => {
  it('returns plain text token', () => {
    const tokens = tokenize('hello world')
    expect(tokens).toEqual([{ type: 'text', text: 'hello world' }])
  })

  it('parses bold markers', () => {
    const tokens = tokenize('**bold** text')
    expect(tokens[0]).toEqual({ type: 'bold', text: 'bold' })
    expect(tokens[1]).toEqual({ type: 'text', text: ' text' })
  })

  it('parses inline code', () => {
    const tokens = tokenize('use `useState` hook')
    expect(tokens[1]).toEqual({ type: 'code', text: 'useState' })
  })

  it('parses citation numbers', () => {
    const tokens = tokenize('see [1] and [2]')
    expect(tokens.filter(t => t.type === 'citation')).toHaveLength(2)
    expect(tokens.find(t => t.type === 'citation' && t.num === 1)).toBeTruthy()
    expect(tokens.find(t => t.type === 'citation' && t.num === 2)).toBeTruthy()
  })

  it('handles mixed content', () => {
    const tokens = tokenize('**Result** [1]: use `fn()`')
    const types = tokens.map(t => t.type)
    expect(types).toContain('bold')
    expect(types).toContain('citation')
    expect(types).toContain('code')
  })
})

describe('CitationText', () => {
  it('renders plain text', () => {
    render(<CitationText text="hello world" />)
    expect(screen.getByText('hello world')).toBeTruthy()
  })

  it('renders bold text', () => {
    render(<CitationText text="**important** note" />)
    const strong = document.querySelector('strong')
    expect(strong?.textContent).toBe('important')
  })

  it('renders inline code', () => {
    render(<CitationText text="call `fetch()` here" />)
    const code = document.querySelector('code')
    expect(code?.textContent).toBe('fetch()')
  })

  it('renders citation superscripts', () => {
    render(<CitationText text="see [1] for details" />)
    const sup = document.querySelector('sup')
    expect(sup?.textContent).toBe('1')
  })

  it('renders citation without popover when no results provided', () => {
    render(<CitationText text="[1]" />)
    const sup = document.querySelector('sup')
    expect(sup).toBeTruthy()
  })
})
