import { apiFetch, llmStream } from './client'
import type { SearchResponse, DomainsResponse, StatsResponse, SuggestResponse, SearchResult, FocusMode } from '../types'

// Raw shape returned by the v2 API
interface V2Result {
  title: string
  url: string
  snippet: string
  source: string
  engine: string
  file_path?: string
  hit_count?: number
  score: number
  engines?: string[]
}

interface V2Response {
  query: string
  intent?: string
  intent_confidence?: number
  ai_summary?: string
  results: V2Result[]
  total: number
  page: number
  per_page: number
  query_time_ms: number
  engines_used?: string[]
  related_searches?: string[]
  sources?: Record<string, number>
}

const SOURCE_LABELS: Record<string, string> = {
  'neuronx_memory.db': 'Internal',
  'codebase': 'Codebase',
}

function mapResults(raw: V2Result[]): SearchResult[] {
  if (!raw.length) return []
  const maxScore = Math.max(...raw.map(r => r.score), 0.001)
  return raw.map((r, i) => {
    // For codebase results, bare shebang snippets are useless — promote file_path
    const isShebang = r.snippet.trim().startsWith('#!')
    const content = isShebang && r.file_path
      ? `${r.file_path}\n\n${r.snippet}`
      : r.snippet
    const title = r.title || (r.file_path ? r.file_path.split('/').pop() : undefined)
    const relScore = r.score / maxScore
    const source = SOURCE_LABELS[r.source] ?? r.source
    return {
      id: r.url || r.file_path || String(i),
      title,
      url: r.url && !r.url.startsWith('file://') ? r.url : undefined,
      content,
      domain: r.engine,
      source,
      confidence: relScore,
      similarity: relScore,
      file_path: r.file_path,
      hit_count: r.hit_count,
      engines: r.engines,
    }
  })
}

interface SearchOptions {
  perPage?: number
  filters?: Record<string, string>
  searchType?: string
}

async function v2Search(query: string, opts: SearchOptions = {}): Promise<SearchResponse> {
  const { perPage = 20, filters = {}, searchType } = opts
  const body: Record<string, unknown> = { query, filters, per_page: perPage, page: 1 }
  if (searchType) body.search_type = searchType
  const raw = await apiFetch<V2Response>('/api/search/v2/search', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return {
    results: mapResults(raw.results),
    total: raw.total,
    query_time_ms: raw.query_time_ms,
    ai_summary: raw.ai_summary,
    intent: raw.intent,
    intent_confidence: raw.intent_confidence,
    related_searches: raw.related_searches,
    sources: raw.sources,
    engines_used: raw.engines_used,
  }
}

// Only 'web' engine filter works reliably server-side; others cause 502.
function engineFilter(domain: string): Record<string, string> {
  return domain === 'web' ? { engine: 'web' } : {}
}

// semantic — AI vector search, 20 results, broad recall
export function searchSemantic(q: string, limit = 20, _threshold = 0.7, domain = ''): Promise<SearchResponse> {
  return v2Search(q, { perPage: limit, filters: engineFilter(domain), searchType: 'semantic' })
}

// pattern — keyword/exact match, 20 results, higher precision
export function searchPatterns(q: string, domain = '', limit = 20): Promise<SearchResponse> {
  return v2Search(q, { perPage: limit, filters: engineFilter(domain), searchType: 'pattern' })
}

// hybrid — blends semantic + pattern for broadest coverage, fetches more (30) then re-ranks client-side
export function searchHybrid(q: string, limit = 20, _threshold = 0.7, domain = ''): Promise<SearchResponse> {
  return v2Search(q, { perPage: Math.min(limit + 10, 30), filters: engineFilter(domain), searchType: 'hybrid' })
}

// Domains are derived from live search results; seed list covers known domains the API returns
export const KNOWN_DOMAINS = ['web', 'code', 'python', 'javascript', 'typescript', 'rust', 'go', 'java', 'sql', 'bash', 'ruby', 'php', 'csharp', 'cpp', 'kotlin', 'swift']

export function fetchDomains(): Promise<DomainsResponse> {
  return Promise.resolve({ domains: KNOWN_DOMAINS })
}

// Documented estimates from NeuronX backend (no live stats endpoint available)
export function fetchStats(): Promise<StatsResponse> {
  return Promise.resolve({ total_patterns: 257000, total_vectors: 210000, domains: {} })
}

export async function fetchSuggestions(q: string): Promise<SuggestResponse> {
  const suggestions = await apiFetch<string[]>(`/api/search/v2/suggest?q=${encodeURIComponent(q)}`)
  return { suggestions: Array.isArray(suggestions) ? suggestions : [] }
}

export interface ThreadMessage {
  role: 'user' | 'assistant'
  content: string
}

export type AnswerStyle = 'concise' | 'detailed' | 'eli5' | 'bullets'

export const ANSWER_STYLES: { value: AnswerStyle; label: string }[] = [
  { value: 'concise', label: 'Concise' },
  { value: 'detailed', label: 'Detailed' },
  { value: 'eli5', label: 'ELI5' },
  { value: 'bullets', label: 'Bullets' },
]

const ANSWER_STYLE_PROMPTS: Record<AnswerStyle, string> = {
  concise:  '- Answer in 2-3 clear, direct sentences. Key facts only.',
  detailed: '- Give a thorough answer. Use ## headers and bullet points to structure long answers. Cover all relevant aspects.',
  eli5:     '- Explain as if to someone with no background knowledge. Use plain language, short sentences, and simple analogies. No jargon.',
  bullets:  '- Always respond as a structured markdown bullet list. Use sub-bullets for detail. No prose paragraphs.',
}

const FOCUS_PROMPTS: Record<FocusMode, string> = {
  research: 'You are a comprehensive research assistant. Synthesize information across sources with depth and accuracy.',
  web: 'You are a factual web search assistant. Prioritize accuracy, recency, and information directly from the web results.',
  quick: '',
}

// AI Mode — calls the NeuronX vLLM at /v1/chat/completions with top results as context.
// Accepts optional thread history so follow-up queries retain conversation context.
export function generateAIAnswer(
  query: string,
  results: SearchResult[],
  onToken: (token: string) => void,
  signal?: AbortSignal,
  thread: ThreadMessage[] = [],
  answerStyle: AnswerStyle = 'concise',
  focusMode: FocusMode = 'research',
): Promise<void> {
  const top = results.slice(0, 6)
  const context = top.map((r, i) => {
    const label = r.title ?? r.file_path ?? `Result ${i + 1}`
    const snippet = r.content.slice(0, 350).replace(/\n+/g, ' ')
    return `[${i + 1}] ${label}: ${snippet}`
  }).join('\n\n')

  const styleInstruction = ANSWER_STYLE_PROMPTS[answerStyle]
  const focusInstruction = FOCUS_PROMPTS[focusMode] ? `${FOCUS_PROMPTS[focusMode]}\n` : ''

  const systemPrompt = `${focusInstruction}You are a precise AI assistant. Search results are provided as context.
${styleInstruction}
- Cite sources inline as [1], [2], [3] etc.
- Use **bold** for key terms
- If the results don't fully answer the question, state that briefly
- Do not invent information not present in the results`

  const contextMessage = `Search results for "${query}":\n\n${context}\n\nAnswer the question: "${query}"`

  // Build messages: system + thread history + new context+question
  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...thread,
    { role: 'user' as const, content: contextMessage },
  ]

  return llmStream(
    '/v1/chat/completions',
    { model: 'neuronx', messages, max_tokens: 500, stream: true },
    onToken,
    signal,
  )
}

