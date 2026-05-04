const BASE_URL = import.meta.env.VITE_NEURONX_API_URL ?? 'https://neuronx.jagatab.uk'
const API_KEY = import.meta.env.VITE_NEURONX_API_KEY ?? ''

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

export function apiStream(path: string, body: unknown, onToken: (token: string) => void, signal?: AbortSignal): Promise<void> {
  const BASE = import.meta.env.VITE_NEURONX_API_URL ?? 'https://neuronx.jagatab.uk'
  const KEY = import.meta.env.VITE_NEURONX_API_KEY ?? ''

  return fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'X-API-Key': KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  }).then(async (res) => {
    if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`)
    if (!res.body) return
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()
          if (data && data !== '[DONE]') {
            try {
              const parsed = JSON.parse(data)
              const token = parsed.token ?? parsed.text ?? parsed.content ?? data
              onToken(token)
            } catch {
              onToken(data)
            }
          }
        }
      }
    }
  })
}
