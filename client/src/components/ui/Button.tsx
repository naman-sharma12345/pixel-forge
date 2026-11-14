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

/**
 * Signature CTA: stepped pixel corners, hard offset shadow,
 * presses down-right 3px and loses its shadow.
 */
export const PixelButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { size?: Size }>(
  function PixelButton({ size = 'md', className, children, ...rest }, ref) {
    const pad = size === 'sm' ? 'px-4 py-2 text-xs' : size === 'lg' ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm'
    return (
      <button
        ref={ref}
        className={cn(
          'group relative inline-flex items-center justify-center gap-2 font-pixel uppercase tracking-wide text-bg',
          'bg-gradient-to-r from-primary to-accent bg-[length:200%_100%] bg-left',
          'transition-all duration-150 hover:bg-right',
          'shadow-pixel-md hover:shadow-glow',
          'active:translate-x-[3px] active:translate-y-[3px] active:shadow-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
          'disabled:opacity-50 disabled:pointer-events-none',
          pad,
          className,
        )}
        style={{
          clipPath:
            'polygon(0 8px, 8px 8px, 8px 0, calc(100% - 8px) 0, calc(100% - 8px) 8px, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 8px calc(100% - 8px), 0 calc(100% - 8px))',
        }}
        {...rest}
      >
        {children}
      </button>
    )
  },
)
