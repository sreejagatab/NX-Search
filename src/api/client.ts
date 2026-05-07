// In production, use relative URLs so the nginx proxy at nx-search.jagatab.uk handles /api/ and /v1/
// In dev, Vite's proxy config handles the same routes
const BASE_URL = import.meta.env.VITE_NEURONX_API_URL ?? ''
const API_KEY = import.meta.env.VITE_NEURONX_API_KEY ?? ''

// In-flight deduplication: same URL → share the pending Promise
const inFlight = new Map<string, Promise<unknown>>()

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

function friendlyError(status: number, text: string): string {
  if (status === 401) return '401 — Invalid API key. Check your VITE_NEURONX_API_KEY in .env'
  if (status === 403) return '403 — Access denied'
  if (status === 429) return '429 — Rate limited. Please wait a moment before retrying'
  if (status >= 500) return `${status} — Server error. NeuronX may be temporarily unavailable`
  return `${status}: ${text}`
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`
  const key = `${init?.method ?? 'GET'}:${url}:${init?.body ?? ''}`

  const pending = inFlight.get(key)
  if (pending) return pending as Promise<T>

  const promise = fetch(url, {
    ...init,
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  }).then(async res => {
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText)
      throw new ApiError(res.status, friendlyError(res.status, text))
    }
    return res.json() as T
  }).finally(() => {
    inFlight.delete(key)
  })

  inFlight.set(key, promise as Promise<unknown>)
  return promise
}

// Streaming for the NeuronX vLLM endpoint (/v1/chat/completions — OpenAI SSE format)
const STREAM_IDLE_TIMEOUT_MS = 60_000 // abort if no data received for 60s

// Track active LLM streams by path so concurrent calls to the same endpoint can be detected.
// Each hook manages its own AbortController — this map is for observability / future dedup.
const activeStreams = new Map<string, AbortController>()

export function llmStream(path: string, body: unknown, onToken: (token: string) => void, signal?: AbortSignal): Promise<void> {
  // Abort any existing stream on the same path before starting a new one
  const existing = activeStreams.get(path)
  if (existing) existing.abort('superseded')
  // Internal controller so we can abort on idle timeout without disturbing caller's signal
  const ctrl = new AbortController()
  if (signal) signal.addEventListener('abort', () => ctrl.abort(signal.reason), { once: true })
  activeStreams.set(path, ctrl)

  let idleTimer: ReturnType<typeof setTimeout> | null = null
  const resetIdle = () => {
    if (idleTimer) clearTimeout(idleTimer)
    idleTimer = setTimeout(() => ctrl.abort('Stream idle timeout'), STREAM_IDLE_TIMEOUT_MS)
  }

  resetIdle() // start the clock from connection time

  return fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: ctrl.signal,
  }).then(async (res) => {
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText)
      throw new ApiError(res.status, friendlyError(res.status, text))
    }
    if (!res.body) return
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        resetIdle() // got bytes — reset idle clock
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') return
          if (!data) continue
          try {
            const parsed = JSON.parse(data)
            const token = parsed.choices?.[0]?.delta?.content ?? ''
            if (token) onToken(token)
          } catch { /* skip malformed chunks */ }
        }
      }
    } finally {
      if (idleTimer) clearTimeout(idleTimer)
      activeStreams.delete(path)
    }
  }).catch(err => {
    if (idleTimer) clearTimeout(idleTimer)
    activeStreams.delete(path)
    // Re-map idle timeout to a user-friendly ApiError
    const msg = (err as Error).message ?? String(err)
    if (msg === 'Stream idle timeout') throw new ApiError(504, 'AI answer timed out — the model stopped responding. Try again.')
    throw err
  })
}
