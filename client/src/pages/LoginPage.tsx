import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { AlertCircle, ArrowRight, Wand2 } from 'lucide-react'
import { Page } from '@/components/layout'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { PasswordInput } from '@/components/auth/PasswordField'
import { Input, PixelButton } from '@/components/ui'
import { useLogin } from '@/hooks/useAuth'
import { isApiClientError, USE_MOCKS } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { safeNext } from '@/lib/nav'

export default function LoginPage() {
  const status = useAuthStore((s) => s.status)
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState('')
  const [touched, setTouched] = useState({ identifier: false, password: false })
  const login = useLogin()
  const navigate = useNavigate()

  // already signed in (or just signed in): go where the user was heading
  if (status === 'authed' && !login.isPending && !login.isSuccess) return <Navigate to={next} replace />

  const idError = touched.identifier && !identifier.trim() ? 'Enter your email or username' : undefined
  const pwError = touched.password && !password ? 'Enter your password' : undefined

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTouched({ identifier: true, password: true })
    if (!identifier.trim() || !password) return
    setFormError('')
    login.mutate(
      { identifier: identifier.trim(), password },
      {
        onSuccess: (data) => {
          toast.success(`Welcome back, ${data.user.name.split(' ')[0]}`)
          navigate(next, { replace: true })
        },
        onError: (err) => {
          if (isApiClientError(err) && err.code === 'INVALID_CREDENTIALS') setFormError('That email/username and password don’t match. Check both and try again.')
          else if (isApiClientError(err) && err.code === 'FORBIDDEN') setFormError(err.message)
          else toast.error(isApiClientError(err) ? err.message : 'We couldn’t sign you in. Try again in a moment.')
        },
      },
    )
  }

  return (
    <Page title="Log in" description="Sign in to your Pixel Forge account.">
      <AuthLayout
        title="Welcome back"
        subtitle="Log in to download your library, manage your wishlist and sell your work."
        footer={
          <>
            New to Pixel Forge?{' '}
            <Link to={`/register${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-medium text-text underline-offset-4 hover:underline">
              Create a free account
            </Link>
          </>
        }
      >
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          {formError && (
            <div role="alert" className="flex items-start gap-2.5 rounded-control border border-danger/40 bg-danger/10 px-3.5 py-3 text-sm text-text">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              {formError}
            </div>
          )}
          <Input
            label="Email or username"
            value={identifier}
            onChange={(e) => { setIdentifier(e.target.value); setFormError('') }}
            onBlur={() => setTouched((t) => ({ ...t, identifier: true }))}
            error={idError}
            autoComplete="username"
            autoFocus
            spellCheck={false}
          />
          <PasswordInput
            label="Password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setFormError('') }}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            error={pwError}
            autoComplete="current-password"
          />
          <PixelButton type="submit" size="lg" className="mt-2 w-full" loading={login.isPending}>
            {login.isPending ? 'Signing in…' : 'Log in'} {!login.isPending && <ArrowRight className="h-4 w-4" />}
          </PixelButton>
          {USE_MOCKS && (
            <button
              type="button"
              onClick={() => {
                setIdentifier('demo')
                setPassword('Password123')
                setFormError('')
                setTouched({ identifier: false, password: false })
              }}
              className="group flex items-center justify-center gap-2 rounded-control border border-dashed border-border-strong px-3 py-2.5 text-xs text-muted transition-colors hover:border-primary/50 hover:text-text"
            >
              <Wand2 className="h-3.5 w-3.5 text-primary" />
              Use demo account <span className="font-mono text-subtle group-hover:text-muted">demo / Password123</span>
            </button>
          )}
        </form>
      </AuthLayout>
    </Page>
  )
}
