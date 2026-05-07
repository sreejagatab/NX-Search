const RECENT_KEY = 'nx_recent_searches'
const SAVED_KEY = 'nx_saved_searches'
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
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    // Migrate legacy string[] entries and ensure all entries have valid timestamps
    const now = Date.now()
    return (raw as (RecentSearch | string)[]).map((item, i) => {
      if (typeof item === 'string') {
        return { q: item, mode: 'semantic', domain: '', resultCount: 0, queryTimeMs: 0, timestamp: now - i * 1000 }
      }
      return { ...item, timestamp: item.timestamp > 0 ? item.timestamp : now - i * 1000 }
    })
  } catch { return [] }
}

export function addRecent(entry: RecentSearch) {
  const prev = getRecent().filter(x => x.q !== entry.q)
  localStorage.setItem(RECENT_KEY, JSON.stringify([entry, ...prev].slice(0, MAX)))
}

export interface SavedSearch {
  id: string
  name: string
  q: string
  mode: string
  domain: string
  savedAt: number
}

export function getSaved(): SavedSearch[] {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]') } catch { return [] }
}

export function saveSearch(entry: Omit<SavedSearch, 'id' | 'savedAt'>): SavedSearch {
  const saved = getSaved()
  const item: SavedSearch = { ...entry, id: `saved-${Date.now()}`, savedAt: Date.now() }
  localStorage.setItem(SAVED_KEY, JSON.stringify([item, ...saved]))
  return item
}

export function deleteSaved(id: string) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(getSaved().filter(s => s.id !== id)))
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
