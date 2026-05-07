export interface ParsedOperators {
  cleanQuery: string
  domains: string[]
  excludeDomains: string[]
  minConfidence: number  // 0-100 scale matching useSearch convention
  maxConfidence: number  // 0-100 scale; 100 = no upper limit
  exactPhrases: string[]
}

export function parseOperators(raw: string): ParsedOperators {
  const domains: string[] = []
  const excludeDomains: string[] = []
  const exactPhrases: string[] = []
  let minConfidence = 0
  let maxConfidence = 100

  // extract "exact phrases" — keep the words in query text but record for client filter
  let cleaned = raw.replace(/"([^"]+)"/g, (_, phrase: string) => {
    exactPhrases.push(phrase.toLowerCase())
    return phrase
  })

  // extract domain:xxx and -domain:xxx
  cleaned = cleaned.replace(/(-?)domain:(\w+)/gi, (_, neg: string, d: string) => {
    if (neg) excludeDomains.push(d.toLowerCase())
    else domains.push(d.toLowerCase())
    return ''
  })

  // extract confidence:>0.8 / confidence:>=80 / confidence:<0.5 / confidence:0.9
  cleaned = cleaned.replace(/confidence:(>=?|<=?)?(\d+\.?\d*)/gi, (_, op: string, val: string) => {
    const num = parseFloat(val)
    const pct = num > 1 ? num : num * 100  // normalise 0–1 → 0–100
    if (op === '<' || op === '<=') maxConfidence = pct
    else minConfidence = pct  // >, >=, or bare value all set minimum
    return ''
  })

  return {
    cleanQuery: cleaned.replace(/\s+/g, ' ').trim(),
    domains,
    excludeDomains,
    minConfidence,
    maxConfidence,
    exactPhrases,
  }
}

export const OPERATOR_EXAMPLES = [
  { op: 'domain:python', desc: 'Filter by domain' },
  { op: '-domain:security', desc: 'Exclude a domain' },
  { op: '"exact phrase"', desc: 'Require exact match' },
  { op: 'confidence:>0.8', desc: 'Min confidence (or <0.5 for max)' },
]
