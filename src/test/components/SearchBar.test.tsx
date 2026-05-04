import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { SearchBar } from '../../components/SearchBar'
import * as searchApi from '../../api/search'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('SearchBar', () => {
  it('renders input element', () => {
    render(<SearchBar query="" mode="semantic" onQueryChange={vi.fn()} onModeChange={vi.fn()} />)
    expect(screen.getByTestId('search-input')).toBeTruthy()
  })

  it('shows suggestions dropdown when suggestions available', async () => {
    vi.spyOn(searchApi, 'fetchSuggestions').mockResolvedValue({ suggestions: ['python list', 'python dict'] })
    render(<SearchBar query="" mode="semantic" onQueryChange={vi.fn()} onModeChange={vi.fn()} />)
    const input = screen.getByTestId('search-input')
    await act(async () => {
      fireEvent.focus(input)
      fireEvent.change(input, { target: { value: 'py' } })
      await vi.runAllTimersAsync()
    })
    expect(screen.queryByTestId('suggestions-dropdown')).toBeTruthy()
  })

  it('calls onQueryChange with empty string on Escape', () => {
    const onChange = vi.fn()
    render(<SearchBar query="test" mode="semantic" onQueryChange={onChange} onModeChange={vi.fn()} />)
    const input = screen.getByTestId('search-input')
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onChange).toHaveBeenCalledWith('')
  })

  it('calls onSubmit on Enter', () => {
    const onSubmit = vi.fn()
    render(<SearchBar query="test" mode="semantic" onQueryChange={vi.fn()} onModeChange={vi.fn()} onSubmit={onSubmit} />)
    const input = screen.getByTestId('search-input')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSubmit).toHaveBeenCalled()
  })

  it('toggles mode to pattern', () => {
    const onMode = vi.fn()
    render(<SearchBar query="" mode="semantic" onQueryChange={vi.fn()} onModeChange={onMode} />)
    fireEvent.click(screen.getByText('Pattern'))
    expect(onMode).toHaveBeenCalledWith('pattern')
  })

  it('toggles mode to semantic', () => {
    const onMode = vi.fn()
    render(<SearchBar query="" mode="pattern" onQueryChange={vi.fn()} onModeChange={onMode} />)
    fireEvent.click(screen.getByText('Semantic'))
    expect(onMode).toHaveBeenCalledWith('semantic')
  })
})
