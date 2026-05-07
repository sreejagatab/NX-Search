export type Density = 'compact' | 'comfortable' | 'spacious'

const KEY = 'nx_density'

export function getDensity(): Density {
  return (localStorage.getItem(KEY) as Density) ?? 'comfortable'
}

export function setDensity(d: Density) {
  localStorage.setItem(KEY, d)
}

export const DENSITY_CLASSES: Record<Density, { card: string; snippet: number }> = {
  compact:     { card: 'px-3 py-2',   snippet: 100 },
  comfortable: { card: 'px-4 py-4',   snippet: 200 },
  spacious:    { card: 'px-5 py-5',   snippet: 400 },
}
