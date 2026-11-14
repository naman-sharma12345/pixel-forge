import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BadgeCheck, Download, Gamepad2, Github, Globe, Link2, Package, ShoppingBag, Star, Twitter } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/cn'
import { Page } from '@/components/layout'
import { AssetCard, AssetCardSkeleton, AssetGrid } from '@/components/asset/AssetCard'
import { Avatar, Button, Card, EmptyState, RatingStars, Select, Skeleton, Tabs } from '@/components/ui'
import { usePublicUser } from '@/hooks/useCommerce'
import { useAssetListInfinite } from '@/hooks/useAssets'
import { useInViewOnce } from '@/hooks/useInView'
import { generateBanner } from '@/lib/pixelArt'
import { compactNumber, formatDate } from '@/lib/format'
import type { SortKey } from '@/types/api'

const SORT_OPTS = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Popular' },
  { value: 'top-rated', label: 'Top rated' },
  { value: 'price-asc', label: 'Price ↑' },
  { value: 'price-desc', label: 'Price ↓' },
]

function ProfileSkeleton() {
  return (
    <div>
      <Skeleton className="h-44 w-full rounded-none" />
      <div className="mx-auto -mt-12 max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <Skeleton className="h-24 w-24 rounded-full" />
        <Skeleton className="mt-4 h-8 w-56" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>
      <div className="mx-auto mt-10 grid max-w-[1200px] grid-cols-2 gap-3 px-4 sm:grid-cols-4 sm:px-6 lg:px-8">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
      <div className="mx-auto mt-10 grid max-w-[1200px] grid-cols-2 gap-3 px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <AssetCardSkeleton key={i} />)}
      </div>
    </div>
  )
}

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>()
  const { data, isLoading, isError } = usePublicUser(username)
  const [tab, setTab] = useState('assets')
  const [sort, setSort] = useState<SortKey>('newest')

  const banner = useMemo(() => (username ? generateBanner(username) : ''), [username])

  const assets = useAssetListInfinite(
    username ? { creator: username, sort, limit: 24 } : undefined,
  )
  const [sentinelRef, sentinelInView] = useInViewOnce<HTMLDivElement>()
  const items = assets.data?.pages.flatMap((p) => p.items) ?? []

  useEffect(() => {
    if (sentinelInView && assets.hasNextPage && !assets.isFetchingNextPage) assets.fetchNextPage()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentinelInView, assets.hasNextPage, assets.isFetchingNextPage])

  if (isLoading) {
    return <Page title="Profile"><ProfileSkeleton /></Page>
  }
  if (isError || !data) {
    return (
      <Page title="User not found">
        <div className="mx-auto max-w-[720px] px-4 py-20">
          <EmptyState
            art="ghost"
            title="No one by that name here"
            text={`There’s no Pixel Forge user called @${username ?? ''}. Check the spelling, or discover creators through their assets.`}
            action={<Link to="/explore"><Button>Explore assets</Button></Link>}
          />
        </div>
      </Page>
    )
  }

  const { user, stats } = data
  const socials = [
    user.socials.website && { icon: Globe, href: user.socials.website, label: 'Website' },
    user.socials.twitter && { icon: Twitter, href: `https://x.com/${user.socials.twitter.replace('@', '')}`, label: 'Twitter' },
    user.socials.itchio && { icon: Gamepad2, href: user.socials.itchio.startsWith('http') ? user.socials.itchio : `https://${user.socials.itchio}`, label: 'itch.io' },
    user.socials.github && { icon: Github, href: `https://github.com/${user.socials.github}`, label: 'GitHub' },
  ].filter(Boolean) as { icon: typeof Globe; href: string; label: string }[]

  const statPills = [
    { label: 'Assets', value: stats.assetCount.toLocaleString('en-IN'), icon: Package, tone: 'bg-primary-soft text-primary' },
    { label: 'Sales', value: compactNumber(stats.totalSales), icon: ShoppingBag, tone: 'bg-success/10 text-success' },
    { label: 'Downloads', value: compactNumber(stats.totalDownloads), icon: Download, tone: 'bg-accent/10 text-accent' },
    { label: 'Avg rating', value: stats.avgRating ? stats.avgRating.toFixed(1) : '–', icon: Star, tone: 'bg-warning/10 text-warning' },
  ]

  return (
    <Page title={`@${user.username}`} description={user.bio || `${user.name} on Pixel Forge`}>
      {/* banner */}
      <div className="relative h-48 overflow-hidden sm:h-64">
        <img src={banner} alt="" className="pixelated h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/20 to-transparent" />
      </div>

      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        {/* identity */}
        <div className="relative z-10 -mt-16 flex flex-col gap-5 sm:-mt-20 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="w-fit rounded-[28px] bg-bg p-1.5 shadow-[0_20px_50px_-10px_rgba(0,0,0,0.7)]">
              <Avatar src={user.avatarUrl} name={user.name} username={user.username} size={120} className="!h-24 !w-24 rounded-[22px] sm:!h-[120px] sm:!w-[120px]" />
            </div>
            <div className="pb-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-3xl font-bold tracking-tight text-text">{user.name}</h1>
                {user.role !== 'buyer' && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 font-pixel text-[8px] uppercase leading-none text-white shadow-pixel-sm">
                    <BadgeCheck className="h-3 w-3" /> Creator
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted">
                <span className="font-mono">@{user.username}</span> · Joined {formatDate(user.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pb-1">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={`${user.name} on ${s.label}`}
                title={s.label}
                className="flex h-10 w-10 items-center justify-center rounded-control border border-border bg-surface text-muted transition-colors hover:border-border-strong hover:text-text"
              >
                <s.icon className="h-4 w-4" />
              </a>
            ))}
            <Button
              variant="secondary"
              leftIcon={<Link2 className="h-4 w-4" />}
              onClick={async () => {
                try { await navigator.clipboard.writeText(window.location.href); toast.success('Profile link copied') } catch { toast.error('Could not copy the link') }
              }}
            >
              Share
            </Button>
          </div>
        </div>

        {user.bio && <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-text/80">{user.bio}</p>}

        {/* stat pills */}
        <dl className="mt-7 grid grid-cols-2 overflow-hidden rounded-panel border border-border bg-surface sm:grid-cols-4">
          {statPills.map((s, i) => (
            <div key={s.label} className={cn('flex items-center gap-3 p-4 sm:p-5', i % 2 === 1 && 'border-l border-border', i > 1 && 'border-t border-border sm:border-t-0', i === 2 && 'sm:border-l')}>
              <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-control', s.tone)}>
                <s.icon className="h-[18px] w-[18px]" />
              </span>
              <div>
                <dd className="font-mono text-xl font-semibold text-text">{s.value}</dd>
                <dt className="text-xs text-muted">{s.label}</dt>
              </div>
            </div>
          ))}
        </dl>

        {/* tabs */}
        <div className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs
              tabs={[{ key: 'assets', label: 'Assets' }, { key: 'about', label: 'About' }]}
              active={tab}
              onChange={setTab}
            />
            {tab === 'assets' && (
              <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} options={SORT_OPTS} className="h-9 w-36" aria-label="Sort assets" />
            )}
          </div>

          <div className="mt-6">
            {tab === 'about' ? (
              <Card className="max-w-2xl p-6">
                <h2 className="mb-3 font-display text-base font-semibold text-text">About</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted">{user.bio || 'This creator has not written a bio yet.'}</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-subtle">
                  <RatingStars value={stats.avgRating} size={13} />
                  <span>{stats.avgRating ? `${stats.avgRating.toFixed(1)} average rating` : 'No ratings yet'}</span>
                </div>
              </Card>
            ) : assets.isLoading ? (
              <AssetGrid>{Array.from({ length: 8 }).map((_, i) => <AssetCardSkeleton key={i} />)}</AssetGrid>
            ) : items.length === 0 ? (
              <EmptyState
                art="slime"
                title="No assets yet"
                text={`${user.name} hasn't published anything yet.`}
                action={<Link to="/explore"><Button variant="secondary">Browse the marketplace</Button></Link>}
              />
            ) : (
              <>
                <AssetGrid>
                  {items.map((a) => <AssetCard key={a._id} asset={a} />)}
                </AssetGrid>
                <div ref={sentinelRef} className="flex justify-center py-8">
                  {assets.isFetchingNextPage ? <Skeleton className="h-9 w-32" /> : assets.hasNextPage ? null : (
                    <p className="text-xs text-subtle">All {items.length} assets loaded</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Page>
  )
}
