import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DomainFilter } from '../../components/DomainFilter'

const domains = ['python', 'javascript', 'security']

describe('DomainFilter', () => {
  it('renders All option plus each domain (pills)', () => {
    render(<DomainFilter domains={domains} activeDomain="" onChange={vi.fn()} variant="pills" />)
    expect(screen.getByText('All')).toBeTruthy()
    expect(screen.getByText('python')).toBeTruthy()
    expect(screen.getByText('javascript')).toBeTruthy()
    expect(screen.getByText('security')).toBeTruthy()
  })

  it('selecting a domain calls onChange with that domain', () => {
    const onChange = vi.fn()
    render(<DomainFilter domains={domains} activeDomain="" onChange={onChange} variant="pills" />)
    fireEvent.click(screen.getByText('python'))
    expect(onChange).toHaveBeenCalledWith('python')
  })

  it('"All" calls onChange with empty string', () => {
    const onChange = vi.fn()
    render(<DomainFilter domains={domains} activeDomain="python" onChange={onChange} variant="pills" />)
    fireEvent.click(screen.getByText('All'))
    expect(onChange).toHaveBeenCalledWith('')
  })

  it('active domain has amber styling (pills)', () => {
    const { container } = render(
      <DomainFilter domains={domains} activeDomain="python" onChange={vi.fn()} variant="pills" />
    )
    const activeBtn = Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'python')
    expect(activeBtn?.className).toContain('bg-amber-400')
  })

  it('checkboxes variant renders All domains label', () => {
    render(<DomainFilter domains={domains} activeDomain="" onChange={vi.fn()} variant="checkboxes" />)
    expect(screen.getByText('All domains')).toBeTruthy()
  })

  it('checkboxes variant: selecting active domain again passes empty string (deselect)', () => {
    const onChange = vi.fn()
    render(<DomainFilter domains={domains} activeDomain="python" onChange={onChange} variant="checkboxes" />)
    fireEvent.click(screen.getByText('python'))
    expect(onChange).toHaveBeenCalledWith('')
  })
})
