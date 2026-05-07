import type { SearchResult } from '../types'

export interface SavedAnswer {
  id: string
  query: string
  answer: string
  results: SearchResult[]
  savedAt: number
  tags: string[]
  note: string
}

const KEY = 'nx-collections'

function load(): SavedAnswer[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as SavedAnswer[]) : []
  } catch { return [] }
}

function persist(items: SavedAnswer[]) {
  try { localStorage.setItem(KEY, JSON.stringify(items)) } catch { /* ignore */ }
}

export function getCollections(): SavedAnswer[] {
  return load()
}

export function saveAnswer(query: string, answer: string, results: SearchResult[]): SavedAnswer {
  const items = load()
  const entry: SavedAnswer = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    query,
    answer,
    results: results.slice(0, 6),
    savedAt: Date.now(),
    tags: [],
    note: '',
  }
  persist([entry, ...items])
  return entry
}

export function deleteAnswer(id: string): void {
  persist(load().filter(a => a.id !== id))
}

export function updateAnswer(id: string, patch: Partial<Pick<SavedAnswer, 'tags' | 'note'>>): void {
  persist(load().map(a => a.id === id ? { ...a, ...patch } : a))
}

export function isSaved(query: string, answer: string): boolean {
  return load().some(a => a.query === query && a.answer === answer)
}
