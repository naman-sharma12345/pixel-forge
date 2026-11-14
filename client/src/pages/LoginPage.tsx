import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { Page, Logo } from '@/components/layout'
import { Button, Input } from '@/components/ui'
import { useLogin } from '@/hooks/useAuth'
import { isApiClientError } from '@/api'

export default function LoginPage() {
  const [params] = useSearchParams()
  const next = params.get('next') ?? '/'
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const login = useLogin()
  const navigate = useNavigate()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    login.mutate({ identifier, password }, {
      onSuccess: () => { toast.success('Welcome back'); navigate(next, { replace: true }) },
      onError: (err) => toast.error(isApiClientError(err) ? err.message : 'Login failed'),
    })
  }

  return (
    <Page title="Log in — Pixel Forge" description="Sign in to your Pixel Forge account.">
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <Logo />
            <h1 className="font-display text-xl font-semibold text-text">Welcome back</h1>
            <p className="text-sm text-muted">Log in to your account</p>
          </div>
          <form onSubmit={submit} className="flex flex-col gap-4 rounded-panel border border-border bg-surface p-6">
            <Input label="Email or username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" required />
            <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            <Button type="submit" loading={login.isPending}>Log in</Button>
            <p className="text-center text-xs text-muted">
              Demo: <button type="button" className="font-mono text-primary hover:underline" onClick={() => { setIdentifier('demo'); setPassword('Password123') }}>demo / Password123</button>
            </p>
          </form>
          <p className="mt-4 text-center text-sm text-muted">
            No account? <Link to="/register" className="text-primary hover:text-accent">Create one</Link>
          </p>
        </div>
      </div>
    </Page>
  )
}
