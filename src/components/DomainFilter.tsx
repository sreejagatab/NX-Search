interface Props {
  domains: string[]
  activeDomain: string
  domainCounts?: Record<string, number>
  onChange: (domain: string) => void
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
  default: 'bg-gray-800 text-gray-300 border-gray-600',
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

export function DomainFilter({ domains, activeDomain, domainCounts, onChange, variant = 'pills' }: Props) {
  const all = ['', ...domains]

  if (variant === 'checkboxes') {
    return (
      <div className="space-y-1.5">
        <button
          onClick={() => onChange('')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
            activeDomain === '' ? 'bg-amber-400/10 text-amber-400' : 'text-gray-400 hover:bg-card hover:text-gray-200'
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
            onClick={() => onChange(activeDomain === d ? '' : d)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
              activeDomain === d ? 'bg-amber-400/10 text-amber-400' : 'text-gray-400 hover:bg-card hover:text-gray-200'
            }`}
          >
            <span className="capitalize">{d}</span>
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
      {all.map(d => (
        <button
          key={d || 'all'}
          onClick={() => onChange(d)}
          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
            activeDomain === d
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
