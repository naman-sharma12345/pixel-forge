import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { Archive, Check, ExternalLink, X } from 'lucide-react'
import { Page } from '@/components/layout'
import { DashHeader } from '@/components/dashboard/DashboardLayout'
import { ConfirmDialog, SearchBox, StatusBadge, StatusTabs, TableFrame, TH } from '@/components/dashboard/table'
import { Avatar, Button, EmptyState, Pagination, PriceTag, Switch, Textarea, Tooltip } from '@/components/ui'
import { api, isApiClientError, type ListResult } from '@/api'
import { keys } from '@/hooks/keys'
import { useAdminAssets } from '@/hooks/useStudio'
import { categoryLabel } from '@/lib/constants'
import { mediaUrl } from '@/lib/media'
import { cn } from '@/lib/cn'
import type { AdminAssetParams, AdminAssetUpdateBody, AssetStatus, MyAsset } from '@/types/api'

type Tab = 'all' | AssetStatus
const STATUSES: AssetStatus[] = ['published', 'rejected', 'archived']
const REJECT_PRESETS = ['Thumbnail doesn’t match the content', 'Possible copyright issue', 'Files are missing or broken', 'Description is misleading']

function ActionButton({ label, onClick, tone, icon: Icon, disabled }: { label: string; onClick: () => void; tone: 'success' | 'danger' | 'muted'; icon: typeof Check; disabled?: boolean }) {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-control border transition-colors disabled:pointer-events-none disabled:opacity-30',
          tone === 'success' && 'border-success/30 text-success hover:bg-success/10',
          tone === 'danger' && 'border-danger/30 text-danger hover:bg-danger/10',
          tone === 'muted' && 'border-border text-muted hover:bg-surface-3 hover:text-text',
        )}
      >
        <Icon className="h-4 w-4" />
      </button>
    </Tooltip>
  )
}

