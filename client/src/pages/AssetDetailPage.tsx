import { useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, ChevronRight, EyeOff, OctagonAlert } from 'lucide-react'
import { Page } from '@/components/layout'
import { Reveal } from '@/components/Reveal'
import { AssetCard, AssetCardSkeleton, AssetGrid } from '@/components/asset/AssetCard'
import { ImageViewer } from '@/components/asset/ImageViewer'
import { AudioViewer } from '@/components/asset/AudioViewer'
import { PurchasePanel } from '@/components/asset/PurchasePanel'
import { ReviewsSection } from '@/components/reviews/ReviewsSection'
import { Button, EmptyState, Tabs } from '@/components/ui'
import { useAssetDetail, useAssetList, useRelatedAssets } from '@/hooks/useAssets'
import { CATEGORY_MAP } from '@/lib/constants'
import { formatDate } from '@/lib/format'
import { isApiClientError } from '@/api'
import type { AssetDetail } from '@/types/api'

/** Preserves line breaks and turns bare URLs into links. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g)
  return (
    <div className="whitespace-pre-line text-[15px] leading-7 text-text/85">
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noreferrer noopener" className="break-all text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary">
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </div>
  )
}

function Pulse({ className }: { className: string }) {
  return <div className={`animate-shimmer rounded-card bg-gradient-to-r from-surface-2 via-surface-3 to-surface-2 bg-[length:400px_100%] ${className}`} />
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8" aria-busy="true" aria-label="Loading asset">
      <Pulse className="mb-6 h-4 w-56" />
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-7">
          <Pulse className="h-[400px] w-full rounded-panel sm:h-[520px]" />
          <div className="flex gap-2">{[0, 1, 2].map((i) => <Pulse key={i} className="h-16 w-16" />)}</div>
        </div>
        <div className="space-y-3 lg:col-span-5">
          <div className="space-y-4 rounded-panel border border-border bg-surface p-6">
            <Pulse className="h-6 w-24" />
            <Pulse className="h-8 w-4/5" />
            <div className="flex items-center gap-3"><Pulse className="h-10 w-10 rounded-full" /><Pulse className="h-4 w-32" /></div>
            <Pulse className="h-4 w-48" />
            <Pulse className="h-10 w-32" />
            <Pulse className="h-14 w-full" />
            <Pulse className="h-12 w-full" />
          </div>
          <Pulse className="h-40 w-full" />
        </div>
      </div>
    </div>
  )
}

function NotFound() {
  return (
    <div className="mx-auto max-w-[720px] px-4 py-20">
      <EmptyState
        art="ghost"
        title="This asset vanished into the void"
        text="It may have been removed by its creator, or the link has a typo. Plenty more where it came from."
        action={
          <>
            <Link to="/explore"><Button rightIcon={<ArrowRight className="h-4 w-4" />}>Explore assets</Button></Link>
            <Link to="/"><Button variant="secondary">Go home</Button></Link>
          </>
        }
      />
    </div>
  )
}

function SectionGrid({ title, link, items, loading }: { title?: string; link?: { to: string; label: string }; items: React.ReactNode[]; loading: boolean }) {
  return (
    <div>
      {(title || link) && (
        <div className="mb-4 flex items-center justify-between gap-4">
          {title && <h3 className="font-display text-lg font-semibold text-text">{title}</h3>}
          {link && (
            <Link to={link.to} className="group inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-text">
              {link.label} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
      )}
      <AssetGrid className="lg:grid-cols-4 xl:grid-cols-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => <AssetCardSkeleton key={i} />) : items}
      </AssetGrid>
    </div>
  )
}

function MoreFromCreator({ asset }: { asset: AssetDetail }) {
  const { data, isLoading } = useAssetList({ creator: asset.creator.username, limit: 9, sort: 'popular' })
  const items = (data?.items ?? []).filter((a) => a._id !== asset._id).slice(0, 8)
  if (!isLoading && !items.length)
    return <EmptyState compact art="star" title={`${asset.creator.name} has no other assets yet`} text="Follow their profile to catch the next drop." />
  return (
    <SectionGrid
      link={{ to: `/u/${asset.creator.username}`, label: `Visit ${asset.creator.name}’s store` }}
      loading={isLoading}
      items={items.map((a) => <AssetCard key={a._id} asset={a} />)}
    />
  )
}

function Related({ slug }: { slug: string }) {
  const { data, isLoading } = useRelatedAssets(slug)
  if (!isLoading && !data?.length) return <EmptyState compact art="search" title="Nothing related yet" text="Browse the category for similar assets." />
  return <SectionGrid loading={isLoading} items={(data ?? []).map((a) => <AssetCard key={a._id} asset={a} />)} />
}

export default function AssetDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: asset, isLoading, isError, error, refetch } = useAssetDetail(slug)
  const [tab, setTab] = useState('description')
  const tabsRef = useRef<HTMLDivElement>(null)

  const imageUrls = useMemo(() => {
    if (!asset) return []
    const previews = asset.previews.filter((p) => p.kind === 'image').map((p) => p.url)
    return previews.length ? previews : [asset.thumbnail.url]
  }, [asset])

  if (isLoading) {
    return (
      <Page title="Loading asset">
        <DetailSkeleton />
      </Page>
    )
  }
  if (isError && !(isApiClientError(error) && error.status === 404)) {
    return (
      <Page title="Something went wrong">
        <div className="mx-auto max-w-[720px] px-4 py-20">
          <EmptyState art="skull" title="We couldn't load this asset" text="It's probably a hiccup on our side. Give it another go." action={<Button onClick={() => refetch()}>Try again</Button>} />
        </div>
      </Page>
    )
  }
  if (!asset) {
    return (
      <Page title="Asset not found">
        <NotFound />
      </Page>
    )
  }

  const cat = CATEGORY_MAP.get(asset.category)
  const tabs = [
    { key: 'description', label: 'Description' },
    { key: 'reviews', label: <>Reviews <span className="ml-1 rounded-full bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-muted">{asset.stats.ratingCount}</span></> },
    { key: 'creator', label: <>More from <span className="hidden sm:inline">{asset.creator.name}</span><span className="sm:hidden">creator</span></> },
    { key: 'related', label: 'Related' },
  ]

  const showReviews = () => {
    setTab('reviews')
    requestAnimationFrame(() => tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  return (
    <Page title={asset.title} description={asset.description.slice(0, 160)}>
      <div className="mx-auto max-w-[1280px] px-4 pb-6 pt-5 sm:px-6 lg:px-8">
        <nav aria-label="Breadcrumb" className="mb-5">
          <ol className="flex min-w-0 items-center gap-1.5 text-sm text-muted">
            <li><Link to="/explore" className="transition-colors hover:text-text">Explore</Link></li>
            <li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5 text-subtle" /></li>
            <li><Link to={`/explore?category=${asset.category}`} className="whitespace-nowrap transition-colors hover:text-text">{cat?.label ?? asset.category}</Link></li>
            <li aria-hidden="true"><ChevronRight className="h-3.5 w-3.5 text-subtle" /></li>
            <li className="min-w-0 truncate text-text" aria-current="page">{asset.title}</li>
          </ol>
        </nav>

        {asset.isMine && asset.status !== 'published' && (
          <div
            role="status"
            className={`mb-6 flex items-start gap-3 rounded-card border p-4 ${asset.status === 'rejected' ? 'border-danger/40 bg-danger/10' : 'border-warning/40 bg-warning/10'}`}
          >
            {asset.status === 'rejected' ? <OctagonAlert className="mt-0.5 h-5 w-5 shrink-0 text-danger" /> : <EyeOff className="mt-0.5 h-5 w-5 shrink-0 text-warning" />}
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold text-text">
                {asset.status === 'rejected' ? 'This asset was rejected by moderation' : 'This asset is archived'} and is hidden from buyers.
              </p>
              {asset.rejectionReason && <p className="mt-1 text-muted">Reason: {asset.rejectionReason}</p>}
            </div>
            <Link to={`/studio/edit/${asset._id}`} className="shrink-0 text-sm font-medium text-text underline-offset-2 hover:underline">
              Fix in Studio
            </Link>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="min-w-0 lg:col-span-7">
            <Reveal>
              {asset.mediaKind === 'audio' ? <AudioViewer asset={asset} /> : <ImageViewer images={imageUrls} meta={asset.meta} title={asset.title} />}
            </Reveal>
            <p className="mt-3 px-1 text-xs text-subtle">
              Published {formatDate(asset.createdAt)} · Updated {formatDate(asset.updatedAt)}
            </p>
          </div>
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-20">
              <Reveal index={1}>
                <PurchasePanel asset={asset} onShowReviews={showReviews} />
              </Reveal>
            </div>
          </div>
        </div>

        <div ref={tabsRef} className="mt-14 scroll-mt-20">
          <div className="overflow-x-auto [scrollbar-width:none]">
            <Tabs tabs={tabs} active={tab} onChange={setTab} className="min-w-max" />
          </div>
          <div className="mt-6">
            {tab === 'description' && (
              <div className="grid gap-6 lg:grid-cols-12">
                <div className="rounded-panel border border-border bg-surface p-6 sm:p-8 lg:col-span-8">
                  <RichText text={asset.description} />
                </div>
                <aside className="rounded-panel border border-border bg-surface p-6 lg:col-span-4">
                  <h3 className="font-pixel text-[8px] uppercase text-subtle">At a glance</h3>
                  <dl className="mt-4 space-y-3 text-sm">
                    {[
                      ['Category', cat?.label ?? asset.category],
                      ['Downloads', asset.stats.downloads.toLocaleString('en-IN')],
                      ['Views', (asset.stats.views ?? 0).toLocaleString('en-IN')],
                      ['Formats', asset.fileFormats.map((f) => f.toUpperCase()).join(', ') || asset.fileInfo.format.toUpperCase()],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4">
                        <dt className="text-muted">{k}</dt>
                        <dd className="text-right font-mono text-xs text-text">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </aside>
              </div>
            )}
            {tab === 'reviews' && <ReviewsSection asset={asset} />}
            {tab === 'creator' && <MoreFromCreator asset={asset} />}
            {tab === 'related' && <Related slug={asset.slug} />}
          </div>
        </div>
      </div>
    </Page>
  )
}
