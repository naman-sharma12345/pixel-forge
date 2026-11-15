import { useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { Check, Download, FileArchive, Heart, Link2, Pencil, ShieldCheck, ShoppingCart, Sparkles, Star, Zap } from 'lucide-react'
import { isApiClientError } from '@/api'
import { useCheckout } from '@/features/checkout/useCheckout'
import { Avatar, Button, PixelButton, PriceTag, RatingStars } from '@/components/ui'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useAddToCart, useCart, useClaimAsset, useDownloadAsset } from '@/hooks/useCommerce'
import { useToggleWishlist } from '@/hooks/useAuth'
import { CATEGORY_MAP, LICENSE_MAP } from '@/lib/constants'
import { compactNumber, formatBytes, formatDuration } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { AssetDetail, AssetMeta } from '@/types/api'

function specRows(meta: AssetMeta): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = []
  if (meta.resolution) rows.push({ label: 'Resolution', value: String(meta.resolution) })
  if (meta.frames) rows.push({ label: 'Frames', value: String(meta.frames) })
  if (meta.durationSec) rows.push({ label: 'Duration', value: formatDuration(Number(meta.durationSec)) })
  if (meta.bpm) rows.push({ label: 'Tempo', value: `${meta.bpm} BPM` })
  if (meta.loopable !== undefined && meta.loopable !== null) rows.push({ label: 'Loopable', value: meta.loopable ? 'Yes' : 'No' })
  if (meta.sampleRate) rows.push({ label: 'Sample rate', value: `${(Number(meta.sampleRate) / 1000).toFixed(1)} kHz` })
  return rows
}

function Box({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-surface p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  )
}

