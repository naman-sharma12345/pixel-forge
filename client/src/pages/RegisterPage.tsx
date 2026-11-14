import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { Page, Logo } from '@/components/layout'
import { Button, Input } from '@/components/ui'
import { useRegister } from '@/hooks/useAuth'
import { isApiClientError } from '@/api'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const register = useRegister()
  const navigate = useNavigate()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    register.mutate({ name, username, email, password }, {
      onSuccess: () => { toast.success('Account created — welcome to the forge'); navigate('/', { replace: true }) },
      onError: (err) => toast.error(isApiClientError(err) ? err.message : 'Registration failed'),
    })
  }

  return (
    <Page title="Create account — Pixel Forge" description="Join Pixel Forge to buy and sell game assets.">
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <Logo />
            <h1 className="font-display text-xl font-semibold text-text">Forge your account</h1>
            <p className="text-sm text-muted">Free forever. Upgrade to creator anytime.</p>
          </div>
          <form onSubmit={submit} className="flex flex-col gap-4 rounded-panel border border-border bg-surface p-6">
            <Input label="Display name" value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={50} required />
            <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="lowercase_snake" pattern="[a-z0-9_]{3,20}" required />
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} maxLength={72} autoComplete="new-password" hint="8-72 chars, at least one letter and one number" required />
            <Button type="submit" loading={register.isPending}>Create account</Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted">
            Have an account? <Link to="/login" className="text-primary hover:text-accent">Log in</Link>
          </p>
        </div>
      </div>
    </Page>
  )
}
