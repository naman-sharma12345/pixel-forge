import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Page } from '@/components/layout'
import { Button, PixelButton } from '@/components/ui'
import { useAssetHome, useAssetCategories } from '@/hooks/useAssets'
import { CATEGORY_MAP } from '@/lib/constants'
import { mediaUrl } from '@/lib/media'
import { formatPrice } from '@/lib/format'
import type { AssetCard } from '@/types/api'

const EASE = [0.22, 1, 0.36, 1] as const

function AssetRow({ title, items, seeAll }: { title: string; items: AssetCard[]; seeAll?: string }) {
  if (!items.length) return null
  return (
    <section className="mt-12">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-text">{title}</h2>
        {seeAll && <Link to={seeAll} className="text-sm text-primary hover:text-accent">See all →</Link>}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.slice(0, 8).map((a, i) => (
          <motion.div
            key={a._id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: EASE, delay: Math.min(i * 0.04, 0.3) }}
          >
            <Link
              to={`/asset/${a.slug}`}
              className="group block overflow-hidden rounded-card border border-border bg-surface transition-all duration-200 hover:border-primary/50 hover:shadow-glow"
            >
              <div className="relative aspect-square overflow-hidden bg-surface-2">
                <img src={mediaUrl(a.thumbnail.url)} alt={a.title} loading="lazy" className="pixelated h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                {a.isFree && <span className="absolute left-2 top-2 rounded bg-success/90 px-1.5 py-0.5 font-pixel text-[8px] text-bg">FREE</span>}
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-medium text-text group-hover:text-primary">{a.title}</p>
                <p className="mt-0.5 truncate text-xs text-muted">{a.creator.name}</p>
                <p className="mt-1.5 font-mono text-xs font-semibold text-text">{formatPrice(a.price)}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const home = useAssetHome()
  const cats = useAssetCategories()
  const data = home.data

  return (
    <Page title="Pixel Forge — Game Assets Marketplace" description="Buy and sell sprites, tilesets, sound effects, music and more.">
      {/* hero */}
      <section className="noise relative overflow-hidden">
        <div className="dot-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_70%_80%_at_50%_20%,black,transparent)]" />
        <div className="relative mx-auto max-w-[1280px] px-4 pb-16 pt-16 sm:px-6 sm:pt-24 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="mx-auto flex max-w-2xl flex-col items-center text-center"
          >
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary-soft px-3 py-1 font-pixel text-[9px] text-primary">
              <Sparkles className="h-3 w-3" /> INDIE GAME ASSETS
            </span>
            <h1 className="font-display text-4xl font-bold leading-tight text-text sm:text-5xl">
              Assets worth <span className="text-gradient">forging</span> your next game
            </h1>
            <p className="mt-4 max-w-lg text-base text-muted">
              Premium sprites, tilesets, characters, UI kits and audio — bought and sold by indie devs, priced in rupees.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <PixelButton size="lg" onClick={() => navigate('/explore')}>
                Start exploring <ArrowRight className="h-4 w-4" />
              </PixelButton>
              <Button variant="outline" size="lg" onClick={() => navigate('/register')}>
                Become a creator
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        {/* categories */}
        <section>
          <h2 className="mb-4 font-display text-lg font-semibold text-text">Browse categories</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {(cats.data ?? []).map((c) => {
              const info = CATEGORY_MAP.get(c.key)
              const Icon = info?.icon ?? Sparkles
              return (
                <Link
                  key={c.key}
                  to={`/category/${c.key}`}
                  className="group flex items-center gap-3 rounded-card border border-border bg-surface p-3 transition-all duration-200 hover:border-primary/50 hover:shadow-glow"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-control bg-primary-soft text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-text group-hover:text-primary">{c.label}</span>
                    <span className="block font-mono text-xs text-subtle">{c.count} assets</span>
                  </span>
                </Link>
              )
            })}
          </div>
        </section>

        {home.isLoading ? (
          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-card bg-surface-2" />
            ))}
          </div>
        ) : data ? (
          <>
            <AssetRow title="Featured this week" items={data.featured} seeAll="/explore" />
            <AssetRow title="Trending now" items={data.trending} seeAll="/explore?sort=popular" />
            <AssetRow title="Fresh from the forge" items={data.newest} seeAll="/explore?sort=newest" />
            <AssetRow title="Free to claim" items={data.freebies} seeAll="/explore?free=true" />
            <AssetRow title="Sound & music" items={data.audio} seeAll="/explore?category=music" />
          </>
        ) : null}
      </div>
    </Page>
  )
}
