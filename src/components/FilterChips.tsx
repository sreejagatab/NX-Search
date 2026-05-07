import type { SearchMode, SortField } from '../types'

interface Props {
  domains: string[]
  mode: SearchMode
  sort: SortField
  minConfidence: number
  activeSources: string[]
  onRemoveDomain: (d: string) => void
  onSetMode: (m: SearchMode) => void
  onSetSort: (s: SortField) => void
  onResetConfidence: () => void
  onRemoveSource: (s: string) => void
  onClearAll?: () => void
}

export function FilterChips({
  domains, mode, sort, minConfidence, activeSources,
  onRemoveDomain, onSetMode, onSetSort, onResetConfidence, onRemoveSource, onClearAll,
}: Props) {
  const chips: { label: string; onRemove: () => void }[] = []

  domains.forEach(d => chips.push({ label: `domain: ${d}`, onRemove: () => onRemoveDomain(d) }))
  if (mode !== 'semantic') chips.push({ label: `mode: ${mode}`, onRemove: () => onSetMode('semantic') })
  if (sort !== 'similarity') chips.push({ label: `sort: ${sort}`, onRemove: () => onSetSort('similarity') })
  if (minConfidence > 0) chips.push({ label: `min conf: ${minConfidence}%`, onRemove: onResetConfidence })
  activeSources.forEach(s => chips.push({ label: `source: ${s}`, onRemove: () => onRemoveSource(s) }))

  if (chips.length === 0) return null

  return (
    <div className="flex items-center gap-1.5 px-4 pb-2 max-w-7xl mx-auto overflow-x-auto scrollbar-none">
      <span className="text-[10px] text-gray-700 shrink-0 uppercase tracking-wider">Active:</span>
      {chips.map(chip => (
        <span
          key={chip.label}
          className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-card border border-amber-400/20 text-xs text-amber-400/80 shrink-0"
        >
          {chip.label}
          <button
            onClick={chip.onRemove}
            className="text-amber-400/40 hover:text-amber-300 transition-colors w-4 h-4 flex items-center justify-center rounded-full hover:bg-amber-400/10"
            aria-label={`Remove filter ${chip.label}`}
          >
            ×
          </button>
        </span>
      ))}
      {chips.length > 1 && onClearAll && (
        <button
          onClick={onClearAll}
          className="text-[10px] text-gray-600 hover:text-red-400 transition-colors shrink-0 ml-1 underline underline-offset-2"
        >
          Clear all
        </button>
      )}
    </div>
  )
}
