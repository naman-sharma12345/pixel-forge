import { memo, useMemo, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, Download, Heart, Pause, Play, ShoppingCart, Sparkles, Star } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/cn'
import { mediaUrl } from '@/lib/media'
import { compactNumber } from '@/lib/format'
import { seededRng } from '@/lib/seeded'
import { CATEGORY_MAP } from '@/lib/constants'
import { useAuthStore } from '@/stores/auth'
import { usePlayerStore, type PlayerTrack } from '@/stores/player'
import { useUiStore } from '@/stores/ui'
import { useAddToCart, useCart, useClaimAsset, useOwnedAssetIds } from '@/hooks/useCommerce'
import { useToggleWishlist } from '@/hooks/useAuth'
import { Avatar, PriceTag, RatingStars } from '@/components/ui'
import { isApiClientError } from '@/api'
import type { AssetCard as AssetCardData } from '@/types/api'

export type AssetCardVariant = 'default' | 'compact' | 'list'

interface AssetCardProps {
  asset: AssetCardData
  variant?: AssetCardVariant
  /** Force ownership state; by default it is read from the library. */
  owned?: boolean
  isMine?: boolean
  className?: string
  /** Extra content rendered under the body (library meta, etc.). */
  footer?: ReactNode
}

export function toTrack(a: AssetCardData): PlayerTrack {
  return {
    assetId: a._id,
    slug: a.slug,
    title: a.title,
    creatorName: a.creator.name,
    thumbnailUrl: a.thumbnail.url,
    url: a.previewAudioUrl ?? '',
  }
}

/** Deterministic waveform heights (0..1) for an asset. */
export function useWaveform(seed: string, bars = 36) {
  return useMemo(() => {
    const rng = seededRng(`wave:${seed}`)
    let v = 0.5
    return Array.from({ length: bars }, (_, i) => {
      v = Math.min(1, Math.max(0.12, v + (rng() - 0.5) * 0.55))
      const env = 0.55 + 0.45 * Math.sin((i / bars) * Math.PI)
      return Math.max(0.12, v * env)
    })
  }, [seed, bars])
}

/** Four bouncing bars shown while a preview plays. */
export function Equalizer({ className, bars = 4 }: { className?: string; bars?: number }) {
  return (
    <span className={cn('inline-flex h-3.5 items-end gap-[2px]', className)} aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className="h-full w-[3px] origin-bottom animate-equalizer rounded-[1px] bg-current"
          style={{ animationDelay: `${i * -0.21}s`, animationDuration: `${0.7 + (i % 3) * 0.18}s` }}
        />
      ))}
    </span>
  )
}

function Waveform({ seed, progress, active, className }: { seed: string; progress: number; active: boolean; className?: string }) {
  const bars = useWaveform(seed)
  return (
    <div className={cn('flex h-full items-center gap-[2px]', className)} aria-hidden="true">
      {bars.map((h, i) => {
        const played = active && i / bars.length <= progress
        return (
          <span
            key={i}
            className={cn('w-full rounded-full transition-colors duration-150', played ? 'bg-accent' : active ? 'bg-text/40' : 'bg-text/25 group-hover:bg-text/40')}
            style={{ height: `${Math.round(h * 100)}%` }}
          />
        )
      })}
    </div>
  )
}

