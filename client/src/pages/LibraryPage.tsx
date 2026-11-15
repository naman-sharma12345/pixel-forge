import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, Download, Grid2x2, List, MessageSquarePlus, Search } from 'lucide-react'
import { Page } from '@/components/layout'
import { AssetCard, AssetCardSkeleton, AssetGrid } from '@/components/asset/AssetCard'
import { ReviewForm } from '@/components/reviews/ReviewsSection'
import { Button, EmptyState, Input, Modal, Select } from '@/components/ui'
import { useDownloadAsset, useLibrary } from '@/hooks/useCommerce'
import { api, isApiClientError } from '@/api'
import { CATEGORY_MAP } from '@/lib/constants'
import { formatDate, formatPrice } from '@/lib/format'
import { mediaUrl } from '@/lib/media'
import { cn } from '@/lib/cn'
import type { Category, LibraryItem } from '@/types/api'

function ItemMeta({ item, onReview, compact }: { item: LibraryItem; onReview: () => void; compact?: boolean }) {
  const dl = useDownloadAsset()
  const stop = (fn: () => void) => (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); fn() }
  return (
    <div className={cn('relative z-10 flex flex-col gap-2.5', !compact && 'mt-1 border-t border-border pt-3')} onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-subtle">
        <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {formatDate(item.createdAt)}</span>
        <span className="inline-flex items-center gap-1">
          <Download className="h-3 w-3" /> {item.downloadCount === 0 ? 'Not downloaded yet' : `Downloaded ${item.downloadCount} time${item.downloadCount === 1 ? '' : 's'}`}
        </span>
        {compact && <span>{item.pricePaid ? formatPrice(item.pricePaid) : 'Claimed free'}</span>}
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1"
          loading={dl.isPending}
          onClick={stop(() => dl.mutate(item.asset._id))}
          leftIcon={<Download className="h-3.5 w-3.5" />}
        >
          {dl.isPending ? 'Preparing…' : 'Download'}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className={cn(!compact && 'px-2.5 sm:px-3')}
          onClick={stop(onReview)}
          leftIcon={<MessageSquarePlus className="h-3.5 w-3.5" />}
          aria-label={`Write a review for ${item.asset.title}`}
          title="Write a review"
        >
          {compact ? <span className="hidden sm:inline">Write a review</span> : <span className="hidden xl:inline">Review</span>}
        </Button>
      </div>
    </div>
  )
}

