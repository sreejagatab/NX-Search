const RECENT_KEY = 'nx_recent_searches'
const MAX = 10

export interface RecentSearch {
  q: string
  mode: string
  domain: string
  resultCount: number
  queryTimeMs: number
  timestamp: number
}

export function getRecent(): RecentSearch[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') } catch { return [] }
}

export function addRecent(entry: RecentSearch) {
  const prev = getRecent().filter(x => x.q !== entry.q)
  localStorage.setItem(RECENT_KEY, JSON.stringify([entry, ...prev].slice(0, MAX)))
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
