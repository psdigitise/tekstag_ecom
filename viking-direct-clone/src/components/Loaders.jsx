import { Loader2 } from 'lucide-react'

/** All loading visuals share these pieces so the site looks consistent. */

export function Spinner({ size = 16, className = '' }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} aria-hidden="true" />
}

/** A shimmering grey block shaped like the content that is on its way. */
export function Skeleton({ className = '' }) {
  return <div className={`skeleton rounded ${className}`} aria-hidden="true" />
}

export function SkeletonRows({ rows = 4, className = '' }) {
  return (
    <div role="status" aria-label="Loading" className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-14 w-full" />)}
    </div>
  )
}

export function SkeletonCircles({ count = 4, size = 'w-[100px] h-[100px]' }) {
  return (
    <div role="status" aria-label="Loading" className="flex flex-wrap justify-center gap-x-10 gap-y-6">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          <Skeleton className={`${size} !rounded-full`} />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  )
}

/** Opening screen, matching the placeholder in index.html. */
export function BrandLoader() {
  return (
    <div role="status" aria-label="Loading Tekstag" className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
      <span style={{ fontFamily: '"Arial Black", Arial, sans-serif', fontWeight: 900, fontSize: 34 }}>tekstag</span>
      <span className="brand-bar" />
    </div>
  )
}
