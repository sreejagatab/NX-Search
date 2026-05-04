import { apiFetch, apiStream } from './client'
import type { SearchResponse, DomainsResponse, StatsResponse, SuggestResponse } from '../types'

export function searchPatterns(q: string, domain = '', limit = 20): Promise<SearchResponse> {
  const params = new URLSearchParams({ q, limit: String(limit) })
  if (domain) params.set('domain', domain)
  return apiFetch<SearchResponse>(`/api/search?${params}`)
}

export function searchSemantic(q: string, limit = 20, threshold = 0.7): Promise<SearchResponse> {
  const params = new URLSearchParams({ q, limit: String(limit), threshold: String(threshold) })
  return apiFetch<SearchResponse>(`/api/search/semantic?${params}`)
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
