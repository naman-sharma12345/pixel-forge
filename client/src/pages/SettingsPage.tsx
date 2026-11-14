import { Fragment, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { fireConfetti } from '@/lib/confetti'
import { useDropzone } from 'react-dropzone'
import {
  Camera, ChevronDown, Gamepad2, Github, Globe, Lock, Package, Receipt, Sparkles, Store, Twitter, UserRound,
} from 'lucide-react'
import { Page } from '@/components/layout'
import { PasswordInput, PasswordStrength } from '@/components/auth/PasswordField'
import { Avatar, Button, Card, Input, PixelButton, ProgressBar, Skeleton, Textarea, Badge } from '@/components/ui'
import { useAuthStore } from '@/stores/auth'
import {
  useBecomeCreator, useMe, useUpdateMe, useUpdatePassword, useUploadAvatar,
} from '@/hooks/useAuth'
import { useOrders } from '@/hooks/useCommerce'
import { isApiClientError, USE_MOCKS } from '@/api'
import { formatDate, formatPrice, timeAgo } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { OrderView, Socials } from '@/types/api'

// ---------- profile ----------
function ProfileTab() {
  const { data: me } = useMe()
  const user = useAuthStore((s) => s.user)
  const updateMe = useUpdateMe()
  const uploadAvatar = useUploadAvatar()

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [socials, setSocials] = useState<Socials>({ website: '', twitter: '', itchio: '', github: '' })
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [uploadPct, setUploadPct] = useState<number | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const base = me ?? user
  useEffect(() => {
    if (!base) return
    setName(base.name)
    setUsername(base.username)
    setBio(base.bio)
    setSocials({ ...base.socials })
  }, [base?._id]) // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = useMemo(() => {
    if (!base) return false
    return (
      name !== base.name ||
      username !== base.username ||
      bio !== base.bio ||
      socials.website !== base.socials.website ||
      socials.twitter !== base.socials.twitter ||
      socials.itchio !== base.socials.itchio ||
      socials.github !== base.socials.github ||
      !!avatarFile
    )
  }, [base, name, username, bio, socials, avatarFile])

  const onDrop = (files: File[]) => {
    const f = files[0]
    if (!f) return
    if (!f.type.startsWith('image/')) { toast.error('Avatar must be an image'); return }
    if (f.size > 2 * 1024 * 1024) { toast.error('Avatar must be under 2 MB'); return }
    setAvatarFile(f)
    setAvatarPreview(URL.createObjectURL(f))
  }
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif'] },
    maxFiles: 1,
    multiple: false,
  })

  const saveAvatar = () => {
    if (!avatarFile) return
    setUploadPct(0)
    uploadAvatar.mutate(
      { file: avatarFile, onProgress: (p) => setUploadPct(p) },
      {
        onSuccess: () => {
          setUploadPct(null)
          setAvatarFile(null)
          setAvatarPreview(null)
          toast.success('Avatar updated')
        },
        onError: (e) => {
          setUploadPct(null)
          toast.error(isApiClientError(e) ? e.message : 'Upload failed')
        },
      },
    )
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (name.trim().length < 2 || name.trim().length > 50) errs.name = 'Name must be 2-50 characters'
    if (!/^[a-z0-9_]{3,20}$/.test(username)) errs.username = '3-20 chars: lowercase letters, numbers, underscore'
    if (Object.keys(errs).length) { setFieldErrors(errs); return }
    setFieldErrors({})
    updateMe.mutate(
      { name: name.trim(), username: username.toLowerCase(), bio: bio.trim(), socials },
      {
        onSuccess: () => toast.success('Profile saved'),
        onError: (err) => {
          if (isApiClientError(err)) {
            const fe: Record<string, string> = {}
            for (const d of err.details ?? []) fe[d.path.replace(/^body\.?/, '')] = d.message
            if (!Object.keys(fe).length && err.message.toLowerCase().includes('username')) fe.username = err.message
            if (Object.keys(fe).length) { setFieldErrors(fe); return }
          }
          toast.error(isApiClientError(err) ? err.message : 'Could not save profile')
        },
      },
    )
  }

  if (!base) return <div className="flex flex-col gap-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-64 w-full" /></div>

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {/* avatar */}
      <Card className="flex flex-col items-center gap-5 p-6 sm:flex-row" hover={false}>
        <div
          {...getRootProps()}
          className={cn(
            'group relative h-24 w-24 shrink-0 cursor-pointer overflow-hidden rounded-[22px] border-2 border-dashed transition-colors',
            isDragActive ? 'border-primary bg-primary-soft' : 'border-border hover:border-primary/60',
          )}
        >
          <input {...getInputProps()} />
          <img src={avatarPreview ?? base.avatarUrl} alt="" className="pixelated h-full w-full object-cover" />
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Camera className="h-5 w-5 text-white" />
          </span>
        </div>
        <div className="flex-1 text-center sm:text-left">
          <p className="font-display text-base font-semibold text-text">Profile picture</p>
          <p className="mt-0.5 text-xs text-muted">{isDragActive ? 'Drop it here' : 'Click the avatar or drop an image. PNG, JPG, WebP or GIF up to 2 MB.'}</p>
          {avatarFile && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="max-w-[180px] truncate font-mono text-xs text-subtle">{avatarFile.name}</span>
              {uploadPct !== null ? (
                <div className="w-40"><ProgressBar value={uploadPct} label="Upload progress" /></div>
              ) : (
                <Button type="button" size="sm" onClick={saveAvatar} loading={uploadAvatar.isPending}>Upload avatar</Button>
              )}
              <button type="button" className="text-xs text-subtle hover:text-danger" onClick={() => { setAvatarFile(null); setAvatarPreview(null) }}>Remove</button>
            </div>
          )}
        </div>
      </Card>

      <Card className="grid gap-4 p-6 sm:grid-cols-2" hover={false}>
        <div className="sm:col-span-2">
          <h2 className="font-display text-base font-semibold text-text">Public profile</h2>
          <p className="mt-0.5 text-xs text-muted">Shown on your store page and next to your assets and reviews.</p>
        </div>
        <Input label="Display name" value={name} onChange={(e) => setName(e.target.value)} error={fieldErrors.name} maxLength={50} />
        <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} error={fieldErrors.username} hint={`@${username || 'username'}`} />
        <div className="sm:col-span-2">
          <Textarea label="Bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} counter hint="Tell devs what you make." />
        </div>
        <Input label="Website" value={socials.website} onChange={(e) => setSocials({ ...socials, website: e.target.value })} placeholder="https://…" leftIcon={<Globe className="h-4 w-4" />} />
        <Input label="Twitter / X" value={socials.twitter} onChange={(e) => setSocials({ ...socials, twitter: e.target.value })} placeholder="@handle" leftIcon={<Twitter className="h-4 w-4" />} />
        <Input label="itch.io" value={socials.itchio} onChange={(e) => setSocials({ ...socials, itchio: e.target.value })} placeholder="your-page.itch.io" leftIcon={<Gamepad2 className="h-4 w-4" />} />
        <Input label="GitHub" value={socials.github} onChange={(e) => setSocials({ ...socials, github: e.target.value })} placeholder="username" leftIcon={<Github className="h-4 w-4" />} />
      </Card>

      <div
        className={cn(
          'sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-card border px-4 py-3 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.7)] backdrop-blur-xl transition-all duration-200',
          dirty ? 'border-primary/40 bg-surface-2/95' : 'border-border bg-surface/80',
        )}
      >
        <p className="text-sm text-muted">{dirty ? <><span className="mr-2 inline-block h-2 w-2 rounded-full bg-warning align-middle" />You have unsaved changes</> : 'All changes saved'}</p>
        <div className="flex gap-2">
          {dirty && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setName(base.name); setUsername(base.username); setBio(base.bio); setSocials({ ...base.socials })
                setAvatarFile(null); setAvatarPreview(null); setFieldErrors({})
              }}
            >
              Discard
            </Button>
          )}
          <Button type="submit" size="sm" loading={updateMe.isPending} disabled={!dirty}>Save changes</Button>
        </div>
      </div>
    </form>
  )
}

