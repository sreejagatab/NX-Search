import { useState, useCallback, useRef } from 'react'
import { llmStream } from '../api/client'

interface UrlSummary {
  url: string
  title: string
  summary: string
  keyPoints: string[]
  suggestedSearches: string[]
}

export function useUrlSummarizer() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rawStream, setRawStream] = useState('')
  const [result, setResult] = useState<UrlSummary | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const summarize = useCallback(async (url: string) => {
    if (!url.trim()) return
    abortRef.current?.abort()
    abortRef.current = new AbortController()
    setLoading(true)
    setError(null)
    setRawStream('')
    setResult(null)

    // Try to fetch page content for richer context; fall back to URL-only prompt
    let pageContext = ''
    try {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(5000) })
      if (res.ok) {
        const data = await res.json() as { contents?: string }
        if (data.contents) {
          // Strip HTML tags and collapse whitespace
          const text = data.contents.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
          pageContext = text.slice(0, 3000)
        }
      }
    } catch { /* CORS or timeout — continue with URL-only */ }

    const systemPrompt = pageContext
      ? `You are a research assistant. Summarize the following web page content.`
      : `You are a research assistant. Summarize the web page at the given URL based on your knowledge.`

    const userPrompt = pageContext
      ? `URL: ${url}\n\nPage content:\n${pageContext}\n\nProvide:\n1. A 2–3 sentence summary\n2. 3–5 key points (as bullet list)\n3. 3 suggested search queries to explore this topic further\n\nFormat: Start with the summary paragraph, then "Key points:" header, then bullets, then "Search queries:" header, then the 3 queries one per line.`
      : `URL: ${url}\n\nProvide:\n1. A 2–3 sentence summary of this page/resource\n2. 3–5 key points (as bullet list)\n3. 3 suggested search queries to explore this topic further\n\nFormat: Start with the summary paragraph, then "Key points:" header, then bullets, then "Search queries:" header, then the 3 queries one per line.`

    let fullText = ''
    try {
      await llmStream(
        '/v1/chat/completions',
        {
          model: 'qwen3-72b',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          stream: true,
          max_tokens: 600,
          temperature: 0.3,
        },
        token => {
          fullText += token
          setRawStream(fullText)
        },
        abortRef.current.signal,
      )
      // Parse structured output
      const keyPointsMatch = fullText.match(/Key points?:?\n([\s\S]*?)(?:Search queries?:|$)/i)
      const searchMatch = fullText.match(/Search queries?:?\n([\s\S]*?)$/i)
      const summaryText = fullText.split(/Key points?:/i)[0].trim()
      const keyPoints = keyPointsMatch
        ? keyPointsMatch[1].split('\n').map(l => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean)
        : []
      const suggestedSearches = searchMatch
        ? searchMatch[1].split('\n').map(l => l.replace(/^[-•*\d.]\s*/, '').trim()).filter(Boolean).slice(0, 3)
        : []
      setResult({ url, title: new URL(url).hostname, summary: summaryText, keyPoints, suggestedSearches })
    } catch (e: unknown) {
      if ((e as Error).name !== 'AbortError') setError((e as Error).message || 'Failed to summarize')
    } finally {
      setLoading(false)
    }
  }, [])

  const abort = useCallback(() => { abortRef.current?.abort(); setLoading(false) }, [])
  const reset = useCallback(() => { setResult(null); setRawStream(''); setError(null) }, [])

  return { loading, error, rawStream, result, summarize, abort, reset }
}
