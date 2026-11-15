import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { ArrowRight, AtSign, Check } from 'lucide-react'
import { Page } from '@/components/layout'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { PasswordInput, PasswordStrength } from '@/components/auth/PasswordField'
import { Input, PixelButton } from '@/components/ui'
import { useRegister } from '@/hooks/useAuth'
import { isApiClientError } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { safeNext } from '@/lib/nav'
import { cn } from '@/lib/cn'

type Field = 'name' | 'username' | 'email' | 'password'

// Mirrors the contract's validation rules exactly.
const USERNAME_RE = /^[a-z0-9_]{3,20}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(field: Field, v: string): string | undefined {
  switch (field) {
    case 'name':
      return v.trim().length < 2 || v.trim().length > 50 ? 'Use 2 to 50 characters' : undefined
    case 'username':
      if (v.length < 3) return 'At least 3 characters'
      if (v.length > 20) return 'At most 20 characters'
      return USERNAME_RE.test(v) ? undefined : 'Only lowercase letters, numbers and underscores'
    case 'email':
      return EMAIL_RE.test(v.trim()) ? undefined : 'Enter an email like you@studio.dev'
    case 'password':
      if (v.length < 8) return 'At least 8 characters'
      if (v.length > 72) return 'At most 72 characters'
      return /[a-zA-Z]/.test(v) && /\d/.test(v) ? undefined : 'Include at least one letter and one number'
  }
}

/** Maps ApiClientError.details (or the message) to form fields. */
function serverFieldErrors(err: unknown): Partial<Record<Field, string>> {
  const out: Partial<Record<Field, string>> = {}
  if (!isApiClientError(err)) return out
  for (const d of err.details ?? []) {
    const path = d.path.replace(/^body\.?/, '').replace(/^\./, '') as Field
    if (['name', 'username', 'email', 'password'].includes(path)) out[path] = d.message
  }
  if (!Object.keys(out).length && err.code === 'CONFLICT') {
    const m = err.message.toLowerCase()
    if (m.includes('username')) out.username = err.message
    else if (m.includes('email')) out.email = err.message
  }
  return out
}

export default function RegisterPage() {
  const status = useAuthStore((s) => s.status)
  const setBecomeCreatorOpen = useUiStore((s) => s.setBecomeCreatorOpen)
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const wantsToSell = params.get('intent') === 'sell'
  const [values, setValues] = useState<Record<Field, string>>({ name: '', username: '', email: '', password: '' })
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const register = useRegister()
  const navigate = useNavigate()

  if (status === 'authed' && !register.isPending && !register.isSuccess) return <Navigate to={next} replace />

  const set = (f: Field, v: string) => {
    setValues((s) => ({ ...s, [f]: v }))
    // errors clear as soon as the value becomes valid
    if (errors[f] && !validate(f, v)) setErrors((e) => ({ ...e, [f]: undefined }))
  }
  const blur = (f: Field) => {
    if (values[f]) setErrors((e) => ({ ...e, [f]: validate(f, values[f]) }))
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const all: Partial<Record<Field, string>> = {}
    for (const f of ['name', 'username', 'email', 'password'] as Field[]) {
      const msg = validate(f, values[f])
      if (msg) all[f] = msg
    }
    setErrors(all)
    if (Object.keys(all).length) {
      document.getElementById(`reg-${Object.keys(all)[0]}`)?.focus()
      return
    }
    register.mutate(
      { name: values.name.trim(), username: values.username, email: values.email.trim().toLowerCase(), password: values.password },
      {
        onSuccess: (data) => {
          toast.success(`Welcome to the forge, ${data.user.name.split(' ')[0]}!`)
          if (wantsToSell) {
            navigate('/', { replace: true })
            setBecomeCreatorOpen(true)
          } else navigate(next, { replace: true })
        },
        onError: (err) => {
          const fe = serverFieldErrors(err)
          if (Object.keys(fe).length) setErrors(fe)
          else toast.error(isApiClientError(err) ? err.message : 'We couldn’t create your account. Try again in a moment.')
        },
      },
    )
  }

  const usernameOk = values.username.length > 0 && !validate('username', values.username)

  return (
    <Page title="Create account" description="Join Pixel Forge to buy and sell game assets.">
      <AuthLayout
        title={wantsToSell ? 'Start selling your assets' : 'Create your account'}
        subtitle={wantsToSell ? 'Create a free account first. You can open your creator studio right after.' : 'Free forever. Buy assets, build a wishlist, and upgrade to a creator any time.'}
        footer={
          <>
            Already have an account?{' '}
            <Link to={`/login${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-medium text-text underline-offset-4 hover:underline">
              Log in
            </Link>
          </>
        }
      >
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <Input
            id="reg-name"
            label="Display name"
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
            onBlur={() => blur('name')}
            error={errors.name}
            autoComplete="name"
            maxLength={50}
            autoFocus
          />
          <div>
            <Input
              id="reg-username"
              label="Username"
              value={values.username}
              onChange={(e) => set('username', e.target.value.toLowerCase().replace(/\s/g, ''))}
              onBlur={() => blur('username')}
              error={errors.username}
              hint={errors.username ? undefined : 'Lowercase letters, numbers and underscores, 3 to 20 characters'}
              leftIcon={<AtSign className="h-4 w-4" />}
              autoComplete="username"
              spellCheck={false}
              maxLength={20}
            />
            {values.username && !errors.username && (
              <p className={cn('mt-1.5 flex items-center gap-1.5 text-xs', usernameOk ? 'text-success' : 'text-subtle')}>
                {usernameOk && <Check className="h-3 w-3" />}
                Your store: <span className="font-mono">pixelforge.dev/u/{values.username}</span>
              </p>
            )}
          </div>
          <Input
            id="reg-email"
            label="Email"
            type="email"
            value={values.email}
            onChange={(e) => set('email', e.target.value)}
            onBlur={() => blur('email')}
            error={errors.email}
            autoComplete="email"
            spellCheck={false}
          />
          <div>
            <PasswordInput
              id="reg-password"
              label="Password"
              value={values.password}
              onChange={(e) => set('password', e.target.value)}
              onBlur={() => blur('password')}
              error={errors.password}
              hint={errors.password ? undefined : '8 to 72 characters with at least one letter and one number'}
              autoComplete="new-password"
              maxLength={72}
            />
            <PasswordStrength password={values.password} className="mt-2" />
          </div>
          <PixelButton type="submit" size="lg" className="mt-2 w-full" loading={register.isPending}>
            {register.isPending ? 'Creating account…' : 'Create account'} {!register.isPending && <ArrowRight className="h-4 w-4" />}
          </PixelButton>
          <p className="text-center text-[11px] leading-relaxed text-subtle">
            By creating an account you agree to play nice. This is a lab demo, so no real payments are ever taken.
          </p>
        </form>
      </AuthLayout>
    </Page>
  )
}
