import { useMemo } from 'react'
import { getRecent } from '../lib/recentSearches'

interface Props {
  open: boolean
  onClose: () => void
}

export function AnalyticsPanel({ open, onClose }: Props) {
  const recent = useMemo(() => getRecent(), [open])

  const stats = useMemo(() => {
    if (recent.length === 0) return null
    const total = recent.length
    const domainFreq: Record<string, number> = {}
    const termFreq: Record<string, number> = {}
    let totalMs = 0
    let msCount = 0

    for (const r of recent) {
      if (r.domain) {
        for (const d of r.domain.split(',').filter(Boolean)) {
          domainFreq[d] = (domainFreq[d] ?? 0) + 1
        }
      }
      const words = r.q.toLowerCase().split(/\s+/).filter(w => w.length > 2)
      for (const w of words) termFreq[w] = (termFreq[w] ?? 0) + 1
      if (r.queryTimeMs > 0) { totalMs += r.queryTimeMs; msCount++ }
    }

    const topDomains = Object.entries(domainFreq).sort((a, b) => b[1] - a[1]).slice(0, 6)
    const topTerms = Object.entries(termFreq).sort((a, b) => b[1] - a[1]).slice(0, 5)
    const avgMs = msCount > 0 ? Math.round(totalMs / msCount) : 0
    const maxDomainCount = topDomains[0]?.[1] ?? 1

    return { total, topDomains, topTerms, avgMs, maxDomainCount }
  }, [recent])

  // sparkline data: queryTimeMs over last 10 searches
  const sparkline = recent.slice(0, 10).map(r => r.queryTimeMs).reverse()
  const maxMs = Math.max(...sparkline, 1)

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden />
      <aside
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-card border-l border-border shadow-2xl flex flex-col overflow-y-auto"
        role="complementary"
        aria-label="Search analytics"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold text-gray-200">Search Analytics</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-200 transition-colors">✕</button>
        </div>

        {!stats ? (
          <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">No search history yet</div>
        ) : (
          <div className="px-5 py-4 space-y-6">
            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-3">
              <StatBox label="Total searches" value={String(stats.total)} />
              <StatBox label="Avg response" value={stats.avgMs > 0 ? `${stats.avgMs}ms` : 'N/A'} />
            </div>

            {/* Top search terms */}
            {stats.topTerms.length > 0 && (
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wider mb-2">Top terms</p>
                <div className="flex flex-wrap gap-1.5">
                  {stats.topTerms.map(([term, count]) => (
                    <span key={term} className="text-xs bg-subtle border border-border rounded-full px-2.5 py-1 text-gray-300">
                      {term}
                      <span className="ml-1.5 text-gray-600">{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Domain distribution */}
            {stats.topDomains.length > 0 && (
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wider mb-2">Domains explored</p>
                <div className="space-y-2">
                  {stats.topDomains.map(([domain, count]) => (
                    <div key={domain} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-20 truncate capitalize">{domain}</span>
                      <div className="flex-1 h-1.5 bg-subtle rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-400"
                          style={{ width: `${(count / stats.maxDomainCount) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 w-4 text-right">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Response time sparkline */}
            {sparkline.some(v => v > 0) && (
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wider mb-2">Response time (last 10)</p>
                <div className="flex items-end gap-1 h-12">
                  {sparkline.map((ms, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5">
                      <div
                        className="w-full rounded-sm bg-amber-400/60"
                        style={{ height: `${Math.max(2, (ms / maxMs) * 44)}px` }}
                        title={`${ms}ms`}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-gray-700 mt-1">
                  <span>oldest</span><span>newest</span>
                </div>
              </div>
            )}

            {/* Recent history */}
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wider mb-2">Recent ({recent.length})</p>
              <div className="space-y-1">
                {recent.slice(0, 8).map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border/50">
                    <span className="text-gray-300 truncate flex-1 mr-2">{r.q}</span>
                    <span className="text-gray-600 shrink-0">{r.mode}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-subtle border border-border rounded-lg p-3">
      <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-200">{value}</p>
    </div>
  )
}
