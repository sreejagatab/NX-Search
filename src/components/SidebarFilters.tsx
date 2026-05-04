import { useState } from 'react'
import { DomainFilter } from './DomainFilter'
import type { SearchMode } from '../types'

interface Props {
  domains: string[]
  activeDomains: string[]
  domainCounts: Record<string, number>
  onDomainsChange: (ds: string[]) => void
  mode: SearchMode
  threshold: number
  onThresholdChange: (t: number) => void
  minConfidence: number
  onMinConfidenceChange: (v: number) => void
  sources: string[]
  activeSources: string[]
  sourceCounts: Record<string, number>
  onSourcesChange: (s: string[]) => void
}

function SectionHeader({ label, count, open, onToggle }: { label: string; count?: number; open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between text-xs text-gray-600 uppercase tracking-wider mb-2 hover:text-gray-400 transition-colors"
    >
      <span>{label}</span>
      <div className="flex items-center gap-1.5">
        {count !== undefined && count > 0 && <span className="text-gray-500">{count}</span>}
        <span className="text-gray-600">{open ? '▲' : '▼'}</span>
      </div>
    </button>
  )
}

export function SidebarFilters({
  domains, activeDomains, domainCounts, onDomainsChange,
  mode, threshold, onThresholdChange,
  minConfidence, onMinConfidenceChange,
  sources, activeSources, sourceCounts, onSourcesChange,
}: Props) {
  const [domainsOpen, setDomainsOpen] = useState(true)
  const [sourcesOpen, setSourcesOpen] = useState(true)
  const [slidersOpen, setSlidersOpen] = useState(true)

  const showThreshold = mode === 'semantic' || mode === 'hybrid'

  return (
    <div className="space-y-5">
      {/* Domain filter */}
      <div>
        <SectionHeader
          label="Domains"
          count={Object.values(domainCounts).reduce((a, b) => a + b, 0)}
          open={domainsOpen}
          onToggle={() => setDomainsOpen(v => !v)}
        />
        {domainsOpen && (
          <DomainFilter
            domains={domains}
            activeDomains={activeDomains}
            domainCounts={domainCounts}
            onChange={onDomainsChange}
            variant="checkboxes"
          />
        )}
      </div>

      {/* Domain distribution bar */}
      {domainsOpen && Object.keys(domainCounts).length > 0 && (
        <DomainDistributionBar domainCounts={domainCounts} />
      )}

      {/* Sliders */}
      <div>
        <SectionHeader label="Filters" open={slidersOpen} onToggle={() => setSlidersOpen(v => !v)} />
        {slidersOpen && (
          <div className="space-y-4">
            {showThreshold && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-500">Min similarity</label>
                  <span className="text-xs text-amber-400">{Math.round(threshold * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5" max="0.95" step="0.05"
                  value={threshold}
                  onChange={e => onThresholdChange(parseFloat(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none bg-subtle accent-amber-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-700 mt-0.5">
                  <span>50%</span><span>95%</span>
                </div>
              </div>
            )}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-500">Min confidence</label>
                <span className="text-xs text-amber-400">{minConfidence}%</span>
              </div>
              <input
                type="range"
                min="0" max="95" step="5"
                value={minConfidence}
                onChange={e => onMinConfidenceChange(parseInt(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none bg-subtle accent-amber-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-700 mt-0.5">
                <span>0%</span><span>95%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Source filter */}
      {sources.length > 0 && (
        <div>
          <SectionHeader
            label="Sources"
            count={sources.length}
            open={sourcesOpen}
            onToggle={() => setSourcesOpen(v => !v)}
          />
          {sourcesOpen && (
            <div className="space-y-1.5">
              {sources.map(s => {
                const active = activeSources.includes(s)
                return (
                  <button
                    key={s}
                    onClick={() => onSourcesChange(active ? activeSources.filter(x => x !== s) : [...activeSources, s])}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${
                      active ? 'bg-amber-400/10 text-amber-400' : 'text-gray-400 hover:bg-card hover:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 ${active ? 'bg-amber-400 border-amber-400' : 'border-gray-600'}`}>
                        {active && <span className="text-black text-[8px] leading-none">✓</span>}
                      </span>
                      <span className="truncate">{s}</span>
                    </div>
                    <span className="text-xs text-gray-600">{sourceCounts[s] ?? 0}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DomainDistributionBar({ domainCounts }: { domainCounts: Record<string, number> }) {
  const total = Object.values(domainCounts).reduce((a, b) => a + b, 0)
  if (total === 0) return null
  const entries = Object.entries(domainCounts).sort((a, b) => b[1] - a[1])

  const COLORS: Record<string, string> = {
    python: '#3b82f6', javascript: '#eab308', security: '#ef4444',
    architecture: '#a855f7', typescript: '#60a5fa', rust: '#f97316',
    go: '#06b6d4', java: '#f87171', default: '#6b7280',
  }

  return (
    <div>
      <p className="text-[10px] text-gray-700 uppercase tracking-wider mb-1.5">Distribution</p>
      <div className="flex h-2 rounded-full overflow-hidden gap-px">
        {entries.map(([domain, count]) => (
          <div
            key={domain}
            title={`${domain}: ${count}`}
            style={{ width: `${(count / total) * 100}%`, backgroundColor: COLORS[domain] ?? COLORS.default }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-2 gap-y-1 mt-2">
        {entries.slice(0, 5).map(([domain, count]) => (
          <span key={domain} className="flex items-center gap-1 text-[10px] text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: COLORS[domain] ?? COLORS.default }} />
            {domain} {count}
          </span>
        ))}
      </div>
    </div>
  )
}
