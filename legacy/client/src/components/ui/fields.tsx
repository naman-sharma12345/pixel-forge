import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

const fieldBase =
  'w-full rounded-control border border-border bg-surface-2 px-3 text-sm text-text placeholder:text-subtle ' +
  'transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 ' +
  'disabled:opacity-50 disabled:pointer-events-none'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  leftIcon?: ReactNode
  counter?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leftIcon, counter, className, id, maxLength, value, ...rest },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  const length = typeof value === 'string' ? value.length : 0
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-text">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle">{leftIcon}</span>}
        <input
          ref={ref}
          id={inputId}
          value={value}
          maxLength={maxLength}
          aria-invalid={error ? true : rest['aria-invalid']}
          aria-describedby={hint || error ? `${inputId}-desc` : undefined}
          className={cn(fieldBase, 'h-10', leftIcon && 'pl-9', error && 'border-danger focus:border-danger focus:ring-danger/30', className)}
          {...rest}
        />
      </div>
      {(hint || error || (counter && maxLength)) && (
        <div className="flex items-start justify-between gap-2 text-xs">
          <span id={`${inputId}-desc`} role={error ? 'alert' : undefined} className={cn(error ? 'text-danger' : 'text-muted')}>{error ?? hint}</span>
          {counter && maxLength ? (
            <span className="font-mono text-subtle">{length}/{maxLength}</span>
          ) : null}
        </div>
      )}
    </div>
  )
})

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
  counter?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, counter, className, id, maxLength, value, ...rest },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  const length = typeof value === 'string' ? value.length : 0
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-text">{label}</label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        value={value}
        maxLength={maxLength}
        aria-invalid={error ? true : rest['aria-invalid']}
        aria-describedby={hint || error ? `${inputId}-desc` : undefined}
        className={cn(fieldBase, 'min-h-[110px] py-2.5 resize-y', error && 'border-danger focus:border-danger focus:ring-danger/30', className)}
        {...rest}
      />
      {(hint || error || (counter && maxLength)) && (
        <div className="flex items-start justify-between gap-2 text-xs">
          <span id={`${inputId}-desc`} role={error ? 'alert' : undefined} className={cn(error ? 'text-danger' : 'text-muted')}>{error ?? hint}</span>
          {counter && maxLength ? <span className="font-mono text-subtle">{length}/{maxLength}</span> : null}
        </div>
      )}
    </div>
  )
})

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
  error?: string
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, options, className, id, ...rest },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={inputId} className="text-sm font-medium text-text">{label}</label>}
      <div className="relative">
        <select
          ref={ref}
          id={inputId}
          className={cn(fieldBase, 'h-10 appearance-none pr-9', error && 'border-danger', className)}
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value} className="bg-surface-2 text-text">
              {o.label}
            </option>
          ))}
        </select>
        <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {(hint || error) && <span className={cn('text-xs', error ? 'text-danger' : 'text-muted')}>{error ?? hint}</span>}
    </div>
  )
})

interface CheckProps {
  checked: boolean
  onChange: (v: boolean) => void
  label?: ReactNode
  disabled?: boolean
  className?: string
}

export function Checkbox({ checked, onChange, label, disabled, className }: CheckProps) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2.5 select-none', disabled && 'opacity-50 pointer-events-none', className)}>
      <span
        className={cn(
          'flex h-5 w-5 items-center justify-center rounded-[6px] border transition-colors',
          checked ? 'border-primary bg-primary' : 'border-border-strong bg-surface-2',
        )}
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="h-3 w-3 text-white" fill="none">
            <path d="M2 6.5L4.8 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label && <span className="text-sm text-text">{label}</span>}
    </label>
  )
}

export function Switch({ checked, onChange, label, disabled }: CheckProps) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2.5 select-none', disabled && 'opacity-50 pointer-events-none')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-surface-3 border border-border',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
            checked ? 'left-[22px]' : 'left-0.5',
          )}
        />
      </button>
      {label && <span className="text-sm text-text">{label}</span>}
    </label>
  )
}

function clampPct(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

export interface SliderProps {
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (v: number) => void
  label?: string
  className?: string
}

export function Slider({ value, min = 0, max = 100, step = 1, onChange, label, className }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && <span className="text-xs text-muted">{label}</span>}
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-3 accent-primary"
        style={{ background: `linear-gradient(to right, var(--color-primary) ${pct}%, var(--color-surface-3) ${pct}%)` }}
      />
    </div>
  )
}

export interface RangeSliderProps {
  value: [number, number]
  min?: number
  max?: number
  step?: number
  onChange: (v: [number, number]) => void
  label?: string
  className?: string
}

export function RangeSlider({ value, min = 0, max = 100, step = 1, onChange, label, className }: RangeSliderProps) {
  const [lo, hi] = value
  const span = max - min
  const loPct = ((lo - min) / span) * 100
  const hiPct = ((hi - min) / span) * 100
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && <span className="text-xs text-muted">{label}</span>}
      <div className="relative h-5">
        <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-surface-3" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-primary"
          style={{ left: `${loPct}%`, width: `${hiPct - loPct}%` }}
        />
        <input
          type="range"
          aria-label={`${label ?? 'range'} minimum`}
          min={min}
          max={max}
          step={step}
          value={lo}
          onChange={(e) => onChange([clampPct(Number(e.target.value), min, hi - step), hi])}
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-accent"
        />
        <input
          type="range"
          aria-label={`${label ?? 'range'} maximum`}
          min={min}
          max={max}
          step={step}
          value={hi}
          onChange={(e) => onChange([lo, clampPct(Number(e.target.value), lo + step, max)])}
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary"
        />
      </div>
      <div className="flex justify-between font-mono text-xs text-subtle">
        <span>{lo}</span>
        <span>{hi}</span>
      </div>
    </div>
  )
}
