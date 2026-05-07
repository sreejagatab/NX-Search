export function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const words = query.trim().split(/\s+/).filter(Boolean)
  const pattern = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
  const parts = text.split(pattern)
  return parts.map((part, i) =>
    i % 2 === 1 ? <mark key={i} className="bg-amber-400/20 text-amber-300 rounded px-0.5">{part}</mark> : part
  )
}
