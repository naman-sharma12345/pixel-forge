import { forwardRef, useEffect, useMemo, useRef, useState, type HTMLAttributes, type ReactNode } from 'react'
import { Star, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { generateAvatar } from '@/lib/pixelArt'
import { mediaUrl } from '@/lib/media'
import { compactNumber } from '@/lib/format'

// ---------- Badge ----------
type BadgeVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'outline'
const badgeVariants: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-3 text-muted',
  primary: 'bg-primary-soft text-primary',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/15 text-danger',
  outline: 'border border-border-strong text-muted',
}

export function Badge({ variant = 'neutral', className, children, ...rest }: HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium', badgeVariants[variant], className)} {...rest}>
      {children}
    </span>
  )
}

// ---------- Chip ----------
export function Chip({ children, onRemove, className }: { children: ReactNode; onRemove?: () => void; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-muted', className)}>
      {children}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label="Remove" className="text-subtle hover:text-text">
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  )
}

// ---------- Card ----------
export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { hover?: boolean }>(
  function Card({ className, hover = true, ...rest }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-card border border-border bg-surface',
          hover && 'transition-all duration-200 hover:border-primary/50 hover:shadow-glow',
          className,
        )}
        {...rest}
      />
    )
  },
)

// ---------- Avatar ----------
export function Avatar({ src, name, username, size = 36, className }: { src?: string; name?: string; username?: string; size?: number; className?: string }) {
  const [err, setErr] = useState(false)
  const fallback = useMemo(() => generateAvatar(username ?? name ?? 'anon'), [username, name])
  const url = !err && src ? mediaUrl(src) : fallback
  return (
    <span
      className={cn('inline-block shrink-0 overflow-hidden rounded-full border border-border bg-surface-3', className)}
      style={{ width: size, height: size }}
    >
      <img src={url} alt={name ?? username ?? 'avatar'} width={size} height={size} className="h-full w-full object-cover" onError={() => setErr(true)} />
    </span>
  )
}

// ---------- RatingStars ----------
export function RatingStars({ value, onChange, size = 16, className }: { value: number; onChange?: (v: number) => void; size?: number; className?: string }) {
  const [hover, setHover] = useState(0)
  const LABELS = ['', 'Poor', 'Meh', 'Good', 'Great', 'Amazing']

  // display only: plain spans with fractional fill, safe inside links and buttons
  if (!onChange) {
    return (
      <span className={cn('inline-flex items-center gap-0.5', className)} role="img" aria-label={`Rated ${value.toFixed(1)} out of 5`}>
        {[1, 2, 3, 4, 5].map((i) => {
          const fill = Math.max(0, Math.min(1, value - (i - 1)))
          return (
            <span key={i} className="relative inline-flex p-0.5" aria-hidden="true">
              <Star size={size} className="text-border-strong" />
              {fill > 0 && (
                <span className="absolute inset-0.5 overflow-hidden" style={{ width: `calc(${fill * 100}% - ${fill * 4}px)` }}>
                  <Star size={size} className="fill-warning text-warning" />
                </span>
              )}
            </span>
          )
        })}
      </span>
    )
  }

  const shown = hover || value
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); onChange(Math.min(5, (value || 0) + 1)) }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); onChange(Math.max(1, (value || 1) - 1)) }
  }
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span role="radiogroup" aria-label="Your rating" className="inline-flex items-center gap-0.5" onKeyDown={onKey} onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={value === i}
            tabIndex={value === i || (!value && i === 1) ? 0 : -1}
            onClick={() => onChange(i)}
            onMouseEnter={() => setHover(i)}
            className="cursor-pointer rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label={`${i} star${i > 1 ? 's' : ''}, ${LABELS[i]}`}
          >
            <Star size={size} className={cn('transition-colors', shown >= i ? 'fill-warning text-warning' : 'text-border-strong')} />
          </button>
        ))}
      </span>
      {shown > 0 && <span className="text-sm font-medium text-muted">{LABELS[shown]}</span>}
    </span>
  )
}

// ---------- PriceTag ----------
export function PriceTag({ price, className, size = 'md' }: { price: number; className?: string; size?: 'sm' | 'md' | 'lg' }) {
  if (price === 0) {
    return (
      <span className={cn('font-pixel text-success', size === 'sm' ? 'text-[9px]' : size === 'lg' ? 'text-sm' : 'text-[11px]', className)}>
        FREE
      </span>
    )
  }
  return (
    <span className={cn('font-mono font-semibold text-text', size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-xl' : 'text-sm', className)}>
      ₹{price.toLocaleString('en-IN')}
    </span>
  )
}

// ---------- Kbd ----------
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd className={cn('inline-flex h-5 min-w-5 items-center justify-center rounded border border-border-strong bg-surface-2 px-1.5 font-mono text-[10px] text-muted shadow-[0_2px_0_rgba(0,0,0,0.4)]', className)}>
      {children}
    </kbd>
  )
}

// ---------- Divider ----------
export function Divider({ className }: { className?: string }) {
  return <hr className={cn('border-0 border-t border-border', className)} />
}

// ---------- StatCard ----------
export function StatCard({ label, value, delta, icon, className }: { label: string; value: number | string; delta?: string; icon?: ReactNode; className?: string }) {
  const [display, setDisplay] = useState(typeof value === 'number' ? 0 : value)
  const raf = useRef<number>(0)
  useEffect(() => {
    if (typeof value !== 'number') { setDisplay(value); return }
    const start = performance.now()
    const dur = 600
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(value * eased))
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [value])
  return (
    <Card className={cn('flex flex-col gap-1 p-4', className)} hover={false}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">{label}</span>
        {icon && <span className="text-subtle">{icon}</span>}
      </div>
      <span className="font-mono text-2xl font-semibold text-text">{typeof display === 'number' ? compactNumber(display) : display}</span>
      {delta && <span className="text-xs text-success">{delta}</span>}
    </Card>
  )
}
