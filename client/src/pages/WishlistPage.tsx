import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { HeartOff, Search } from 'lucide-react'
import { Page } from '@/components/layout'
import { AssetCard, AssetCardSkeleton, AssetGrid } from '@/components/asset/AssetCard'
import { Button, EmptyState, Input } from '@/components/ui'
import { useToggleWishlist, useWishlist } from '@/hooks/useAuth'
import { useAuthStore } from '@/stores/auth'
import type { AssetCard as AssetCardData } from '@/types/api'

function RemoveButton({ asset }: { asset: AssetCardData }) {
  const toggle = useToggleWishlist()
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggle.mutate(
          { assetId: asset._id, inWishlist: true },
          {
            onSuccess: () =>
              toast((t) => (
                <span className="flex items-center gap-3">
                  Removed “{asset.title}”
                  <button
                    type="button"
                    className="font-semibold text-primary"
                    onClick={() => {
                      toast.dismiss(t.id)
                      toggle.mutate({ assetId: asset._id, inWishlist: false })
                    }}
                  >
                    Undo
                  </button>
                </span>
              )),
          },
        )
      }}
      className="relative z-10 mt-1 flex items-center justify-center gap-1.5 rounded-control border border-border py-1.5 text-xs font-medium text-muted opacity-0 transition-all hover:border-danger/40 hover:bg-danger/10 hover:text-danger focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
    >
      <HeartOff className="h-3.5 w-3.5" /> Remove
    </button>
  )
}

export default function WishlistPage() {
  const { data, isLoading, isError, refetch, isRefetching } = useWishlist()
  const wishIds = useAuthStore((s) => s.user?.wishlist)
  const [q, setQ] = useState('')

  // hide items the user just un-hearted, before the refetch lands
  const saved = (data ?? []).filter((a) => !wishIds || wishIds.includes(a._id))
  const needle = q.trim().toLowerCase()
  const items = saved.filter((a) => !needle || a.title.toLowerCase().includes(needle) || a.tags.some((t) => t.includes(needle)))
  const total = saved.length
  const value = saved.reduce((s, a) => s + a.price, 0)

  return (
    <Page title="Wishlist" description="Assets you bookmarked for later.">
      <div className="mx-auto max-w-[1280px] px-4 pb-10 pt-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-pixel text-[8px] uppercase text-pink">Saved for later</p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-text">Wishlist</h1>
            {!isLoading && (
              <p className="mt-1.5 text-sm text-muted">
                <span className="font-mono text-text">{total}</span> asset{total === 1 ? '' : 's'}
                {value > 0 && <> · worth <span className="font-mono text-text">₹{value.toLocaleString('en-IN')}</span></>}
              </p>
            )}
          </div>
          {total > 4 && (
            <div className="w-full sm:w-64">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by title or tag…" leftIcon={<Search className="h-4 w-4" />} aria-label="Filter wishlist" type="search" />
            </div>
          )}
        </header>

        {isLoading ? (
          <AssetGrid>{Array.from({ length: 10 }).map((_, i) => <AssetCardSkeleton key={i} />)}</AssetGrid>
        ) : isError ? (
          <EmptyState art="skull" title="We couldn’t load your wishlist" text="Your saved items are safe. Give it another try." action={<Button loading={isRefetching} onClick={() => refetch()}>Try again</Button>} />
        ) : total === 0 ? (
          <EmptyState
            art="heart"
            title="Nothing saved yet"
            text="Tap the heart on any asset to keep it here. Handy for comparing packs before you buy."
            action={
              <>
                <Link to="/explore"><Button>Explore assets</Button></Link>
                <Link to="/explore?sort=popular"><Button variant="secondary">See what’s trending</Button></Link>
              </>
            }
          />
        ) : items.length === 0 ? (
          <EmptyState compact art="search" title={`Nothing matches “${q}”`} text="Try another word." action={<Button variant="secondary" onClick={() => setQ('')}>Clear filter</Button>} />
        ) : (
          <AssetGrid>
            {items.map((a) => <AssetCard key={a._id} asset={a} footer={<RemoveButton asset={a} />} />)}
          </AssetGrid>
        )}
      </div>
    </Page>
  )
}
