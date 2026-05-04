import type { SearchMode, SortField } from '../types'

interface Props {
  query: string
  domains: string[]
  mode: SearchMode
  sort: SortField
  threshold: number
  minConfidence: number
  activeSources: string[]
  onRemoveDomain: (d: string) => void
  onSetMode: (m: SearchMode) => void
  onSetSort: (s: SortField) => void
  onResetThreshold: () => void
  onResetConfidence: () => void
  onRemoveSource: (s: string) => void
}

export function FilterChips({
  domains, mode, sort, threshold, minConfidence, activeSources,
  onRemoveDomain, onSetMode, onSetSort, onResetThreshold, onResetConfidence, onRemoveSource,
}: Props) {
  const chips: { label: string; onRemove: () => void }[] = []

  domains.forEach(d => chips.push({ label: `domain: ${d}`, onRemove: () => onRemoveDomain(d) }))
  if (mode !== 'semantic') chips.push({ label: `mode: ${mode}`, onRemove: () => onSetMode('semantic') })
  if (sort !== 'similarity') chips.push({ label: `sort: ${sort}`, onRemove: () => onSetSort('similarity') })
  if (threshold !== 0.7) chips.push({ label: `min sim: ${Math.round(threshold * 100)}%`, onRemove: onResetThreshold })
  if (minConfidence > 0) chips.push({ label: `min conf: ${minConfidence}%`, onRemove: onResetConfidence })
  activeSources.forEach(s => chips.push({ label: `source: ${s}`, onRemove: () => onRemoveSource(s) }))

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 px-4 pb-2 max-w-7xl mx-auto">
      {chips.map(chip => (
        <span
          key={chip.label}
          className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-card border border-border text-xs text-gray-400"
        >
          {chip.label}
          <button
            onClick={chip.onRemove}
            className="text-gray-600 hover:text-gray-200 transition-colors w-4 h-4 flex items-center justify-center rounded-full hover:bg-subtle"
            aria-label={`Remove filter ${chip.label}`}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  )
}
