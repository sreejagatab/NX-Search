import { useEffect, useState } from 'react'

export function ProgressBar({ loading }: { loading: boolean }) {
  const [width, setWidth] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (loading) {
      setVisible(true)
      setWidth(0)
      const t1 = setTimeout(() => setWidth(30), 10)
      const t2 = setTimeout(() => setWidth(60), 400)
      const t3 = setTimeout(() => setWidth(85), 1000)
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
    } else {
      setWidth(100)
      const t = setTimeout(() => { setVisible(false); setWidth(0) }, 300)
      return () => clearTimeout(t)
    }
  }, [loading])

  if (!visible) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-transparent pointer-events-none">
      <div
        className="h-full bg-amber-400 transition-all ease-out"
        style={{ width: `${width}%`, transitionDuration: width === 100 ? '200ms' : '800ms', opacity: width === 100 ? 0 : 1 }}
      />
    </div>
  )
}
