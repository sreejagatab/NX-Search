import { apiFetch, apiStream } from './client'
import type { SearchResponse, DomainsResponse, StatsResponse, SuggestResponse, SearchResult } from '../types'

export function searchPatterns(q: string, domain = '', limit = 50): Promise<SearchResponse> {
  const params = new URLSearchParams({ q, limit: String(limit) })
  if (domain) params.set('domain', domain)
  return apiFetch<SearchResponse>(`/api/search?${params}`)
}

export function searchSemantic(q: string, limit = 50, threshold = 0.7): Promise<SearchResponse> {
  const params = new URLSearchParams({ q, limit: String(limit), threshold: String(threshold) })
  return apiFetch<SearchResponse>(`/api/search/semantic?${params}`)
}

export async function searchHybrid(q: string, limit = 50, threshold = 0.7, domain = ''): Promise<SearchResponse> {
  const [semResp, patResp] = await Promise.allSettled([
    searchSemantic(q, limit, threshold),
    searchPatterns(q, domain, limit),
  ])

  const semResults: SearchResult[] = semResp.status === 'fulfilled' ? semResp.value.results : []
  const patResults: SearchResult[] = patResp.status === 'fulfilled' ? patResp.value.results : []
  const semTime = semResp.status === 'fulfilled' ? semResp.value.query_time_ms : 0
  const patTime = patResp.status === 'fulfilled' ? patResp.value.query_time_ms : 0

  // RRF merge: score = 1/(60+rank_sem) + 1/(60+rank_pat)
  const K = 60
  const scores = new Map<string, number>()
  const byId = new Map<string, SearchResult>()

  semResults.forEach((r, rank) => {
    byId.set(r.id, r)
    scores.set(r.id, (scores.get(r.id) ?? 0) + 1 / (K + rank))
  })
  patResults.forEach((r, rank) => {
    byId.set(r.id, r)
    scores.set(r.id, (scores.get(r.id) ?? 0) + 1 / (K + rank))
  })

  const merged = [...byId.values()]
    .sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0))
    .slice(0, limit)
    .map(r => ({ ...r, similarity: Math.min(1, (scores.get(r.id) ?? 0) * K) }))

  return {
    results: merged,
    total: merged.length,
    query_time_ms: Math.max(semTime, patTime),
  }
}

export function fetchDomains(): Promise<DomainsResponse> {
  return apiFetch<DomainsResponse>('/api/search/domains')
}

export function fetchStats(): Promise<StatsResponse> {
  return apiFetch<StatsResponse>('/api/search/stats')
}

export function fetchSuggestions(q: string): Promise<SuggestResponse> {
  const params = new URLSearchParams({ q })
  return apiFetch<SuggestResponse>(`/api/search/suggest?${params}`)
}

export function askBrain(
  query: string,
  contextResults: Array<{ content: string }>,
  onToken: (token: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  return apiStream('/api/search/ask', { query, context_results: contextResults }, onToken, signal)
}
