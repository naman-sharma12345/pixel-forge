import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { Archive, ExternalLink, MoreHorizontal, Pencil, Star, Upload } from 'lucide-react'
import { Page } from '@/components/layout'
import { DashHeader } from '@/components/dashboard/DashboardLayout'
import { ConfirmDialog, SearchBox, SortHeader, StatusBadge, StatusTabs, TableFrame, TH, useSort } from '@/components/dashboard/table'
import { Button, DropdownMenu, EmptyState, Pagination, PriceTag, Tooltip } from '@/components/ui'
import { api, isApiClientError } from '@/api'
import { keys } from '@/hooks/keys'
import { useDeleteAsset, useMyAssets } from '@/hooks/useAssets'
import { categoryLabel } from '@/lib/constants'
import { formatDate } from '@/lib/format'
import { mediaUrl } from '@/lib/media'
import type { AssetStatus, MyAsset } from '@/types/api'

type Tab = 'all' | AssetStatus
type SortKey = 'title' | 'price' | 'sales' | 'rating' | 'created'
const PAGE_SIZE = 24
const STATUSES: AssetStatus[] = ['published', 'rejected', 'archived']

function Status({ a }: { a: MyAsset }) {
  if (a.status === 'rejected' && a.rejectionReason) {
    return (
      <Tooltip label={`Rejected: ${a.rejectionReason}`}>
        <button type="button" className="cursor-help rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label={`Rejected. Reason: ${a.rejectionReason}`}>
          <StatusBadge status={a.status} />
        </button>
      </Tooltip>
    )
  }
  return <StatusBadge status={a.status} />
}

function RowMenu({ a, onArchive }: { a: MyAsset; onArchive: () => void }) {
  const navigate = useNavigate()
  return (
    <DropdownMenu
      align="right"
      trigger={
        <button type="button" aria-label={`Actions for ${a.title}`} className="flex h-8 w-8 items-center justify-center rounded-control text-muted transition-colors hover:bg-surface-3 hover:text-text">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      }
      items={[
        { key: 'view', label: 'View', icon: <ExternalLink className="h-4 w-4" />, onSelect: () => navigate(`/asset/${a.slug}`) },
        { key: 'edit', label: 'Edit', icon: <Pencil className="h-4 w-4" />, onSelect: () => navigate(`/studio/edit/${a._id}`) },
        ...(a.status !== 'archived' ? [{ key: 'archive', label: 'Archive', icon: <Archive className="h-4 w-4" />, danger: true, onSelect: onArchive }] : []),
      ]}
    />
  )
}