// People Also Ask — generates 3 follow-up questions from query + main answer + context
export async function generateRelatedQuestions(
  query: string,
  results: SearchResult[],
  mainAnswer: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const context = results.slice(0, 4)
    .map((r, i) => `[${i + 1}] ${r.content.slice(0, 200).replace(/\n+/g, ' ')}`)
    .join('\n')

  const prompt = `Given this search query: "${query}"

Main answer summary: "${mainAnswer.slice(0, 400)}"

Search result excerpts:
${context}

Generate exactly 3 natural follow-up questions a user would ask about this topic. Return ONLY a valid JSON array of 3 strings, no other text. Example format: ["Question one?", "Question two?", "Question three?"]`

  return new Promise<string[]>(resolve => {
    let raw = ''
    llmStream(
      '/v1/chat/completions',
      { model: 'neuronx', messages: [{ role: 'user', content: prompt }], max_tokens: 150, stream: true },
      token => { raw += token },
      signal,
    ).then(() => {
      try {
        const match = raw.match(/\[[\s\S]*?\]/)
        if (match) {
          const parsed = JSON.parse(match[0]) as unknown[]
          if (Array.isArray(parsed) && parsed.every(q => typeof q === 'string')) {
            resolve((parsed as string[]).slice(0, 3))
            return
          }
        }
      } catch { /* fall through */ }
      resolve([])
    }).catch(() => resolve([]))
  })
}

// People Also Ask — generates a short 2-3 sentence answer for a single follow-up question
export function generateMiniAnswer(
  question: string,
  results: SearchResult[],
  onToken: (token: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const context = results.slice(0, 4)
    .map((r, i) => `[${i + 1}] ${r.content.slice(0, 250).replace(/\n+/g, ' ')}`)
    .join('\n')

  const prompt = `Answer this question in 2-3 sentences using only the context below.

Question: "${question}"

Context:
${context}

Rules:
- 2-3 sentences maximum
- Direct and factual, no filler
- If context lacks the answer, say so briefly`

  return llmStream(
    '/v1/chat/completions',
    { model: 'neuronx', messages: [{ role: 'user', content: prompt }], max_tokens: 120, stream: true },
    onToken,
    signal,
  )
}

// Ask Brain — calls the NeuronX vLLM for a detailed, structured answer
export function askBrain(
  query: string,
  contextResults: Array<{ content: string }>,
  onToken: (token: string) => void,
  signal?: AbortSignal,
  answerStyle: AnswerStyle = 'detailed',
): Promise<void> {
  const context = contextResults
    .map((r, i) => `[${i + 1}] ${r.content.slice(0, 350).replace(/\n+/g, ' ')}`)
    .join('\n\n')

  const styleInstruction = ANSWER_STYLE_PROMPTS[answerStyle]

  const prompt = `You are a deep knowledge assistant. Using only the context below, answer: "${query}"

Context:
${context}

Rules:
${styleInstruction}
- Cite sources inline as [1], [2], [3] etc.
- Use **bold** for key terms
- If context is insufficient, say so clearly`

  return llmStream(
    '/v1/chat/completions',
    { model: 'neuronx', messages: [{ role: 'user', content: prompt }], max_tokens: 800, stream: true },
    onToken,
    signal,
  )
}
