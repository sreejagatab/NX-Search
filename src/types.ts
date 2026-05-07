export interface SearchResult {
  id: string
  title?: string
  url?: string
  content: string       // mapped from snippet
  domain: string        // mapped from engine
  source: string
  confidence: number    // normalised score (0–1)
  similarity: number    // same as confidence for this API
  file_path?: string
  hit_count?: number
  engines?: string[]
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
  query_time_ms: number
  ai_summary?: string
  intent?: string
  intent_confidence?: number
  related_searches?: string[]
  sources?: Record<string, number>
  engines_used?: string[]
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

export type FocusMode = 'research' | 'web' | 'quick'