// ---------- security ----------
function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const updatePassword = useUpdatePassword()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirm) { setError('Passwords do not match'); return }
    if (newPassword.length < 8 || newPassword.length > 72 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('New password must be 8-72 chars with at least one letter and one number')
      return
    }
    updatePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          toast.success('Password updated — other devices were signed out')
          setCurrentPassword(''); setNewPassword(''); setConfirm('')
        },
        onError: (err) => setError(isApiClientError(err) ? err.message : 'Could not update password'),
      },
    )
  }

  return (
    <Card className="max-w-xl p-6" hover={false}>
      <h2 className="mb-1 flex items-center gap-2 font-display text-base font-semibold text-text">
        <Lock className="h-4 w-4 text-primary" /> Change password
      </h2>
      <p className="mb-5 text-xs text-muted">For your security, changing your password signs out all other devices.</p>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {error && <div role="alert" className="rounded-control border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}
        <PasswordInput label="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" required />
        <div>
          <PasswordInput label="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" required />
          <PasswordStrength password={newPassword} className="mt-2" />
        </div>
        <PasswordInput label="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
        <div className="flex justify-end">
          <Button type="submit" loading={updatePassword.isPending} disabled={!currentPassword || !newPassword}>Update password</Button>
        </div>
      </form>
    </Card>
  )
}

