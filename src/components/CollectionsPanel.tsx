import { useState, useEffect, useCallback, useMemo } from 'react'
import { getCollections, deleteAnswer, updateAnswer, saveAnswer } from '../lib/collections'
import type { SavedAnswer } from '../lib/collections'
import type { SearchResult } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  onNavigate?: (query: string) => void
  // Current answer context — for saving from the panel button
  currentQuery?: string
  currentAnswer?: string
  currentResults?: SearchResult[]
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

export function CollectionsPanel({ open, onClose, onNavigate, currentQuery, currentAnswer, currentResults }: Props) {
  const [items, setItems] = useState<SavedAnswer[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [noteValue, setNoteValue] = useState('')
  const [filter, setFilter] = useState('')

  const reload = useCallback(() => setItems(getCollections()), [])

  useEffect(() => { if (open) reload() }, [open, reload])

  const handleSaveCurrent = () => {
    if (!currentQuery || !currentAnswer) return
    saveAnswer(currentQuery, currentAnswer, currentResults ?? [])
    reload()
  }

  const handleDelete = (id: string) => {
    deleteAnswer(id)
    reload()
  }

  const handleSaveNote = (id: string) => {
    updateAnswer(id, { note: noteValue })
    setEditingNote(null)
    reload()
  }

  const savedSet = useMemo(() => new Set(items.map(a => `${a.query}|${a.answer}`)), [items])
  const canSave = currentQuery && currentAnswer && !savedSet.has(`${currentQuery}|${currentAnswer}`)

  const filtered = filter.trim()
    ? items.filter(a =>
        a.query.toLowerCase().includes(filter.toLowerCase()) ||
        a.answer.toLowerCase().includes(filter.toLowerCase()) ||
        a.note.toLowerCase().includes(filter.toLowerCase()) ||
        a.tags.some(t => t.toLowerCase().includes(filter.toLowerCase()))
      )
    : items

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-auto h-full w-full max-w-md bg-bg border-l border-border flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 text-base">🗂</span>
            <h2 className="text-sm font-semibold text-gray-200">Saved Answers</h2>
            <span className="text-[10px] text-gray-600 bg-subtle rounded-full px-2 py-0.5 border border-border">{items.length}</span>
          </div>
          <div className="flex items-center gap-2">
            {canSave && (
              <button
                onClick={handleSaveCurrent}
                className="text-xs px-3 py-1.5 rounded-lg border border-amber-400/30 text-amber-400 hover:bg-amber-400/10 transition-colors font-medium"
              >
                + Save current
              </button>
            )}
            <button onClick={onClose} className="text-gray-600 hover:text-gray-300 transition-colors text-lg leading-none">×</button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-border shrink-0">
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter saved answers…"
            className="w-full bg-subtle border border-border rounded-xl px-3 py-2 text-sm text-gray-300 placeholder-gray-600 outline-none focus:border-amber-400/40 transition-colors"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2 px-4">
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-2xl mb-3">🗂</p>
              <p className="text-sm text-gray-600">
                {filter ? 'No matches' : 'No saved answers yet'}
              </p>
              {!filter && currentQuery && currentAnswer && (
                <p className="text-xs text-gray-700 mt-1">Save an AI answer using the button above</p>
              )}
            </div>
          )}
          {filtered.map(item => (
            <div key={item.id} className="border border-border rounded-xl overflow-hidden bg-card">
              {/* Item header */}
              <button
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-subtle transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 font-medium truncate">{item.query}</p>
                  <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{item.answer.slice(0, 120)}{item.answer.length > 120 ? '…' : ''}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[10px] text-gray-700">{timeAgo(item.savedAt)}</span>
                    {item.tags.map(t => (
                      <span key={t} className="text-[10px] text-violet-400/70 border border-violet-500/20 bg-violet-500/5 rounded-full px-2 py-px">{t}</span>
                    ))}
                  </div>
                </div>
                <span className="text-[10px] text-gray-700 shrink-0 mt-0.5">{expandedId === item.id ? '▲' : '▼'}</span>
              </button>

              {/* Expanded view */}
              {expandedId === item.id && (
                <div className="border-t border-border px-4 py-3 space-y-3">
                  {/* Full answer */}
                  <p className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap">{item.answer}</p>

                  {/* Note */}
                  {editingNote === item.id ? (
                    <div className="space-y-1.5">
                      <textarea
                        value={noteValue}
                        onChange={e => setNoteValue(e.target.value)}
                        rows={3}
                        placeholder="Add a note…"
                        className="w-full bg-subtle border border-border rounded-lg px-3 py-2 text-xs text-gray-300 placeholder-gray-600 outline-none focus:border-amber-400/40 resize-none transition-colors"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveNote(item.id)} className="text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium">Save</button>
                        <button onClick={() => setEditingNote(null)} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    item.note ? (
                      <p className="text-xs text-violet-300/70 italic border-l-2 border-violet-500/30 pl-2 cursor-pointer" onClick={() => { setEditingNote(item.id); setNoteValue(item.note) }}>
                        {item.note}
                      </p>
                    ) : (
                      <button onClick={() => { setEditingNote(item.id); setNoteValue('') }} className="text-[11px] text-gray-700 hover:text-gray-400 transition-colors">+ Add note</button>
                    )
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-1">
                    {onNavigate && (
                      <button
                        onClick={() => { onNavigate(item.query); onClose() }}
                        className="text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium"
                      >
                        Re-search →
                      </button>
                    )}
                    <button
                      onClick={() => { navigator.clipboard.writeText(item.answer) }}
                      className="text-xs text-gray-600 hover:text-gray-300 transition-colors"
                    >
                      Copy answer
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-xs text-red-500/60 hover:text-red-400 transition-colors ml-auto"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
