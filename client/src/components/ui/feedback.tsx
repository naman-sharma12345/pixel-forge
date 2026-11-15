import { useMemo, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { generateIllustration, type IllustrationKind } from '@/lib/pixelArt'

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

const KIND_TO_ART: Record<string, IllustrationKind> = {
  vfx: 'skull',
  sprites: 'slime',
  sfx: 'ghost',
  music: 'star',
}

export function EmptyState({
  title,
  text,
  action,
  art,
  seed = 'empty',
  kind,
  className,
  compact = false,
}: {
  title: string
  text?: string
  action?: ReactNode
  /** Pixel illustration to show. */
  art?: IllustrationKind
  seed?: string
  /** Legacy: category key, mapped to an illustration. */
  kind?: string
  className?: string
  compact?: boolean
}) {
  const img = useMemo(() => generateIllustration(art ?? KIND_TO_ART[kind ?? ''] ?? 'ghost', seed), [art, kind, seed])
  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center overflow-hidden rounded-panel border border-dashed border-border-strong bg-surface/40 text-center',
        compact ? 'gap-3 px-6 py-10' : 'gap-5 px-6 py-16 sm:py-20',
        className,
      )}
    >
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-30 [mask-image:radial-gradient(circle_at_center,black,transparent_65%)]" />
      <img src={img} alt="" className={cn('pixelated relative animate-float', compact ? 'h-20 w-20' : 'h-28 w-28')} />
      <div className="relative flex max-w-sm flex-col gap-1.5">
        <h3 className="font-display text-lg font-semibold text-text sm:text-xl">{title}</h3>
        {text && <p className="text-sm leading-relaxed text-muted">{text}</p>}
      </div>
      {action && <div className="relative flex flex-wrap items-center justify-center gap-3">{action}</div>}
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
