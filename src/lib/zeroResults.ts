export interface ZeroResultEntry {
  q: string
  mode: string
  domains: string[]
  timestamp: number
}

const STORAGE_KEY = 'nx-zero-results'
const MAX_ENTRIES = 50

export function getZeroResults(): ZeroResultEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as ZeroResultEntry[]
  } catch {
    return []
  }
}

export function logZeroResult(entry: Omit<ZeroResultEntry, 'timestamp'>): void {
  const existing = getZeroResults()
  // Avoid duplicate consecutive entries for the same query
  if (existing[0]?.q === entry.q) return
  const updated = [{ ...entry, timestamp: Date.now() }, ...existing].slice(0, MAX_ENTRIES)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}

export function clearZeroResults(): void {
  localStorage.removeItem(STORAGE_KEY)
}
