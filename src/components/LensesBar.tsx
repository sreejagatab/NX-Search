import { useState, useEffect } from 'react'
import { getLenses, saveLens, deleteLens, renameLens, PRESET_LENSES, type Lens } from '../lib/lenses'
import type { SearchMode, SortField } from '../types'

interface Props {
  // current filter state
  domains: string[]
  mode: SearchMode
  sort: SortField
  minConfidence: number
  // apply a lens
  onApply: (lens: Pick<Lens, 'domains' | 'mode' | 'sort' | 'minConfidence'>) => void
}

export function LensesBar({ domains, mode, sort, minConfidence, onApply }: Props) {
  const [lenses, setLenses] = useState<Lens[]>(getLenses)
  const [saving, setSaving] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  // Refresh from localStorage when visible
  useEffect(() => { setLenses(getLenses()) }, [])

  const hasActiveFilters = domains.length > 0 || mode !== 'semantic' || sort !== 'similarity' || minConfidence > 0

  function handleSave() {
    if (!newName.trim()) return
    const lens = saveLens({ name: newName.trim(), domains, mode, sort, minConfidence })
    setLenses(getLenses())
    setNewName('')
    setSaving(false)
    onApply(lens)
  }

  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    deleteLens(id)
    setLenses(getLenses())
  }

  function handleRename(id: string) {
    if (!editName.trim()) { setEditingId(null); return }
    renameLens(id, editName.trim())
    setLenses(getLenses())
    setEditingId(null)
  }

  function startEdit(lens: Lens, e: React.MouseEvent) {
    e.stopPropagation()
    setEditingId(lens.id)
    setEditName(lens.name)
  }

  const allLenses = lenses

  if (allLenses.length === 0 && !hasActiveFilters && !saving) return null

  return (
    <div className="flex items-center gap-1.5 px-4 pb-2 max-w-7xl mx-auto overflow-x-auto scrollbar-none">
      <span className="text-[10px] text-gray-700 shrink-0 uppercase tracking-wider">Lenses:</span>

      {/* Preset lenses */}
      {lenses.length === 0 && (
        <>
          {PRESET_LENSES.slice(0, 2).map(p => (
            <button
              key={p.name}
              onClick={() => onApply(p)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-card border border-border text-xs text-gray-500 hover:text-amber-400 hover:border-amber-400/30 transition-colors shrink-0"
            >
              {p.name}
            </button>
          ))}
        </>
      )}

      {/* Saved lenses */}
      {allLenses.map(lens => (
        <div key={lens.id} className="inline-flex items-center shrink-0">
          {editingId === lens.id ? (
            <input
              autoFocus
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onBlur={() => handleRename(lens.id)}
              onKeyDown={e => { if (e.key === 'Enter') handleRename(lens.id); if (e.key === 'Escape') setEditingId(null) }}
              className="text-xs bg-card border border-amber-400/40 rounded-full px-2 py-0.5 outline-none text-amber-400 w-28"
            />
          ) : (
            <span className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-card border border-violet-500/30 text-xs text-violet-400/80 hover:border-violet-400/50 cursor-pointer group"
              onClick={() => onApply(lens)}
              title={`Domains: ${lens.domains.join(', ') || 'all'} · Mode: ${lens.mode} · Sort: ${lens.sort}${lens.minConfidence > 0 ? ` · Min ${lens.minConfidence}%` : ''}`}
            >
              <span className="text-[9px] text-violet-600 mr-0.5">⬡</span>
              {lens.name}
              <button
                onClick={e => startEdit(lens, e)}
                className="text-violet-600 hover:text-violet-300 transition-colors w-3.5 h-3.5 flex items-center justify-center opacity-0 group-hover:opacity-100"
                title="Rename"
              >✎</button>
              <button
                onClick={e => handleDelete(lens.id, e)}
                className="text-violet-600/60 hover:text-red-400 transition-colors w-4 h-4 flex items-center justify-center rounded-full hover:bg-red-400/10"
                aria-label={`Delete lens ${lens.name}`}
              >×</button>
            </span>
          )}
        </div>
      ))}

      {/* Save current filters as lens */}
      {hasActiveFilters && !saving && (
        <button
          onClick={() => { setSaving(true); setNewName('') }}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-dashed border-gray-700 text-[10px] text-gray-600 hover:text-amber-400 hover:border-amber-400/40 transition-colors shrink-0"
          title="Save current filters as a lens"
        >
          + Save lens
        </button>
      )}

      {saving && (
        <span className="inline-flex items-center gap-1 shrink-0">
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setSaving(false) }}
            placeholder="Lens name…"
            className="text-xs bg-card border border-amber-400/40 rounded-full px-2 py-0.5 outline-none text-amber-400 w-28 placeholder:text-gray-700"
          />
          <button onClick={handleSave} className="text-[10px] text-amber-400 hover:text-amber-300 px-1.5 py-0.5 rounded border border-amber-400/30 transition-colors">Save</button>
          <button onClick={() => setSaving(false)} className="text-[10px] text-gray-600 hover:text-gray-300 transition-colors">✕</button>
        </span>
      )}
    </div>
  )
}
