export function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-lg p-4 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-5 w-20 bg-subtle rounded-full" />
        <div className="h-4 w-16 bg-subtle rounded ml-auto" />
      </div>
      <div className="space-y-2 mb-3">
        <div className="h-3 bg-subtle rounded w-full" />
        <div className="h-3 bg-subtle rounded w-5/6" />
        <div className="h-3 bg-subtle rounded w-4/6" />
      </div>
      <div className="h-2 bg-subtle rounded-full w-full mt-3" />
    </div>
  )
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