// ---------- orders ----------
const STATUS_VARIANT: Record<OrderView['status'], 'success' | 'danger' | 'neutral'> = {
  paid: 'success', created: 'neutral', failed: 'danger',
}

function OrdersTab() {
  const { data, isLoading, isError, refetch } = useOrders({ limit: 24 })
  const [openId, setOpenId] = useState<string | null>(null)

  if (isLoading) return <div className="flex flex-col gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
  if (isError) return <Card className="p-6 text-center text-sm text-muted">Could not load orders. <button className="text-primary hover:underline" onClick={() => refetch()}>Retry</button></Card>
  const orders = data?.items ?? []
  if (!orders.length) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <Package className="h-8 w-8 text-subtle" />
        <p className="text-sm text-muted">No orders yet — your purchases will show up here.</p>
        <Link to="/explore"><Button size="sm" variant="secondary">Explore assets</Button></Link>
      </Card>
    )
  }
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-subtle">
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Items</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Provider</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const open = openId === o._id
              return (
                <Fragment key={o._id}>
                  <tr
                    onClick={() => setOpenId(open ? null : o._id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenId(open ? null : o._id) } }}
                    tabIndex={0}
                    aria-expanded={open}
                    className="cursor-pointer border-b border-border/60 outline-none transition-colors hover:bg-surface-2 focus-visible:bg-surface-2"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-text">#{o._id.slice(-8).toUpperCase()}</td>
                    <td className="px-4 py-3 text-muted">{formatDate(o.createdAt)}</td>
                    <td className="px-4 py-3 text-muted">{o.items.length}</td>
                    <td className="px-4 py-3 font-mono text-xs text-text">{formatPrice(o.total)}</td>
                    <td className="px-4 py-3"><Badge variant={STATUS_VARIANT[o.status]}>{o.status}</Badge></td>
                    <td className="px-4 py-3 font-mono text-xs text-subtle">{o.provider}</td>
                    <td className="px-2 py-3"><ChevronDown className={cn('h-4 w-4 text-subtle transition-transform', open && 'rotate-180')} /></td>
                  </tr>
                  {open && (
                    <tr className="border-b border-border/60 bg-surface-2/50">
                      <td colSpan={7} className="px-4 py-3">
                        <ul className="space-y-1.5">
                          {o.items.map((i) => (
                            <li key={i.assetId} className="flex items-center justify-between gap-3 text-sm">
                              <Link to={`/asset/${i.slug}`} className="truncate text-text hover:text-primary">{i.title}</Link>
                              <span className="font-mono text-xs text-muted">{formatPrice(i.price)}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ---------- become creator ----------
function BecomeCreatorCard() {
  const navigate = useNavigate()
  const becomeCreator = useBecomeCreator()
  const benefits = [
    'Upload sprites, sfx, music, fonts and more',
    'Set your own prices — including free',
    'Keep 90% of every sale',
    'Sales analytics and payout tracking',
  ]
  return (
    <Card className="noise relative overflow-hidden border-primary/30 bg-gradient-to-br from-primary/15 via-surface to-surface p-6" hover={false}>
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-text">
        <Store className="h-5 w-5 text-primary" /> Become a creator
      </h2>
      <p className="mt-1 text-sm text-muted">Turn your game dev skills into income on the marketplace.</p>
      <ul className="mt-4 space-y-2">
        {benefits.map((b) => (
          <li key={b} className="flex gap-2 text-sm text-muted"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{b}</li>
        ))}
      </ul>
      <PixelButton
        size="lg"
        className="mt-5"
        loading={becomeCreator.isPending}
        onClick={() =>
          becomeCreator.mutate(undefined, {
            onSuccess: () => {
              fireConfetti()
              toast.success("You're a creator now — welcome to the studio")
              navigate('/studio')
            },
            onError: (e) => toast.error(isApiClientError(e) ? e.message : 'Could not upgrade'),
          })
        }
      >
        Start selling
      </PixelButton>
      {!USE_MOCKS && <p className="mt-2 text-[11px] text-subtle">Upgrade is instant and reversible via support in this demo.</p>}
    </Card>
  )
}

// ---------- page ----------
const TABS = [
  { key: 'profile', label: 'Profile', icon: UserRound, text: 'Name, avatar, bio and links' },
  { key: 'security', label: 'Security', icon: Lock, text: 'Password and sessions' },
  { key: 'orders', label: 'Orders', icon: Receipt, text: 'Purchase history' },
] as const

type TabKey = (typeof TABS)[number]['key']

export default function SettingsPage() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const tab: TabKey = TABS.some((t) => t.key === raw) ? (raw as TabKey) : 'profile'
  const user = useAuthStore((s) => s.user)
  const go = (k: string) => setParams(k === 'profile' ? {} : { tab: k }, { replace: true })
  const active = TABS.find((t) => t.key === tab)!

  return (
    <Page title="Settings" description="Profile, security and order history.">
      <div className="mx-auto max-w-[1120px] px-4 pb-10 pt-8 sm:px-6 lg:px-8">
        <h1 className="mb-8 font-display text-3xl font-bold tracking-tight text-text">Settings</h1>
        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="lg:sticky lg:top-20 lg:h-fit">
            {user && (
              <div className="mb-4 hidden items-center gap-3 rounded-card border border-border bg-surface p-3 lg:flex">
                <Avatar src={user.avatarUrl} name={user.name} username={user.username} size={40} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text">{user.name}</p>
                  <Link to={`/u/${user.username}`} className="truncate text-xs text-subtle hover:text-primary">View public profile</Link>
                </div>
              </div>
            )}
            <nav aria-label="Settings sections" className="flex gap-1 overflow-x-auto rounded-card border border-border bg-surface p-1 [scrollbar-width:none] lg:flex-col">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => go(t.key)}
                  aria-current={tab === t.key ? 'page' : undefined}
                  className={cn(
                    'flex shrink-0 items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-sm transition-colors',
                    tab === t.key ? 'bg-surface-3 text-text' : 'text-muted hover:bg-surface-2 hover:text-text',
                  )}
                >
                  <t.icon className={cn('h-4 w-4', tab === t.key ? 'text-primary' : 'text-subtle')} />
                  <span>
                    <span className="block font-medium">{t.label}</span>
                    <span className="hidden text-xs text-subtle lg:block">{t.text}</span>
                  </span>
                </button>
              ))}
            </nav>
          </aside>

          <section aria-label={active.label} className="min-w-0">
            {tab === 'profile' && (
              <div className="flex flex-col gap-6">
                {user?.role === 'buyer' && <BecomeCreatorCard />}
                <ProfileTab />
              </div>
            )}
            {tab === 'security' && <SecurityTab />}
            {tab === 'orders' && <OrdersTab />}
            <p className="mt-8 text-xs text-subtle">Signed in as {user?.email} · last login {timeAgo(user?.lastLoginAt)}</p>
          </section>
        </div>
      </div>
    </Page>
  )
}
