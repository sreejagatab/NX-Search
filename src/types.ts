export interface SearchResult {
  id: string
  content: string
  domain: string
  confidence: number
  similarity: number
  source: string
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
  query_time_ms: number
}

export interface DomainsResponse {
  domains: string[]
}

export interface StatsResponse {
  total_patterns: number
  total_vectors: number
  domains: Record<string, number>
}

export interface SuggestResponse {
  suggestions: string[]
}

export type SearchMode = 'semantic' | 'pattern' | 'hybrid'

export type SortField = 'similarity' | 'confidence' | 'domain'

export interface SearchState {
  query: string
  domain: string
  mode: SearchMode
  sort: SortField
  page: number
  results: SearchResult[]
  total: number
  queryTimeMs: number
  loading: boolean
  error: string | null
}
