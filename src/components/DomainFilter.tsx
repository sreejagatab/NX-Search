interface Props {
  domains: string[]
  activeDomains: string[]
  domainCounts?: Record<string, number>
  onChange: (domains: string[]) => void
  variant?: 'pills' | 'checkboxes'
}

const DOMAIN_COLORS: Record<string, string> = {
  python: 'bg-blue-900/40 text-blue-300 border-blue-700',
  javascript: 'bg-yellow-900/40 text-yellow-300 border-yellow-700',
  security: 'bg-red-900/40 text-red-300 border-red-700',
  architecture: 'bg-purple-900/40 text-purple-300 border-purple-700',
  typescript: 'bg-blue-900/40 text-blue-200 border-blue-600',
  rust: 'bg-orange-900/40 text-orange-300 border-orange-700',
  go: 'bg-cyan-900/40 text-cyan-300 border-cyan-700',
  java: 'bg-red-900/30 text-red-200 border-red-600',
  sql: 'bg-green-900/40 text-green-300 border-green-700',
  bash: 'bg-gray-800 text-gray-300 border-gray-600',
  default: 'bg-gray-800 text-gray-300 border-gray-600',
}

export const DOMAIN_BORDER_COLOR: Record<string, string> = {
  python: 'border-l-blue-600',
  javascript: 'border-l-yellow-500',
  security: 'border-l-red-600',
  architecture: 'border-l-purple-600',
  typescript: 'border-l-blue-500',
  rust: 'border-l-orange-600',
  go: 'border-l-cyan-600',
  java: 'border-l-red-500',
  sql: 'border-l-green-600',
  bash: 'border-l-gray-600',
  default: 'border-l-gray-700',
}

export function domainColor(domain: string): string {
  return DOMAIN_COLORS[domain.toLowerCase()] ?? DOMAIN_COLORS.default
}

export function DomainBadge({ domain }: { domain: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${domainColor(domain)}`}>
      {domain}
    </span>
  )
}

export function DomainFilter({ domains, activeDomains, domainCounts, onChange, variant = 'pills' }: Props) {
  const toggle = (d: string) => {
    if (d === '') { onChange([]); return }
    const next = activeDomains.includes(d)
      ? activeDomains.filter(x => x !== d)
      : [...activeDomains, d]
    onChange(next)
  }

  const isActive = (d: string) => d === '' ? activeDomains.length === 0 : activeDomains.includes(d)

  if (variant === 'checkboxes') {
    return (
      <div className="space-y-1.5">
        <button
          onClick={() => onChange([])}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
            activeDomains.length === 0 ? 'bg-amber-400/10 text-amber-400' : 'text-gray-400 hover:bg-card hover:text-gray-200'
          }`}
        >
          <span>All domains</span>
          {domainCounts && (
            <span className="text-xs text-gray-500">{Object.values(domainCounts).reduce((a, b) => a + b, 0)}</span>
          )}
        </button>
        {domains.map(d => (
          <button
            key={d}
            onClick={() => toggle(d)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
              isActive(d) ? 'bg-amber-400/10 text-amber-400' : 'text-gray-400 hover:bg-card hover:text-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 ${isActive(d) ? 'bg-amber-400 border-amber-400' : 'border-gray-600'}`}>
                {isActive(d) && <span className="text-black text-[8px] leading-none">✓</span>}
              </span>
              <span className="capitalize">{d}</span>
            </div>
            {domainCounts?.[d] !== undefined && (
              <span className="text-xs text-gray-500">{domainCounts[d]}</span>
            )}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {(['', ...domains] as string[]).map(d => (
        <button
          key={d || 'all'}
          onClick={() => toggle(d)}
          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
            isActive(d)
              ? 'bg-amber-400 text-black border-amber-400 font-medium'
              : 'bg-card text-gray-400 border-border hover:border-amber-400/50 hover:text-gray-200'
          }`}
        >
          {d || 'All'}
        </button>
      ))}
    </div>
  )
}
