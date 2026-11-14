import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Input } from '@/components/ui'
import type { InputProps } from '@/components/ui'

export function passwordScore(pw: string): number {
  if (!pw) return 0
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++
  if (/\d/.test(pw) && /[^a-zA-Z0-9]/.test(pw)) score++
  return Math.min(4, score)
}

const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong']
const STRENGTH_COLOR = ['', 'bg-danger', 'bg-warning', 'bg-accent', 'bg-success']

export function PasswordStrength({ password, className }: { password: string; className?: string }) {
  const score = passwordScore(password)
  if (!password) return null
  return (
    <div className={cn('flex items-center gap-2', className)} aria-label={`Password strength: ${STRENGTH_LABEL[score]}`}>
      <div className="flex flex-1 gap-1">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={cn('h-1 flex-1 rounded-full transition-colors', i <= score ? STRENGTH_COLOR[score] : 'bg-surface-3')} />
        ))}
      </div>
      <span className="w-12 text-right text-[11px] font-medium text-muted">{STRENGTH_LABEL[score]}</span>
    </div>
  )
}

export function PasswordInput({ label, hint, error, ...rest }: Omit<InputProps, 'type'>) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input
        label={label}
        hint={hint}
        error={error}
        type={show ? 'text' : 'password'}
        className="pr-10"
        {...rest}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-2 top-[26px] rounded-control p-1.5 text-subtle transition-colors hover:text-text"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}
