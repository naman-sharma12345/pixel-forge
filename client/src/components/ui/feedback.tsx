import { useMemo, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { generateSpriteThumb } from '@/lib/pixelArt'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-shimmer rounded-control bg-[length:400px_100%] bg-gradient-to-r from-surface-2 via-surface-3 to-surface-2',
        className,
      )}
    />
  )
}

export function Spinner({ className, label = 'Loading' }: { className?: string; label?: string }) {
  return (
    <span role="status" aria-label={label} className={cn('inline-flex items-center gap-2 text-muted', className)}>
      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
        <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="text-sm">{label}</span>
    </span>
  )
}

export function ProgressBar({ value, max = 100, className, label }: { value: number; max?: number; className?: string; label?: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-3', className)} role="progressbar" aria-valuenow={value} aria-valuemax={max} aria-label={label}>
      <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-300" style={{ width: `${pct}%` }} />
    </div>
  )
}

export function EmptyState({
  title,
  text,
  action,
  seed = 'empty',
  kind = 'sprites',
  className,
}: {
  title: string
  text?: string
  action?: ReactNode
  seed?: string
  kind?: string
  className?: string
}) {
  const art = useMemo(() => generateSpriteThumb(seed, kind), [seed, kind])
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 rounded-panel border border-dashed border-border-strong bg-surface/50 px-6 py-16 text-center', className)}>
      <img src={art} alt="" className="pixelated h-24 w-24 opacity-80" />
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-lg font-semibold text-text">{title}</h3>
        {text && <p className="max-w-sm text-sm text-muted">{text}</p>}
      </div>
      {action}
    </div>
  )
}

export function Pagination({
  page,
  totalPages,
  onChange,
  className,
}: {
  page: number
  totalPages: number
  onChange: (p: number) => void
  className?: string
}) {
  if (totalPages <= 1) return null
  const pages: (number | '…')[] = []
  const push = (p: number | '…') => pages.push(p)
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) push(i)
  } else {
    push(1)
    if (page > 3) push('…')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) push(i)
    if (page < totalPages - 2) push('…')
    push(totalPages)
  }
  return (
    <nav className={cn('flex items-center justify-center gap-1.5', className)} aria-label="Pagination">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="rounded-control border border-border bg-surface-2 px-3 py-1.5 text-sm text-muted transition-colors hover:text-text disabled:opacity-40"
      >
        Prev
      </button>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`e${i}`} className="px-1 text-muted">…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cn(
              'h-9 w-9 rounded-control text-sm font-mono transition-colors',
              p === page ? 'bg-primary text-white' : 'border border-border bg-surface-2 text-muted hover:text-text',
            )}
          >
            {p}
          </button>
        ),
      )}
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="rounded-control border border-border bg-surface-2 px-3 py-1.5 text-sm text-muted transition-colors hover:text-text disabled:opacity-40"
      >
        Next
      </button>
    </nav>
  )
}
