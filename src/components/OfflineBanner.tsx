import { useEffect, useState } from 'react'

export function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  if (!offline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-400/10 border-b border-amber-400/30 px-4 py-2 flex items-center justify-center gap-2 text-sm text-amber-400">
      <span>⚠</span>
      <span>No internet connection — showing cached results</span>
    </div>
  )
}
