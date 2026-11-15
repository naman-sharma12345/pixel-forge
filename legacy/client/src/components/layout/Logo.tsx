import { cn } from '@/lib/cn'

/** Inline pixel-art anvil with a spark. */
export function AnvilMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn('h-6 w-6', className)} shapeRendering="crispEdges" aria-hidden="true">
      <rect x="1" y="1" width="2" height="2" fill="#8B5CF6" />
      <rect x="4" y="1" width="8" height="2" fill="#8B5CF6" />
      <rect x="12" y="1" width="2" height="2" fill="#8B5CF6" />
      <rect x="1" y="3" width="14" height="2" fill="#22D3EE" />
      <rect x="2" y="5" width="12" height="2" fill="#22D3EE" />
      <rect x="3" y="7" width="10" height="2" fill="#F472B6" />
      <rect x="4" y="9" width="8" height="2" fill="#F472B6" />
      <rect x="6" y="11" width="4" height="2" fill="#A3E635" />
      <rect x="7" y="13" width="2" height="2" fill="#A3E635" />
      <rect x="13" y="4" width="2" height="2" fill="#FBBF24" />
      <rect x="14" y="6" width="1" height="1" fill="#FBBF24" opacity="0.6" />
    </svg>
  )
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <AnvilMark />
      {!compact && (
        <span className="font-pixel text-[11px] leading-none tracking-tight">
          <span className="text-gradient">PIXEL</span>{' '}
          <span className="text-text">FORGE</span>
        </span>
      )}
    </span>
  )
}