export default function StudioAssetsPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const tab = (STATUSES.includes(params.get('status') as AssetStatus) ? params.get('status') : 'all') as Tab
  const page = Math.max(1, Number(params.get('page')) || 1)
  const q = params.get('q') ?? ''
  const { sort, onSort } = useSort<SortKey>('created')
  const [archiveTarget, setArchiveTarget] = useState<MyAsset | null>(null)
  const archive = useDeleteAsset()

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k))
    setParams(next, { replace: true })
  }

  const list = useMyAssets({ status: tab === 'all' ? undefined : tab, page, limit: PAGE_SIZE })
  // tab counts: one cheap limit=1 request per status, total comes from meta
  const counts = useQueries({
    queries: [undefined, ...STATUSES].map((status) => ({
      queryKey: keys.assets.mine({ status, limit: 1 }),
      queryFn: () => api.assets.mine({ status, limit: 1 }),
      staleTime: 15_000,
    })),
  })
  const countOf = (i: number) => counts[i]?.data?.meta.total

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const items = (list.data?.items ?? []).filter((a) => !needle || a.title.toLowerCase().includes(needle) || a.tags.some((t) => t.includes(needle)))
    const val = (a: MyAsset): string | number => {
      switch (sort.key) {
        case 'title': return a.title.toLowerCase()
        case 'price': return a.price
        case 'sales': return a.stats.sales
        case 'rating': return a.stats.ratingAvg
        default: return a.createdAt
      }
    }
    return [...items].sort((x, y) => {
      const a = val(x)
      const b = val(y)
      const c = a < b ? -1 : a > b ? 1 : 0
      return sort.dir === 'asc' ? c : -c
    })
  }, [list.data, q, sort])

  const meta = list.data?.meta
  const totalAll = countOf(0)

  const doArchive = () => {
    if (!archiveTarget) return
    archive.mutate(archiveTarget._id, {
      onSuccess: () => {
        toast.success(`“${archiveTarget.title}” archived`)
        setArchiveTarget(null)
      },
      onError: (e) => toast.error(isApiClientError(e) ? e.message : 'Could not archive this asset'),
    })
  }

  return (
    <Page title="My assets" description="Manage everything you sell on Pixel Forge.">
      <DashHeader
        eyebrow="Creator Studio"
        title="My assets"
        subtitle={totalAll !== undefined ? `${totalAll} asset${totalAll === 1 ? '' : 's'} in your store` : 'Everything you sell, in one place'}
        actions={<Button leftIcon={<Upload className="h-4 w-4" />} onClick={() => navigate('/studio/new')}>Upload asset</Button>}
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <StatusTabs<Tab>
          layoutId="mine-tab"
          value={tab}
          onChange={(k) => set({ status: k === 'all' ? null : k, page: null })}
          tabs={[
            { key: 'all', label: 'All', count: countOf(0) },
            { key: 'published', label: 'Published', count: countOf(1) },
            { key: 'rejected', label: 'Rejected', count: countOf(2) },
            { key: 'archived', label: 'Archived', count: countOf(3) },
          ]}
        />
        <SearchBox value={q} onChange={(v) => set({ q: v || null })} placeholder="Search by title or tag" className="w-full lg:w-72" />
      </div>

      {list.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-card border border-border bg-surface" />)}</div>
      ) : list.isError ? (
        <EmptyState compact art="skull" title="We couldn’t load your assets" action={<Button onClick={() => list.refetch()}>Try again</Button>} />
      ) : !rows.length ? (
        q ? (
          <EmptyState compact art="search" title={`No assets match “${q}”`} action={<Button variant="secondary" onClick={() => set({ q: null })}>Clear search</Button>} />
        ) : tab === 'all' ? (
          <EmptyState art="star" title="Nothing in your store yet" text="Upload your first asset and it will show up here." action={<Button onClick={() => navigate('/studio/new')}>Upload asset</Button>} />
        ) : (
          <EmptyState compact art="ghost" title={`No ${tab} assets`} text={tab === 'rejected' ? 'Nice, nothing has been rejected.' : undefined} />
        )
      ) : (
        <>
          {/* desktop table */}
          <div className="hidden md:block">
            <TableFrame
              head={
                <>
                  <SortHeader label="Asset" k="title" sort={sort} onSort={onSort} />
                  <th scope="col" className={TH}>Category</th>
                  <SortHeader label="Price" k="price" sort={sort} onSort={onSort} align="right" />
                  <SortHeader label="Sales" k="sales" sort={sort} onSort={onSort} align="right" />
                  <SortHeader label="Rating" k="rating" sort={sort} onSort={onSort} align="right" />
                  <th scope="col" className={TH}>Status</th>
                  <SortHeader label="Added" k="created" sort={sort} onSort={onSort} />
                  <th scope="col" className="w-12 px-3 py-3"><span className="sr-only">Actions</span></th>
                </>
              }
            >
              {rows.map((a) => (
                <tr key={a._id} className="group transition-colors hover:bg-surface-2/60">
                  <td className="px-3 py-2.5">
                    <Link to={`/studio/edit/${a._id}`} className="flex items-center gap-3">
                      <img src={mediaUrl(a.thumbnail.url)} alt="" className="pixelated h-11 w-11 shrink-0 rounded-[8px] object-cover ring-1 ring-border" />
                      <span className="min-w-0">
                        <span className="block max-w-[260px] truncate font-medium text-text group-hover:text-primary">{a.title}</span>
                        <span className="block font-mono text-[11px] text-subtle">/{a.slug}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-muted">{categoryLabel(a.category)}</td>
                  <td className="px-3 py-2.5 text-right"><PriceTag price={a.price} size="sm" /></td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-text">{a.stats.sales}</td>
                  <td className="px-3 py-2.5 text-right">
                    {a.stats.ratingCount ? (
                      <span className="inline-flex items-center gap-1 font-mono text-xs text-text"><Star className="h-3 w-3 fill-warning text-warning" />{a.stats.ratingAvg.toFixed(1)}<span className="text-subtle">({a.stats.ratingCount})</span></span>
                    ) : (
                      <span className="text-xs text-subtle">–</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5"><Status a={a} /></td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted">{formatDate(a.createdAt)}</td>
                  <td className="px-3 py-2.5 text-right"><RowMenu a={a} onArchive={() => setArchiveTarget(a)} /></td>
                </tr>
              ))}
            </TableFrame>
          </div>

          {/* mobile cards */}
          <ul className="space-y-2 md:hidden">
            {rows.map((a) => (
              <li key={a._id} className="flex gap-3 rounded-card border border-border bg-surface p-3">
                <img src={mediaUrl(a.thumbnail.url)} alt="" className="pixelated h-16 w-16 shrink-0 rounded-[10px] object-cover ring-1 ring-border" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={`/studio/edit/${a._id}`} className="line-clamp-2 text-sm font-semibold text-text">{a.title}</Link>
                    <RowMenu a={a} onArchive={() => setArchiveTarget(a)} />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <Status a={a} />
                    <span>{categoryLabel(a.category)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 font-mono text-xs text-muted">
                    <PriceTag price={a.price} size="sm" />
                    <span>{a.stats.sales} sales</span>
                    {a.stats.ratingCount > 0 && <span>★ {a.stats.ratingAvg.toFixed(1)}</span>}
                  </div>
                  {a.status === 'rejected' && a.rejectionReason && <p className="mt-2 rounded-md bg-danger/10 px-2 py-1 text-[11px] text-danger">{a.rejectionReason}</p>}
                </div>
              </li>
            ))}
          </ul>

          {meta && meta.totalPages > 1 && (
            <Pagination className="mt-6" page={meta.page} totalPages={meta.totalPages} onChange={(p) => set({ page: p === 1 ? null : String(p) })} />
          )}
        </>
      )}

      <ConfirmDialog
        open={!!archiveTarget}
        title="Archive this asset?"
        body={
          <>
            <span className="font-medium text-text">“{archiveTarget?.title}”</span> will be hidden from the marketplace and can no longer be bought.
            Everyone who already owns it keeps access and can still download it from their library.
          </>
        }
        confirmLabel="Archive asset"
        pending={archive.isPending}
        onConfirm={doArchive}
        onClose={() => setArchiveTarget(null)}
      />
    </Page>
  )
}