export default function AdminAssetsPage() {
  const [params, setParams] = useSearchParams()
  const qc = useQueryClient()
  const tab = (STATUSES.includes(params.get('status') as AssetStatus) ? params.get('status') : 'all') as Tab
  const q = params.get('q') ?? ''
  const page = Math.max(1, Number(params.get('page')) || 1)
  const query: AdminAssetParams = { status: tab === 'all' ? undefined : tab, q: q || undefined, page, limit: 20 }
  const listKey = keys.admin.assets(query)
  const { data, isLoading, isError, refetch } = useAdminAssets(query)

  const counts = useQueries({
    queries: [undefined, ...STATUSES].map((status) => ({
      queryKey: keys.admin.assets({ status, q: q || undefined, limit: 1 }),
      queryFn: () => api.admin.assets({ status, q: q || undefined, limit: 1 }),
      staleTime: 10_000,
    })),
  })
  const countOf = (i: number) => counts[i]?.data?.meta.total

  const [rejectTarget, setRejectTarget] = useState<MyAsset | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<MyAsset | null>(null)
  const [reason, setReason] = useState('')

  // optimistic update with rollback on the visible list
  const mutate = useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminAssetUpdateBody; label: string }) => api.admin.updateAsset(id, body),
    onMutate: async ({ id, body }) => {
      await qc.cancelQueries({ queryKey: listKey })
      const prev = qc.getQueryData<ListResult<MyAsset>>(listKey)
      if (prev) {
        qc.setQueryData<ListResult<MyAsset>>(listKey, {
          ...prev,
          items: prev.items.map((a) => (a._id === id ? { ...a, ...body, rejectionReason: body.status === 'published' ? '' : body.rejectionReason ?? a.rejectionReason } : a)),
        })
      }
      return { prev }
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(listKey, ctx.prev)
      toast.error(isApiClientError(e) ? e.message : 'That change didn’t save, so it was undone')
    },
    onSuccess: (_d, v) => toast.success(v.label),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['admin'] })
      qc.invalidateQueries({ queryKey: ['assets'] })
    },
  })

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k))
    if (!('page' in patch)) next.delete('page')
    setParams(next, { replace: true })
  }

  const rows = data?.items ?? []
  const meta = data?.meta

  return (
    <Page title="Asset moderation" description="Approve, reject, feature and archive assets.">
      <DashHeader eyebrow="Admin" title="Assets" subtitle="Moderate the catalogue. Changes apply instantly." />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <StatusTabs<Tab>
          layoutId="admin-asset-tab"
          value={tab}
          onChange={(k) => set({ status: k === 'all' ? null : k })}
          tabs={[
            { key: 'all', label: 'All', count: countOf(0) },
            { key: 'published', label: 'Published', count: countOf(1) },
            { key: 'rejected', label: 'Rejected', count: countOf(2) },
            { key: 'archived', label: 'Archived', count: countOf(3) },
          ]}
        />
        <SearchBox value={q} onChange={(v) => set({ q: v || null })} placeholder="Search titles" className="w-full lg:w-72" />
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-card border border-border bg-surface" />)}</div>
      ) : isError ? (
        <EmptyState compact art="skull" title="Assets didn’t load" action={<Button onClick={() => refetch()}>Try again</Button>} />
      ) : !rows.length ? (
        <EmptyState compact art="search" title={q ? `No assets match “${q}”` : `No ${tab === 'all' ? '' : tab} assets`} />
      ) : (
        <>
          <TableFrame
            minWidth={980}
            head={
              <>
                <th scope="col" className={TH}>Asset</th>
                <th scope="col" className={TH}>Creator</th>
                <th scope="col" className={`${TH} text-right`}>Price</th>
                <th scope="col" className={TH}>Status</th>
                <th scope="col" className={TH}>Featured</th>
                <th scope="col" className={`${TH} text-right`}>Actions</th>
              </>
            }
          >
            {rows.map((a) => (
              <tr key={a._id} className="transition-colors hover:bg-surface-2/60">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <img src={mediaUrl(a.thumbnail.url)} alt="" className="pixelated h-11 w-11 shrink-0 rounded-[8px] object-cover ring-1 ring-border" />
                    <div className="min-w-0">
                      <Link to={`/asset/${a.slug}`} className="inline-flex max-w-[280px] items-center gap-1 truncate font-medium text-text hover:text-primary">
                        <span className="truncate">{a.title}</span> <ExternalLink className="h-3 w-3 shrink-0 text-subtle" />
                      </Link>
                      <p className="text-xs text-subtle">{categoryLabel(a.category)} · {a.stats.sales} sales</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <Link to={`/u/${a.creator.username}`} className="inline-flex items-center gap-2 text-muted hover:text-text">
                    <Avatar src={a.creator.avatarUrl} name={a.creator.name} username={a.creator.username} size={22} />
                    <span className="truncate">{a.creator.name}</span>
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-right"><PriceTag price={a.price} size="sm" /></td>
                <td className="px-3 py-2.5">
                  {a.status === 'rejected' && a.rejectionReason ? (
                    <Tooltip label={a.rejectionReason}><span tabIndex={0} className="cursor-help rounded-full"><StatusBadge status={a.status} /></span></Tooltip>
                  ) : (
                    <StatusBadge status={a.status} />
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <Switch
                    checked={a.isFeatured}
                    disabled={a.status !== 'published'}
                    onChange={(v) => mutate.mutate({ id: a._id, body: { isFeatured: v }, label: v ? `“${a.title}” is featured` : `“${a.title}” removed from featured` })}
                    label={<span className="sr-only">Feature {a.title}</span>}
                  />
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex justify-end gap-1.5">
                    <ActionButton label="Approve" icon={Check} tone="success" disabled={a.status === 'published'} onClick={() => mutate.mutate({ id: a._id, body: { status: 'published' }, label: `“${a.title}” approved and published` })} />
                    <ActionButton label="Reject with a reason" icon={X} tone="danger" disabled={a.status === 'rejected'} onClick={() => { setReason(''); setRejectTarget(a) }} />
                    <ActionButton label="Archive" icon={Archive} tone="muted" disabled={a.status === 'archived'} onClick={() => setArchiveTarget(a)} />
                  </div>
                </td>
              </tr>
            ))}
          </TableFrame>
          {meta && meta.totalPages > 1 && (
            <Pagination className="mt-6" page={meta.page} totalPages={meta.totalPages} onChange={(p) => set({ page: p === 1 ? null : String(p) })} />
          )}
        </>
      )}

      <ConfirmDialog
        open={!!rejectTarget}
        title={`Reject “${rejectTarget?.title ?? ''}”?`}
        body="It’s hidden from the marketplace and the creator sees your reason in their studio, so they can fix it and resubmit."
        confirmLabel="Reject asset"
        confirmDisabled={reason.trim().length < 5}
        pending={mutate.isPending}
        onClose={() => setRejectTarget(null)}
        onConfirm={() => {
          if (!rejectTarget) return
          mutate.mutate({ id: rejectTarget._id, body: { status: 'rejected', rejectionReason: reason.trim(), isFeatured: false }, label: `“${rejectTarget.title}” rejected` })
          setRejectTarget(null)
        }}
      >
        <div className="mb-3 flex flex-wrap gap-1.5">
          {REJECT_PRESETS.map((p) => (
            <button key={p} type="button" onClick={() => setReason(p)} className={cn('rounded-full border px-2.5 py-1 text-xs transition-colors', reason === p ? 'border-danger/50 bg-danger/10 text-text' : 'border-border text-muted hover:text-text')}>
              {p}
            </button>
          ))}
        </div>
        <Textarea label="Reason (shown to the creator)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} counter rows={3} hint="At least 5 characters" />
      </ConfirmDialog>

      <ConfirmDialog
        open={!!archiveTarget}
        title={`Archive “${archiveTarget?.title ?? ''}”?`}
        body="It disappears from the marketplace. Buyers who already own it keep access to their downloads."
        confirmLabel="Archive"
        pending={mutate.isPending}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => {
          if (!archiveTarget) return
          mutate.mutate({ id: archiveTarget._id, body: { status: 'archived', isFeatured: false }, label: `“${archiveTarget.title}” archived` })
          setArchiveTarget(null)
        }}
      />
    </Page>
  )
}