export default function LibraryPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const category = (params.get('category') ?? '') as Category | ''
  const view = params.get('view') === 'list' ? 'list' : 'grid'
  const [qInput, setQInput] = useState(q)
  const [reviewItem, setReviewItem] = useState<LibraryItem | null>(null)

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  useEffect(() => setQInput(q), [q])
  useEffect(() => {
    const t = window.setTimeout(() => { if (qInput.trim() !== q) setParam('q', qInput.trim()) }, 300)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qInput])

  const listParams = useMemo(() => ({ q: q || undefined, category: category || undefined, limit: 48, page: 1 }), [q, category])
  const { data, isLoading, isError, refetch, isRefetching } = useLibrary(listParams)
  const items = data?.items ?? []
  const total = data?.meta.total ?? items.length
  const filtered = !!(q || category)

  const qc = useQueryClient()
  const createReview = useMutation({
    mutationFn: (body: { assetId: string; rating: number; comment: string }) =>
      api.reviews.create({ assetId: body.assetId, rating: body.rating, comment: body.comment || undefined }),
    onSuccess: () => {
      setReviewItem(null)
      qc.invalidateQueries({ queryKey: ['reviews'] })
      qc.invalidateQueries({ queryKey: ['assets'] })
      toast.success('Thanks! Your review is live.')
    },
    onError: (e) => {
      if (isApiClientError(e) && e.code === 'CONFLICT') toast.error('You’ve already reviewed this asset. Edit it from the asset page.')
      else toast.error(isApiClientError(e) ? e.message : 'Could not post your review')
    },
  })

  return (
    <Page title="My Library" description="Everything you own, ready to download.">
      <div className="mx-auto max-w-[1280px] px-4 pb-10 pt-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-pixel text-[8px] uppercase text-accent">Your stash</p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-text">Library</h1>
            <p className="mt-1.5 text-sm text-muted">
              {isLoading ? 'Loading your assets…' : <><span className="font-mono text-text">{total}</span> asset{total === 1 ? '' : 's'} you own, ready to download any time.</>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-0 flex-1 sm:w-60 sm:flex-none">
              <Input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Search your library…" leftIcon={<Search className="h-4 w-4" />} aria-label="Search library" type="search" />
            </div>
            <Select
              value={category}
              onChange={(e) => setParam('category', e.target.value)}
              options={[{ value: '', label: 'All categories' }, ...[...CATEGORY_MAP.values()].map((c) => ({ value: c.key, label: c.label }))]}
              className="h-10 w-[160px]"
              aria-label="Filter by category"
            />
            <div className="flex rounded-control border border-border bg-surface-2 p-0.5" role="group" aria-label="Layout">
              {([['grid', Grid2x2, 'Grid view'], ['list', List, 'List view']] as const).map(([v, Icon, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setParam('view', v === 'grid' ? '' : v)}
                  aria-label={label}
                  aria-pressed={view === v}
                  title={label}
                  className={cn('rounded-[7px] p-2 transition-colors', view === v ? 'bg-surface-3 text-text' : 'text-subtle hover:text-text')}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
        </header>

        {isLoading ? (
          view === 'grid' ? (
            <AssetGrid>{Array.from({ length: 10 }).map((_, i) => <AssetCardSkeleton key={i} />)}</AssetGrid>
          ) : (
            <div className="flex flex-col gap-3">{[0, 1, 2, 3].map((i) => <AssetCardSkeleton key={i} variant="list" />)}</div>
          )
        ) : isError ? (
          <EmptyState art="skull" title="We couldn’t open your library" text="Your assets are safe. This is just a loading hiccup." action={<Button loading={isRefetching} onClick={() => refetch()}>Try again</Button>} />
        ) : items.length === 0 ? (
          filtered ? (
            <EmptyState
              art="search"
              title="Nothing in your library matches"
              text="Try another search term or category."
              action={<Button variant="secondary" onClick={() => setParams(new URLSearchParams(), { replace: true })}>Clear filters</Button>}
            />
          ) : (
            <EmptyState
              art="chest"
              title="Your library is empty"
              text="Everything you buy or claim for free lands here, ready to download whenever you need it."
              action={
                <>
                  <Link to="/explore"><Button>Explore assets</Button></Link>
                  <Link to="/explore?free=true"><Button variant="secondary">Grab some freebies</Button></Link>
                </>
              }
            />
          )
        ) : view === 'grid' ? (
          <AssetGrid>
            {items.map((item) => (
              <AssetCard key={item._id} asset={item.asset} owned footer={<ItemMeta item={item} onReview={() => setReviewItem(item)} />} />
            ))}
          </AssetGrid>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <AssetCard key={item._id} asset={item.asset} variant="list" owned footer={<ItemMeta compact item={item} onReview={() => setReviewItem(item)} />} />
            ))}
          </div>
        )}
      </div>

      <Modal open={!!reviewItem} onClose={() => setReviewItem(null)} title="Write a review">
        {reviewItem && (
          <>
            <div className="mb-5 flex items-center gap-3 rounded-control border border-border bg-surface-2 p-3">
              <img src={mediaUrl(reviewItem.asset.thumbnail.url)} alt="" className="pixelated h-12 w-12 rounded-[8px] object-cover" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text">{reviewItem.asset.title}</p>
                <p className="truncate text-xs text-muted">by {reviewItem.asset.creator.name}</p>
              </div>
            </div>
            <ReviewForm
              pending={createReview.isPending}
              submitLabel="Post review"
              onSubmit={(rating, comment) => {
                if (rating < 1) { toast.error('Pick a star rating first'); return }
                createReview.mutate({ assetId: reviewItem.asset._id, rating, comment })
              }}
            />
          </>
        )}
      </Modal>
    </Page>
  )
}
