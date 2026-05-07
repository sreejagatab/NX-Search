import type { SearchResult } from '../types'

export interface ResultCluster {
  id: string
  label: string
  results: SearchResult[]
}

export function clusterResults(results: SearchResult[], gapThreshold = 0.12): ResultCluster[] {
  if (results.length === 0) return []
  const clusters: ResultCluster[] = []
  let current: SearchResult[] = [results[0]]

  for (let i = 1; i < results.length; i++) {
    const prev = results[i - 1].similarity
    const curr = results[i].similarity
    if (prev - curr > gapThreshold) {
      clusters.push(makeCluster(clusters.length, current))
      current = [results[i]]
    } else {
      current.push(results[i])
    }
  }
  if (current.length > 0) clusters.push(makeCluster(clusters.length, current))
  return clusters
}

function makeCluster(idx: number, results: SearchResult[]): ResultCluster {
  const avgSim = results.reduce((s, r) => s + r.similarity, 0) / results.length
  const topDomain = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.domain] = (acc[r.domain] ?? 0) + 1; return acc
  }, {})
  const domain = Object.entries(topDomain).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
  return {
    id: `cluster-${idx}`,
    label: `${domain ? domain + ' · ' : ''}${(avgSim * 100).toFixed(0)}% avg · ${results.length} result${results.length !== 1 ? 's' : ''}`,
    results,
  }
}
