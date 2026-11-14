import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'link'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-hover shadow-[0_0_0_1px_rgba(139,92,246,0.4),0_8px_30px_rgba(139,92,246,0.18)] hover:shadow-glow',
  secondary: 'bg-surface-2 text-text border border-border hover:border-border-strong hover:bg-surface-3',
  ghost: 'text-muted hover:text-text hover:bg-surface-2',
  outline: 'border border-border-strong text-text hover:border-primary hover:text-primary',
  danger: 'bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25',
  link: 'text-primary hover:text-accent underline-offset-4 hover:underline p-0 h-auto',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, leftIcon, rightIcon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-control font-medium transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        'disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]',
        variants[variant],
        sizes[size],
        variant === 'link' && 'rounded-none',
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
})

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  size?: 'sm' | 'md' | 'lg'
}

const iconSizes = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-11 w-11' }

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = 'md', className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center rounded-control text-muted transition-colors',
        'hover:text-text hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        'disabled:opacity-50 disabled:pointer-events-none',
        iconSizes[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
})

const STEP = (n: number) =>
  `polygon(0 ${n}px, ${n}px ${n}px, ${n}px 0, calc(100% - ${n}px) 0, calc(100% - ${n}px) ${n}px, 100% ${n}px, 100% calc(100% - ${n}px), calc(100% - ${n}px) calc(100% - ${n}px), calc(100% - ${n}px) 100%, ${n}px 100%, ${n}px calc(100% - ${n}px), 0 calc(100% - ${n}px))`

type PixelTone = 'primary' | 'accent' | 'success'
const PIXEL_TONES: Record<PixelTone, { face: string; shadow: string; text: string }> = {
  primary: { face: 'bg-primary group-hover:bg-[#9a70ff]', shadow: 'bg-[#4c1d95]', text: 'text-white' },
  accent: { face: 'bg-accent group-hover:bg-[#5fe3f5]', shadow: 'bg-[#0e5566]', text: 'text-bg' },
  success: { face: 'bg-success group-hover:bg-[#bef264]', shadow: 'bg-[#3f6212]', text: 'text-bg' },
}

export interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: Size
  tone?: PixelTone
  loading?: boolean
}

/**
 * Signature CTA: stepped pixel corners (clip-path), a 3px hard offset shadow
 * in a darker shade; on press the face moves 3px down-right onto the shadow.
 * The shadow is its own clipped layer because clip-path would cut a box-shadow.
 */
export const PixelButton = forwardRef<HTMLButtonElement, PixelButtonProps>(function PixelButton(
  { size = 'md', tone = 'primary', loading, className, children, disabled, ...rest },
  ref,
) {
  const t = PIXEL_TONES[tone]
  const step = size === 'sm' ? 3 : 4
  const pad = size === 'sm' ? 'h-9 px-4 text-[9px]' : size === 'lg' ? 'h-14 px-7 text-[11px]' : 'h-11 px-5 text-[10px]'
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'group relative inline-flex shrink-0 select-none pb-[3px] pr-[3px] font-pixel uppercase leading-none tracking-wide',
        'focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...rest}
    >
      <span aria-hidden="true" className={cn('absolute bottom-0 right-0 h-[calc(100%-3px)] w-[calc(100%-3px)]', t.shadow)} style={{ clipPath: STEP(step) }} />
      <span
        className={cn(
          'relative inline-flex w-full items-center justify-center gap-2.5 whitespace-nowrap transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]',
          'shadow-[inset_0_2px_0_rgba(255,255,255,0.28),inset_0_-2px_0_rgba(0,0,0,0.18)]',
          'group-active:translate-x-[3px] group-active:translate-y-[3px] group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-offset-4 group-focus-visible:outline-accent',
          t.face,
          t.text,
          pad,
        )}
        style={{ clipPath: STEP(step) }}
      >
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {children}
      </span>
    </button>
  )
})