export function PurchasePanel({ asset, onShowReviews }: { asset: AssetDetail; onShowReviews?: () => void }) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const status = useAuthStore((s) => s.status)
  const setCartOpen = useUiStore((s) => s.setCartDrawerOpen)
  const { data: cart } = useCart()
  const addToCart = useAddToCart()
  const claim = useClaimAsset()
  const wishlist = useToggleWishlist()
  const { startCheckout, modal: checkoutModal, isStarting } = useCheckout()
  const download = useDownloadAsset()

  const inCart = !!cart?.items.some((i) => i.asset._id === asset._id)
  const inWishlist = !!user?.wishlist.includes(asset._id)
  // keep the visible wishlist count in step with optimistic toggles
  const initialWish = useRef(inWishlist)
  const wishCount = Math.max(0, asset.stats.wishlistCount + (inWishlist === initialWish.current ? 0 : inWishlist ? 1 : -1))
  const cat = CATEGORY_MAP.get(asset.category)
  const CatIcon = cat?.icon ?? Sparkles
  const license = LICENSE_MAP.get(asset.license)
  const specs = specRows(asset.meta)

  const requireAuth = () => {
    if (status === 'authed') return true
    navigate(`/login?next=${encodeURIComponent(window.location.pathname)}`)
    return false
  }

  const doDownload = () => {
    if (!requireAuth()) return
    download.mutate(asset._id)
  }
  const downloading = download.isPending

  const doClaim = () => {
    if (!requireAuth()) return
    claim.mutate(asset._id, {
      onSuccess: () => toast.success('It’s yours! Added to your library.'),
      onError: (e) => toast.error(isApiClientError(e) ? e.message : 'Could not claim this asset'),
    })
  }

  const doAdd = () => {
    if (!requireAuth()) return
    if (inCart) return setCartOpen(true)
    addToCart.mutate({ assetId: asset._id, card: asset })
  }

  const doBuyNow = async () => {
    if (!requireAuth()) return
    if (!inCart) {
      try {
        await addToCart.mutateAsync({ assetId: asset._id, card: asset })
      } catch {
        return
      }
    }
    void startCheckout([asset._id])
  }

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard')
    } catch {
      toast.error('Could not copy the link')
    }
  }

  const toggleWish = () => {
    if (!requireAuth()) return
    wishlist.mutate(
      { assetId: asset._id, inWishlist },
      {
        onSuccess: () => toast.success(inWishlist ? 'Removed from wishlist' : 'Saved to wishlist'),
        onError: (e) => toast.error(isApiClientError(e) ? e.message : 'Could not update wishlist'),
      },
    )
  }

  // ----- primary action by state -----
  let primary: React.ReactNode
  if (asset.isMine) {
    primary = (
      <PixelButton size="lg" tone="accent" className="w-full" onClick={() => navigate(`/studio/edit/${asset._id}`)}>
        <Pencil className="h-4 w-4" /> Edit in Studio
      </PixelButton>
    )
  } else if (asset.isOwned) {
    primary = (
      <>
        <PixelButton size="lg" tone="success" className="w-full" loading={downloading} onClick={doDownload}>
          {!downloading && <Download className="h-4 w-4" />} {downloading ? 'Preparing…' : 'Download'}
        </PixelButton>
        <p className="flex items-center justify-center gap-1.5 text-xs text-success">
          <Check className="h-3.5 w-3.5" /> In your library · <Link to="/library" className="underline-offset-2 hover:underline">Open library</Link>
        </p>
      </>
    )
  } else if (asset.isFree) {
    primary = (
      <PixelButton size="lg" tone="success" className="w-full" loading={claim.isPending} onClick={doClaim}>
        Get it free
      </PixelButton>
    )
  } else {
    primary = (
      <>
        <PixelButton size="lg" className="w-full" loading={isStarting} onClick={doBuyNow}>
          <Zap className="h-4 w-4" /> Buy now
        </PixelButton>
        <Button
          variant="secondary"
          size="lg"
          className={cn('w-full', inCart && 'border-success/30 text-success')}
          loading={addToCart.isPending}
          onClick={doAdd}
          leftIcon={inCart ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
        >
          {inCart ? 'In cart · View cart' : 'Add to cart'}
        </Button>
      </>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-panel border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/explore?category=${asset.category}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary-soft px-2 py-1 text-xs font-medium text-text transition-colors hover:bg-primary/25"
          >
            <CatIcon className="h-3.5 w-3.5 text-primary" /> {cat?.label}
          </Link>
          {asset.isFeatured && (
            <span className="inline-flex items-center gap-1 rounded-md bg-warning/15 px-2 py-1 font-pixel text-[8px] text-warning">
              <Star className="h-2.5 w-2.5 fill-current" /> FEATURED
            </span>
          )}
        </div>

        <h1 className="mt-3 font-display text-2xl font-bold leading-tight tracking-tight text-text sm:text-[1.75rem]">{asset.title}</h1>

        <div className="mt-4 flex items-center gap-3">
          <Link to={`/u/${asset.creator.username}`} className="shrink-0">
            <Avatar src={asset.creator.avatarUrl} name={asset.creator.name} username={asset.creator.username} size={40} />
          </Link>
          <div className="min-w-0 flex-1">
            <Link to={`/u/${asset.creator.username}`} className="block truncate text-sm font-semibold text-text hover:text-primary">
              {asset.creator.name}
            </Link>
            <span className="block truncate font-mono text-xs text-subtle">@{asset.creator.username}</span>
          </div>
          <Link to={`/u/${asset.creator.username}`} className="shrink-0 rounded-control border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-border-strong hover:text-text">
            View profile
          </Link>
        </div>

        <button
          type="button"
          onClick={onShowReviews}
          className="mt-4 flex items-center gap-2 rounded-control text-left text-sm transition-colors hover:text-text"
          aria-label={`Rated ${asset.stats.ratingAvg.toFixed(1)} out of 5 from ${asset.stats.ratingCount} reviews. Show reviews`}
        >
          <RatingStars value={Math.round(asset.stats.ratingAvg)} size={15} className="gap-0" />
          {asset.stats.ratingCount ? (
            <span className="text-muted">
              <span className="font-mono font-semibold text-text">{asset.stats.ratingAvg.toFixed(1)}</span> · {asset.stats.ratingCount} review{asset.stats.ratingCount === 1 ? '' : 's'}
            </span>
          ) : (
            <span className="text-muted">No reviews yet</span>
          )}
          <span className="text-subtle">·</span>
          <span className="font-mono text-xs text-subtle">{compactNumber(asset.stats.sales)} sold</span>
        </button>

        <div className="my-5 h-px bg-border" />

        <div className="flex items-end justify-between gap-3">
          <div>
            <PriceTag price={asset.price} size="lg" className={asset.isFree ? 'text-base' : 'text-3xl tracking-tight'} />
            <p className="mt-1 text-xs text-subtle">{asset.isFree ? 'Free forever · no card needed' : 'One-time payment · lifetime updates'}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2.5">{primary}</div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={toggleWish}
            aria-pressed={inWishlist}
            className={cn(
              'flex h-10 items-center justify-center gap-2 rounded-control border text-sm font-medium transition-colors',
              inWishlist ? 'border-pink/40 bg-pink/10 text-pink' : 'border-border text-muted hover:border-pink/40 hover:text-pink',
            )}
          >
            <Heart className={cn('h-4 w-4 transition-transform', inWishlist && 'scale-110 fill-current')} />
            {inWishlist ? 'Saved' : 'Wishlist'}
            <span className="font-mono text-xs opacity-70">{compactNumber(wishCount)}</span>
          </button>
          <button
            type="button"
            onClick={share}
            className="flex h-10 items-center justify-center gap-2 rounded-control border border-border text-sm font-medium text-muted transition-colors hover:border-border-strong hover:text-text"
          >
            <Link2 className="h-4 w-4" /> Copy link
          </button>
        </div>

        {!asset.isOwned && !asset.isMine && (
          <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-subtle">
            <ShieldCheck className="h-3.5 w-3.5" /> Demo checkout · no real money is charged
          </p>
        )}
      </div>

      {license && (
        <Box icon={<ShieldCheck className="h-4 w-4 text-primary" />} title={license.label.split(' - ')[0] + ' license'}>
          <p className="-mt-1.5 mb-3 text-xs text-subtle">{license.label.split(' - ')[1]}</p>
          <ul className="space-y-2">
            {license.bullets.map((b) => (
              <li key={b} className="flex gap-2.5 text-sm leading-snug text-muted">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /> {b}
              </li>
            ))}
          </ul>
        </Box>
      )}

      <Box icon={<FileArchive className="h-4 w-4 text-accent" />} title="What you get">
        <dl className="divide-y divide-border/70 text-sm">
          {[
            ['Format', asset.fileInfo.format.toUpperCase()],
            ['Size', formatBytes(asset.fileInfo.bytes)],
            ['File', asset.fileInfo.originalName],
            ...specs.map((s) => [s.label, s.value]),
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 py-2">
              <dt className="text-muted">{k}</dt>
              <dd className="min-w-0 truncate font-mono text-xs text-text" title={v}>{v}</dd>
            </div>
          ))}
        </dl>
        {asset.fileFormats.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {asset.fileFormats.map((f) => (
              <span key={f} className="rounded-md border border-border bg-surface-2 px-2 py-0.5 font-mono text-[11px] uppercase text-muted">.{f}</span>
            ))}
          </div>
        )}
      </Box>

      {asset.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {asset.tags.map((t) => (
            <Link
              key={t}
              to={`/explore?tags=${encodeURIComponent(t)}`}
              className="rounded-full border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-primary/50 hover:text-text"
            >
              #{t}
            </Link>
          ))}
        </div>
      )}
      {checkoutModal}
    </div>
  )
}
