interface Props {
  totalPatterns: number
  totalVectors: number
  queryTimeMs?: number
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return String(n)
}

export function StatsChip({ totalPatterns, totalVectors, queryTimeMs }: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border text-xs text-gray-400">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
        {fmt(totalPatterns)} patterns
      </span>
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border text-xs text-gray-400">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
        {fmt(totalVectors)} vectors
      </span>
      {queryTimeMs !== undefined && queryTimeMs > 0 && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border text-xs text-gray-400">
          {queryTimeMs}ms
        </span>
      )}
    </div>
  )
}
