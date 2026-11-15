import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { Page } from '@/components/layout'
import { DashHeader } from '@/components/dashboard/DashboardLayout'
import { ConfirmDialog, SearchBox, TableFrame, TH } from '@/components/dashboard/table'
import { Avatar, Button, EmptyState, Pagination, Select, Switch } from '@/components/ui'
import { isApiClientError } from '@/api'
import { useAdminUpdateUser, useAdminUsers } from '@/hooks/useStudio'
import { useAuthStore } from '@/stores/auth'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { AdminUser, AdminUserParams, Role } from '@/types/api'

const ROLE_OPTIONS = [
  { value: 'buyer', label: 'Buyer' },
  { value: 'creator', label: 'Creator' },
  { value: 'admin', label: 'Admin' },
]

type Pending = { user: AdminUser; kind: 'role'; role: Role } | { user: AdminUser; kind: 'ban'; banned: boolean }

export default function AdminUsersPage() {
  const [params, setParams] = useSearchParams()
  const me = useAuthStore((s) => s.user)
  const q = params.get('q') ?? ''
  const role = (params.get('role') ?? '') as Role | ''
  const banned = (params.get('banned') ?? '') as '' | 'true' | 'false'
  const page = Math.max(1, Number(params.get('page')) || 1)
  const query: AdminUserParams = { q: q || undefined, role: role || undefined, banned: banned || undefined, page, limit: 20 }
  const { data, isLoading, isError, refetch } = useAdminUsers(query)
  const update = useAdminUpdateUser()
  const [pending, setPending] = useState<Pending | null>(null)

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k))
    if (!('page' in patch)) next.delete('page')
    setParams(next, { replace: true })
  }

  const confirm = () => {
    if (!pending) return
    const body = pending.kind === 'role' ? { role: pending.role } : { isBanned: pending.banned }
    update.mutate(
      { id: pending.user._id, body },
      {
        onSuccess: () => {
          toast.success(
            pending.kind === 'role'
              ? `@${pending.user.username} is now ${pending.role === 'admin' ? 'an admin' : `a ${pending.role}`}`
              : pending.banned ? `@${pending.user.username} is banned and signed out` : `@${pending.user.username} can sign in again`,
          )
          setPending(null)
        },
        onError: (e) => toast.error(isApiClientError(e) ? e.message : 'Could not update this user'),
      },
    )
  }

  const rows = data?.items ?? []
  const meta = data?.meta
  const filtered = !!(q || role || banned)

  return (
    <Page title="Users" description="Manage roles and bans.">
      <DashHeader eyebrow="Admin" title="Users" subtitle={meta ? `${meta.total} matching account${meta.total === 1 ? '' : 's'}` : 'Everyone on Pixel Forge'} />

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchBox value={q} onChange={(v) => set({ q: v || null })} placeholder="Search name, username or email" className="sm:w-80" />
        <div className="flex gap-2">
          <Select
            aria-label="Filter by role"
            value={role}
            onChange={(e) => set({ role: e.target.value || null })}
            options={[{ value: '', label: 'All roles' }, ...ROLE_OPTIONS]}
            className="h-10 w-[140px]"
          />
          <Select
            aria-label="Filter by ban status"
            value={banned}
            onChange={(e) => set({ banned: e.target.value || null })}
            options={[{ value: '', label: 'Any status' }, { value: 'false', label: 'Active' }, { value: 'true', label: 'Banned' }]}
            className="h-10 w-[140px]"
          />
        </div>
        {filtered && <Button variant="ghost" size="sm" onClick={() => setParams({}, { replace: true })}>Reset</Button>}
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-card border border-border bg-surface" />)}</div>
      ) : isError ? (
        <EmptyState compact art="skull" title="Users didn’t load" action={<Button onClick={() => refetch()}>Try again</Button>} />
      ) : !rows.length ? (
        <EmptyState compact art="search" title="No users match" text="Try a different search or filter." />
      ) : (
        <>
          <TableFrame
            minWidth={860}
            head={
              <>
                <th scope="col" className={TH}>User</th>
                <th scope="col" className={TH}>Email</th>
                <th scope="col" className={TH}>Role</th>
                <th scope="col" className={TH}>Banned</th>
                <th scope="col" className={TH}>Joined</th>
              </>
            }
          >
            {rows.map((u) => {
              const isMe = u._id === me?._id
              return (
                <tr key={u._id} className={cn('transition-colors hover:bg-surface-2/60', u.isBanned && 'bg-danger/[0.04]')}>
                  <td className="px-3 py-2.5">
                    <Link to={`/u/${u.username}`} className="flex items-center gap-3">
                      <Avatar src={u.avatarUrl} name={u.name} username={u.username} size={34} className={cn(u.isBanned && 'opacity-50 grayscale')} />
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 font-medium text-text">
                          <span className="truncate">{u.name}</span>
                          {isMe && <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold text-primary">You</span>}
                        </span>
                        <span className="block font-mono text-xs text-subtle">@{u.username}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="max-w-[220px] truncate px-3 py-2.5 text-muted">{u.email}</td>
                  <td className="px-3 py-2.5">
                    <Select
                      aria-label={`Role for @${u.username}`}
                      value={u.role}
                      disabled={isMe}
                      onChange={(e) => {
                        const next = e.target.value as Role
                        if (next !== u.role) setPending({ user: u, kind: 'role', role: next })
                      }}
                      options={ROLE_OPTIONS}
                      className="h-8 w-[120px] text-xs"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className={cn(isMe && 'pointer-events-none opacity-40')} title={isMe ? 'You can’t ban yourself' : undefined}>
                      <Switch checked={u.isBanned} disabled={isMe} onChange={(v) => setPending({ user: u, kind: 'ban', banned: v })} label={<span className="sr-only">Ban @{u.username}</span>} />
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted">{formatDate(u.createdAt)}</td>
                </tr>
              )
            })}
          </TableFrame>
          {meta && meta.totalPages > 1 && (
            <Pagination className="mt-6" page={meta.page} totalPages={meta.totalPages} onChange={(p) => set({ page: p === 1 ? null : String(p) })} />
          )}
        </>
      )}

      <ConfirmDialog
        open={!!pending}
        title={
          pending?.kind === 'ban'
            ? pending.banned ? `Ban @${pending.user.username}?` : `Unban @${pending.user.username}?`
            : `Change @${pending?.user.username}’s role?`
        }
        body={
          pending?.kind === 'ban' ? (
            pending.banned
              ? <>This signs them out everywhere and blocks future sign-ins. Their published assets stay listed and buyers keep what they bought.</>
              : <>They’ll be able to sign in again straight away.</>
          ) : pending ? (
            <>
              From <span className="font-medium capitalize text-text">{pending.user.role}</span> to <span className="font-medium capitalize text-text">{pending.role}</span>.{' '}
              {pending.role === 'admin' ? 'Admins can moderate every user and asset.' : pending.role === 'buyer' && pending.user.role !== 'buyer' ? 'They’ll lose access to the Creator Studio.' : 'The change applies on their next request.'}
            </>
          ) : null
        }
        confirmLabel={pending?.kind === 'ban' ? (pending.banned ? 'Ban and sign out' : 'Unban') : 'Change role'}
        tone={pending?.kind === 'ban' && pending.banned ? 'danger' : 'primary'}
        pending={update.isPending}
        onConfirm={confirm}
        onClose={() => setPending(null)}
      />
    </Page>
  )
}
