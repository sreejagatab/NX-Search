import { useEffect, useState } from 'react'

export function ProgressBar({ loading }: { loading: boolean }) {
  const [width, setWidth] = useState(0)
  const [visible, setVisible] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (loading) {
      setVisible(true)
      setWidth(0)
      setElapsed(0)
      const t1 = setTimeout(() => setWidth(20), 10)
      const t2 = setTimeout(() => setWidth(45), 2000)
      const t3 = setTimeout(() => setWidth(65), 8000)
      const t4 = setTimeout(() => setWidth(80), 15000)
      const t5 = setTimeout(() => setWidth(88), 22000)
      // elapsed counter
      const interval = setInterval(() => setElapsed(s => s + 1), 1000)
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); clearInterval(interval) }
    } else {
      setWidth(100)
      const t = setTimeout(() => { setVisible(false); setWidth(0); setElapsed(0) }, 300)
      return () => clearTimeout(t)
    }
  }, [loading])

  if (!visible) return null

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-transparent pointer-events-none">
        <div
          className="h-full bg-amber-400 transition-all ease-out"
          style={{ width: `${width}%`, transitionDuration: width === 100 ? '200ms' : '3000ms', opacity: width === 100 ? 0 : 1 }}
        />
      </div>
      {loading && elapsed >= 4 && (
        <div className="fixed top-[3px] left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-full px-3 py-1 text-xs text-gray-500 pointer-events-none">
          Searching… {elapsed}s
          {elapsed >= 10 && <span className="text-gray-700"> · typically 15–25s</span>}
        </div>
      )}
    </>
  )
}