function useCardActions(a: AssetCardData, ownedProp?: boolean, isMineProp?: boolean) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const status = useAuthStore((s) => s.status)
  const ownedIds = useOwnedAssetIds()
  const cart = useCart()
  const wishlist = useToggleWishlist()
  const addToCart = useAddToCart()
  const claim = useClaimAsset()
  const setCartOpen = useUiStore((s) => s.setCartDrawerOpen)

  const owned = ownedProp ?? ownedIds.has(a._id)
  const isMine = isMineProp ?? (!!user && a.creator._id === user._id)
  const inCart = !!cart.data?.items.some((i) => i.asset._id === a._id)
  const inWishlist = !!user?.wishlist.includes(a._id)
  const authed = status === 'authed'
  const loginNext = () => navigate(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`)

  const toggleWishlist = () => {
    if (!authed) return loginNext()
    wishlist.mutate(
      { assetId: a._id, inWishlist },
      {
        onSuccess: () => toast.success(inWishlist ? 'Removed from wishlist' : 'Saved to wishlist'),
        onError: (err: unknown) => toast.error(isApiClientError(err) ? err.message : 'Could not update wishlist'),
      },
    )
  }

  const primary = () => {
    if (!authed) return loginNext()
    if (inCart) return setCartOpen(true)
    if (a.isFree) {
      claim.mutate(a._id, {
        onSuccess: () => toast.success('Added to your library'),
        onError: (err: unknown) => toast.error(isApiClientError(err) ? err.message : 'Could not claim asset'),
      })
    } else addToCart.mutate({ assetId: a._id, card: a })
  }

  return {
    owned,
    isMine,
    inCart,
    inWishlist,
    toggleWishlist,
    primary,
    busy: addToCart.isPending || claim.isPending,
    canAct: !owned && !isMine,
  }
}

function AssetCardImpl({ asset: a, variant = 'default', owned: ownedProp, isMine: isMineProp, className, footer }: AssetCardProps) {
  const navigate = useNavigate()
  const track = usePlayerStore((s) => s.track)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const progress = usePlayerStore((s) => (s.track?.assetId === a._id && s.duration ? s.progress / s.duration : 0))
  const play = usePlayerStore((s) => s.play)
  const actions = useCardActions(a, ownedProp, isMineProp)
  const [imgLoaded, setImgLoaded] = useState(false)

  const isAudio = a.mediaKind === 'audio'
  const isCurrent = track?.assetId === a._id
  const thisPlaying = isCurrent && isPlaying
  const cat = CATEGORY_MAP.get(a.category)
  const CatIcon = cat?.icon ?? Sparkles
  const href = `/asset/${a.slug}`

  const go = () => navigate(href)
  const onKey = (e: KeyboardEvent) => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter') { e.preventDefault(); go() }
  }
  const stop = (fn: () => void) => (e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); fn() }

  const playPreview = stop(() => {
    if (!a.previewAudioUrl) return toast.error('No preview for this asset')
    play(toTrack(a))
  })

  const primaryLabel = actions.inCart ? 'In cart' : a.isFree ? 'Get free' : 'Add to cart'
  const PrimaryIcon = actions.inCart ? Check : a.isFree ? Download : ShoppingCart

  // ---------------- thumbnail ----------------
  const image = (
    <>
      {!imgLoaded && <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-surface-2 via-surface-3 to-surface-2 bg-[length:400px_100%]" />}
      <img
        src={mediaUrl(a.thumbnail.url)}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        onLoad={() => setImgLoaded(true)}
        className={cn(
          'pixelated h-full w-full object-cover transition-[transform,opacity,filter] duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]',
          imgLoaded ? 'opacity-100' : 'opacity-0',
          isAudio && 'scale-105 opacity-60 blur-[1px] saturate-150 group-hover:scale-110',
        )}
      />
    </>
  )

  const audioLayer = isAudio && (
    <>
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-primary/20" />
      <button
        type="button"
        onClick={playPreview}
        aria-label={thisPlaying ? `Pause preview of ${a.title}` : `Play preview of ${a.title}`}
        aria-pressed={thisPlaying}
        className={cn(
          'absolute left-1/2 top-[42%] z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-bg transition-all duration-200',
          'bg-text shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:scale-110 active:scale-95',
          variant === 'compact' ? 'h-11 w-11' : 'h-14 w-14',
          thisPlaying && 'bg-accent shadow-[0_0_0_6px_rgba(34,211,238,0.18),0_8px_30px_rgba(34,211,238,0.35)]',
        )}
      >
        {thisPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
      </button>
      <div className={cn('absolute inset-x-3 bottom-3', variant === 'compact' ? 'h-6' : 'h-9')}>
        <Waveform seed={a._id} progress={progress} active={isCurrent} />
      </div>
      {thisPlaying && <Equalizer className="absolute bottom-[3.25rem] right-3 text-accent" />}
    </>
  )

  const topBadges = (
    <div className="pointer-events-none absolute inset-x-2 top-2 z-10 flex items-start justify-between gap-2">
      <span className="inline-flex min-w-0 items-center gap-1 rounded-md bg-bg/75 px-1.5 py-1 text-[10px] font-medium text-text/90 ring-1 ring-white/5 backdrop-blur-md">
        <CatIcon className="h-3 w-3 shrink-0 text-accent" />
        <span className="truncate">{cat?.label ?? a.category}</span>
      </span>
      <span className="shrink-0 rounded-md bg-bg/75 px-1.5 py-1 leading-none ring-1 ring-white/5 backdrop-blur-md">
        <PriceTag price={a.price} size="sm" />
      </span>
    </div>
  )

  const featured = a.isFeatured && (
    <span className="pointer-events-none absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 rounded-[4px] bg-warning px-1.5 py-1 font-pixel text-[7px] leading-none text-bg shadow-pixel-sm">
      <Star className="h-2 w-2 fill-current" /> FEATURED
    </span>
  )

  const ownedBadge = (actions.owned || actions.isMine) && (
    <span className="pointer-events-none absolute bottom-2 right-2 z-10 inline-flex items-center gap-1 rounded-md bg-success/90 px-1.5 py-1 text-[10px] font-semibold leading-none text-bg">
      <Check className="h-3 w-3" /> {actions.isMine ? 'Yours' : 'Owned'}
    </span>
  )

  const heartBtn = (size: 'sm' | 'md') => (
    <button
      type="button"
      onClick={stop(actions.toggleWishlist)}
      aria-label={actions.inWishlist ? `Remove ${a.title} from wishlist` : `Save ${a.title} to wishlist`}
      aria-pressed={actions.inWishlist}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-control border backdrop-blur-md transition-all duration-150 active:scale-90',
        size === 'sm' ? 'h-8 w-8' : 'h-9 w-9',
        actions.inWishlist ? 'border-pink/40 bg-pink/15 text-pink' : 'border-white/10 bg-bg/80 text-text hover:border-pink/50 hover:text-pink',
      )}
    >
      <Heart className={cn('h-4 w-4 transition-transform', actions.inWishlist && 'scale-110 fill-current')} />
    </button>
  )

  const quickActions = actions.canAct && variant !== 'list' && (
    <div
      className={cn(
        'absolute inset-x-0 bottom-0 z-20 flex gap-2 p-2.5 transition-all duration-[250ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
        'translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100',
        '[@media(hover:none)]:hidden',
        isAudio && 'hidden',
      )}
    >
      {heartBtn('md')}
      <button
        type="button"
        onClick={stop(actions.primary)}
        disabled={actions.busy}
        className={cn(
          'flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-control px-2 text-xs font-semibold shadow-[0_4px_20px_rgba(0,0,0,0.4)] transition-colors disabled:opacity-60',
          actions.inCart ? 'bg-surface-3 text-text ring-1 ring-border-strong' : a.isFree ? 'bg-success text-bg hover:brightness-110' : 'bg-primary text-white hover:bg-primary-hover',
        )}
      >
        <PrimaryIcon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{primaryLabel}</span>
      </button>
    </div>
  )

  const rating = variant === 'default' && a.stats.ratingCount ? (
    <span className="inline-flex items-center gap-1 text-[11px]" aria-label={`Rated ${a.stats.ratingAvg.toFixed(1)} from ${a.stats.ratingCount} reviews`}>
      <RatingStars value={Math.round(a.stats.ratingAvg)} size={11} className="-ml-0.5 gap-0 [&_button]:p-[1px]" />
      <span className="font-mono text-subtle">({compactNumber(a.stats.ratingCount)})</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] text-muted">
      <Star className={cn('h-3 w-3', a.stats.ratingCount ? 'fill-warning text-warning' : 'text-subtle')} />
      {a.stats.ratingCount ? (
        <>
          <span className="font-mono font-medium text-text">{a.stats.ratingAvg.toFixed(1)}</span>
          <span className="font-mono text-subtle">({compactNumber(a.stats.ratingCount)})</span>
        </>
      ) : (
        <span className="text-subtle">New</span>
      )}
    </span>
  )

  const creatorLink = (
    <Link
      to={`/u/${a.creator.username}`}
      onClick={(e) => e.stopPropagation()}
      className="relative z-10 flex min-w-0 items-center gap-1.5 rounded text-xs text-muted transition-colors hover:text-text"
    >
      <Avatar src={a.creator.avatarUrl} name={a.creator.name} username={a.creator.username} size={18} />
      <span className="truncate">{a.creator.name}</span>
    </Link>
  )

  // ---------------- list variant ----------------
  if (variant === 'list') {
    return (
      <article
        className={cn(
          'group relative flex items-center gap-4 rounded-card border border-border bg-surface p-2.5 pr-4 transition-all duration-200 hover:border-primary/40 hover:bg-surface-2/50 hover:shadow-glow',
          className,
        )}
      >
        <Link to={href} className="relative block h-20 w-20 shrink-0 overflow-hidden rounded-control bg-surface-2 sm:h-24 sm:w-24" tabIndex={-1} aria-hidden="true">
          {image}
          {isAudio && (
            <button
              type="button"
              onClick={playPreview}
              aria-label={thisPlaying ? `Pause preview of ${a.title}` : `Play preview of ${a.title}`}
              className="absolute inset-0 flex items-center justify-center bg-bg/40 text-text transition-colors hover:bg-bg/20"
            >
              {thisPlaying ? <Equalizer className="text-accent" /> : <Play className="h-6 w-6 fill-current" />}
            </button>
          )}
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-center gap-2 text-[11px] text-subtle">
            <CatIcon className="h-3 w-3 text-accent" /> {cat?.label}
          </div>
          <Link to={href} className="truncate font-display text-[15px] font-semibold text-text transition-colors after:absolute after:inset-0 hover:text-primary focus-visible:outline-none">
            {a.title}
          </Link>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {creatorLink}
            {rating}
          </div>
          {footer}
        </div>
        <div className="relative z-10 hidden shrink-0 sm:block">
          <PriceTag price={a.price} />
        </div>
      </article>
    )
  }

  // ---------------- default / compact ----------------
  const compact = variant === 'compact'
  return (
    <article
      tabIndex={0}
      onClick={go}
      onKeyDown={onKey}
      aria-label={`${a.title} by ${a.creator.name}`}
      className={cn(
        'group relative flex cursor-pointer flex-col overflow-hidden rounded-card border border-border bg-surface transition-[transform,box-shadow,border-color] duration-[250ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
        'hover:-translate-y-1 hover:border-primary/40 hover:shadow-glow focus-visible:-translate-y-1 focus-visible:border-primary/60 focus-visible:shadow-glow',
                className,
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-surface-2">
        {image}
        {audioLayer}
        {topBadges}
        {featured}
        {ownedBadge}
        {quickActions}
      </div>
      <div className={cn('flex flex-1 flex-col', compact ? 'gap-1.5 p-2.5' : 'gap-2 p-3')}>
        <h3 className={cn('font-display font-semibold leading-snug text-text transition-colors group-hover:text-primary', compact ? 'line-clamp-1 text-[13px]' : 'line-clamp-2 min-h-[2.6em] text-sm')}>
          <Link to={href} onClick={(e) => e.stopPropagation()} tabIndex={-1} className="focus-visible:outline-none">
            {a.title}
          </Link>
        </h3>
        {creatorLink}
        <div className="mt-auto flex items-center justify-between gap-2 pt-0.5">
          {rating}
          <span className="font-mono text-[10px] text-subtle">{compactNumber(a.stats.sales)} sold</span>
        </div>
        {footer}
      </div>
      {isAudio && actions.canAct && (
        <div className="absolute right-2 top-10 z-20 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100">
          {heartBtn('sm')}
        </div>
      )}
    </article>
  )
}

export const AssetCard = memo(AssetCardImpl)

export function AssetCardSkeleton({ variant = 'default', className }: { variant?: AssetCardVariant; className?: string }) {
  if (variant === 'list') {
    return (
      <div className={cn('flex items-center gap-4 rounded-card border border-border bg-surface p-2.5', className)}>
        <div className="h-20 w-20 shrink-0 animate-shimmer rounded-control bg-gradient-to-r from-surface-2 via-surface-3 to-surface-2 bg-[length:400px_100%] sm:h-24 sm:w-24" />
        <div className="flex flex-1 flex-col gap-2">
          <div className="h-3 w-16 rounded bg-surface-3" />
          <div className="h-4 w-1/2 rounded bg-surface-3" />
          <div className="h-3 w-1/3 rounded bg-surface-3" />
        </div>
      </div>
    )
  }
  return (
    <div className={cn('overflow-hidden rounded-card border border-border bg-surface', className)} aria-hidden="true">
      <div className="aspect-square w-full animate-shimmer bg-gradient-to-r from-surface-2 via-surface-3 to-surface-2 bg-[length:400px_100%]" />
      <div className={cn('flex flex-col gap-2', variant === 'compact' ? 'p-2.5' : 'p-3')}>
        <div className="h-4 w-4/5 rounded bg-surface-3" />
        {variant !== 'compact' && <div className="h-4 w-1/2 rounded bg-surface-3" />}
        <div className="flex items-center gap-1.5">
          <div className="h-[18px] w-[18px] rounded-full bg-surface-3" />
          <div className="h-3 w-20 rounded bg-surface-3" />
        </div>
        <div className="flex justify-between">
          <div className="h-3 w-12 rounded bg-surface-3" />
          <div className="h-3 w-10 rounded bg-surface-3" />
        </div>
      </div>
    </div>
  )
}

export function AssetGrid({
  children,
  className,
  density = 'comfortable',
}: {
  children: ReactNode
  className?: string
  density?: 'comfortable' | 'compact'
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5',
        density === 'compact' && 'gap-2.5 sm:grid-cols-4 sm:gap-3 lg:grid-cols-5 xl:grid-cols-6',
        className,
      )}
    >
      {children}
    </div>
  )
}
