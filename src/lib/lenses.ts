import type { SearchMode, SortField } from '../types'

export interface Lens {
  id: string
  name: string
  domains: string[]
  mode: SearchMode
  sort: SortField
  minConfidence: number
  createdAt: number
}

const STORAGE_KEY = 'nx-lenses'
const MAX_LENSES = 12

export function getLenses(): Lens[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Lens[]
  } catch {
    return []
  }
}

export function saveLens(lens: Omit<Lens, 'id' | 'createdAt'>): Lens {
  const lenses = getLenses()
  const newLens: Lens = { ...lens, id: crypto.randomUUID(), createdAt: Date.now() }
  const updated = [...lenses, newLens].slice(-MAX_LENSES)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  return newLens
}

export function deleteLens(id: string): void {
  const updated = getLenses().filter(l => l.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}

export function renameLens(id: string, name: string): void {
  const updated = getLenses().map(l => l.id === id ? { ...l, name } : l)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}

// Built-in preset lenses
export const PRESET_LENSES: Omit<Lens, 'id' | 'createdAt'>[] = [
  { name: 'Python Docs', domains: ['python'], mode: 'semantic', sort: 'similarity', minConfidence: 0 },
  { name: 'Web + Hybrid', domains: ['web'], mode: 'hybrid', sort: 'similarity', minConfidence: 0 },
  { name: 'High Confidence', domains: [], mode: 'semantic', sort: 'confidence', minConfidence: 70 },
  { name: 'Code Search', domains: ['code', 'python', 'javascript', 'typescript'], mode: 'pattern', sort: 'similarity', minConfidence: 0 },
]
