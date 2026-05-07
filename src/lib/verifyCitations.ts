import type { SearchResult } from '../types'

export interface CitationVerification {
  index: number   // 1-based citation number [1], [2], etc.
  result: SearchResult
  verified: boolean
  matchedPhrase: string | null
}

// Extract all citation numbers from an answer text
export function parseCitationNumbers(answer: string): number[] {
  const matches = [...answer.matchAll(/\[(\d+)\]/g)]
  return [...new Set(matches.map(m => parseInt(m[1])))].sort((a, b) => a - b)
}

// Extract the sentence(s) around each citation in the answer
function extractCitationContext(answer: string, citationNum: number): string {
  const pattern = new RegExp(`[^.!?]*\\[${citationNum}\\][^.!?]*[.!?]?`, 'g')
  const matches = [...answer.matchAll(pattern)]
  return matches.map(m => m[0]).join(' ').slice(0, 300)
}

// Extract key noun phrases from a sentence for matching
function extractKeyTerms(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 4 && !STOP_WORDS.has(w))
    .slice(0, 12)
}

const STOP_WORDS = new Set([
  'about', 'above', 'after', 'again', 'against', 'their', 'there', 'these',
  'those', 'through', 'under', 'until', 'while', 'which', 'where', 'when',
  'being', 'having', 'using', 'based', 'within', 'between', 'during',
  'should', 'would', 'could', 'other', 'every', 'first', 'second', 'third',
])

// Verify a single citation: check if result content contains key terms from the cited sentence
function verifySingle(answer: string, citationNum: number, result: SearchResult): { verified: boolean; matchedPhrase: string | null } {
  const context = extractCitationContext(answer, citationNum)
  if (!context) return { verified: false, matchedPhrase: null }
  const keyTerms = extractKeyTerms(context)
  if (keyTerms.length === 0) return { verified: false, matchedPhrase: null }

  const content = result.content.toLowerCase()
  const matchedTerms = keyTerms.filter(term => content.includes(term))
  const matchRatio = matchedTerms.length / keyTerms.length

  // Verified if >40% of key terms appear in the cited content
  if (matchRatio >= 0.4 && matchedTerms.length >= 2) {
    return { verified: true, matchedPhrase: matchedTerms.slice(0, 3).join(', ') }
  }
  return { verified: false, matchedPhrase: null }
}

export function verifyCitations(answer: string, results: SearchResult[]): CitationVerification[] {
  if (!answer || results.length === 0) return []
  const citationNums = parseCitationNumbers(answer)
  return citationNums
    .map(num => {
      const result = results[num - 1]
      if (!result) return null
      const { verified, matchedPhrase } = verifySingle(answer, num, result)
      return { index: num, result, verified, matchedPhrase }
    })
    .filter((v): v is CitationVerification => v !== null)
}

// Aggregate confidence score for all citations (0–100)
export function citationConfidenceScore(verifications: CitationVerification[]): number {
  if (verifications.length === 0) return 100
  const verified = verifications.filter(v => v.verified).length
  return Math.round((verified / verifications.length) * 100)
}
