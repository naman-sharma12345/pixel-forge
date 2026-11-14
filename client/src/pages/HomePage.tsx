import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { ArrowRight, AudioLines, Flame, Gift, Headphones, Search, Sparkles, Star, TrendingUp, Zap } from 'lucide-react'
import { Page } from '@/components/layout'
import { Reveal } from '@/components/Reveal'
import { PixelField } from '@/components/home/PixelField'
import { AssetCard, AssetCardSkeleton } from '@/components/asset/AssetCard'
import { AssetRail } from '@/components/asset/AssetRail'
import { Avatar, Kbd, PixelButton } from '@/components/ui'
import { useAssetHome, useAssetCategories, useAssetTags, useAssetList } from '@/hooks/useAssets'
import { useInViewOnce } from '@/hooks/useInView'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { CATEGORY_MAP } from '@/lib/constants'
import { compactNumber } from '@/lib/format'
import { generateIllustration, generateSpriteThumb, type IllustrationKind } from '@/lib/pixelArt'
import { cn } from '@/lib/cn'
import type { AssetCard as AssetCardData, Category } from '@/types/api'

const EASE = [0.22, 1, 0.36, 1] as const

/** One accent per category, used for the icon chip, hover glow and border. */
const CAT_ACCENT: Record<Category, string> = {
  sprites: '#8B5CF6',
  tilesets: '#A3E635',
  characters: '#F472B6',
  ui: '#FBBF24',
  backgrounds: '#22D3EE',
  vfx: '#FB7185',
  fonts: '#C4B5FD',
  '3d': '#67E8F9',
  sfx: '#BEF264',
  music: '#F9A8D4',
}

// ---------------------------------------------------------------------------
// hero
// ---------------------------------------------------------------------------

function HeroSearch() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const tags = useAssetTags()
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const query = q.trim()
    navigate(query ? `/explore?q=${encodeURIComponent(query)}` : '/explore')
  }
  return (
    <div className="mt-8 max-w-xl">
      <form onSubmit={submit} role="search" className="group relative">
        <div className="absolute -inset-px rounded-[14px] bg-gradient-to-r from-primary/60 via-accent/40 to-pink/50 opacity-40 blur-[2px] transition-opacity duration-200 group-focus-within:opacity-100" />
        <div className="relative flex h-14 items-center gap-3 rounded-[13px] border border-border-strong bg-surface/95 pl-4 pr-1.5 backdrop-blur">
          <Search className="h-5 w-5 shrink-0 text-subtle transition-colors group-focus-within:text-accent" />
          <label htmlFor="hero-search" className="sr-only">Search assets</label>
          <input
            id="hero-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Try “slime”, “8-bit loop”, “dungeon tiles”…"
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-text placeholder:text-subtle focus:outline-none"
            autoComplete="off"
          />
          <button
            type="submit"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-control bg-text px-4 text-sm font-semibold text-bg transition-colors hover:bg-white"
          >
            Search <Kbd className="hidden border-bg/20 bg-bg/10 text-bg/70 shadow-none sm:inline-flex">↵</Kbd>
          </button>
        </div>
      </form>
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 font-pixel text-[8px] uppercase text-subtle">Popular</span>
        {tags.isLoading
          ? Array.from({ length: 6 }).map((_, i) => <span key={i} className="h-7 w-16 animate-pulse rounded-full bg-surface-2" />)
          : (tags.data ?? []).slice(0, 7).map((t) => (
              <Link
                key={t.tag}
                to={`/explore?tags=${encodeURIComponent(t.tag)}`}
                className="rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted backdrop-blur transition-colors hover:border-primary/50 hover:bg-primary-soft hover:text-text"
              >
                #{t.tag}
              </Link>
            ))}
      </div>
    </div>
  )
}

function FloatingStack({ assets }: { assets: AssetCardData[] }) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 120, damping: 18 })
  const sy = useSpring(my, { stiffness: 120, damping: 18 })
  const rotY = useTransform(sx, [-1, 1], [-10, 10])
  const rotX = useTransform(sy, [-1, 1], [8, -8])

  useEffect(() => {
    if (reduce) return
    const onMove = (e: MouseEvent) => {
      mx.set((e.clientX / window.innerWidth) * 2 - 1)
      my.set((e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [reduce, mx, my])

  const stack = assets.slice(0, 3)
  const poses = [
    { x: -150, y: 40, r: -9, z: -60, s: 0.86 },
    { x: 150, y: 70, r: 8, z: -40, s: 0.88 },
    { x: 0, y: 0, r: -1, z: 40, s: 1 },
  ]
  return (
    <div ref={ref} className="relative hidden h-[500px] lg:block" style={{ perspective: 1200 }} aria-hidden="true">
      <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/25 blur-[90px]" />
      <motion.div className="absolute inset-0" style={{ rotateX: rotX, rotateY: rotY, transformStyle: 'preserve-3d' }}>
        {stack.length === 0
          ? poses.map((p, i) => (
              <div key={i} className="absolute left-1/2 top-12 w-60" style={{ transform: `translateX(-50%) translate3d(${p.x}px, ${p.y}px, ${p.z}px) rotate(${p.r}deg) scale(${p.s})` }}>
                <AssetCardSkeleton />
              </div>
            ))
          : stack.map((a, i) => {
              const p = poses[i]
              return (
                <div
                  key={a._id}
                  className="absolute left-1/2 top-12 w-60"
                  style={{ transform: `translateX(-50%) translate3d(${p.x}px, ${p.y}px, ${p.z}px) rotate(${p.r}deg) scale(${p.s})`, zIndex: i }}
                >
                  <motion.div
                    initial={reduce ? false : { opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.15 + i * 0.12, ease: EASE }}
                  >
                  <motion.div
                    animate={reduce ? undefined : { y: [0, i === 2 ? -10 : -6, 0] }}
                    transition={{ duration: 5 + i * 0.8, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
                    className={cn('rounded-card shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)]', i < 2 && 'opacity-90 saturate-[0.85]')}
                  >
                    <AssetCard asset={a} />
                  </motion.div>
                  </motion.div>
                </div>
              )
            })}
      </motion.div>
      {/* floating chips */}
      <motion.div
        initial={reduce ? false : { opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.7, duration: 0.5, ease: EASE }}
        className="absolute right-0 top-6 flex items-center gap-2 rounded-full border border-border-strong bg-surface/90 px-3 py-1.5 text-xs text-text shadow-card backdrop-blur"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
        </span>
        Live preview in browser
      </motion.div>
      <motion.div
        initial={reduce ? false : { opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.85, duration: 0.5, ease: EASE }}
        className="absolute bottom-10 left-0 flex items-center gap-2 rounded-full border border-border-strong bg-surface/90 px-3 py-1.5 text-xs text-text shadow-card backdrop-blur"
      >
        <Zap className="h-3.5 w-3.5 text-warning" /> Instant download after checkout
      </motion.div>
    </div>
  )
}

function CreatorProof({ assets }: { assets: AssetCardData[] }) {
  const creators = useMemo(() => {
    const seen = new Map<string, AssetCardData['creator']>()
    for (const a of assets) if (!seen.has(a.creator._id)) seen.set(a.creator._id, a.creator)
    return [...seen.values()].slice(0, 5)
  }, [assets])
  if (!creators.length) return null
  return (
    <div className="mt-10 flex items-center gap-3">
      <div className="flex -space-x-2">
        {creators.map((c) => (
          <Avatar key={c._id} src={c.avatarUrl} name={c.name} username={c.username} size={30} className="ring-2 ring-bg" />
        ))}
      </div>
      <div className="text-xs leading-tight">
        <div className="flex items-center gap-0.5 text-warning">
          {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}
        </div>
        <p className="mt-1 text-muted">Made by indie creators, loved by <span className="text-text">thousands of devs</span></p>
      </div>
    </div>
  )
}

function Hero({ home }: { home: ReturnType<typeof useAssetHome> }) {
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const status = useAuthStore((s) => s.status)
  const user = useAuthStore((s) => s.user)
  const setBecomeCreatorOpen = useUiStore((s) => s.setBecomeCreatorOpen)
  const stack = useMemo(() => {
    const d = home.data
    if (!d) return []
    const pool = [...d.featured, ...d.trending].filter((a) => a.mediaKind === 'image')
    return pool.filter((a, i) => pool.findIndex((x) => x._id === a._id) === i)
  }, [home.data])

  const startSelling = () => {
    if (status !== 'authed') navigate('/register?intent=sell')
    else if (user?.role === 'buyer') setBecomeCreatorOpen(true)
    else navigate('/studio')
  }

  const item = (i: number) => ({
    initial: reduce ? false : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay: 0.05 + i * 0.08, ease: EASE },
  })

  return (
    <section className="noise relative -mt-16 overflow-hidden pt-16">
      <PixelField className="absolute inset-0 h-full w-full" />
      <div className="dot-grid absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_60%_70%_at_30%_40%,black,transparent)]" />
      <div className="pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-primary/20 blur-[120px]" />
      <div className="pointer-events-none absolute -right-20 top-20 h-[380px] w-[380px] rounded-full bg-accent/10 blur-[110px]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-bg" />

      <div className="relative mx-auto grid max-w-[1280px] items-center gap-8 px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:px-8 lg:pb-24 lg:pt-20">
        <div>
          <motion.div {...item(0)}>
            <Link
              to="/explore?sort=newest"
              className="group inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary-soft py-1 pl-1 pr-3 text-xs text-text/90 transition-colors hover:border-primary/60"
            >
              <span className="rounded-full bg-primary px-2 py-0.5 font-pixel text-[8px] leading-[1.6] text-white">NEW</span>
              Fresh packs drop every week
              <ArrowRight className="h-3 w-3 text-muted transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
          <motion.h1 {...item(1)} className="mt-6 font-display text-[2.6rem] font-bold leading-[1.02] tracking-[-0.035em] text-text sm:text-6xl lg:text-[4.5rem]">
            Forge your game&apos;s
            <br />
            <span className="text-gradient">look &amp; sound</span>
          </motion.h1>
          <motion.p {...item(2)} className="mt-5 max-w-lg text-base leading-relaxed text-muted sm:text-lg">
            Sprites, tilesets, UI kits, sound effects and music from indie creators. Preview everything in your browser, pay in rupees, download in seconds.
          </motion.p>
          <motion.div {...item(3)}>
            <HeroSearch />
          </motion.div>
          <motion.div {...item(4)} className="mt-8 flex flex-wrap items-center gap-3">
            <PixelButton size="lg" onClick={() => navigate('/explore')}>
              Explore assets <ArrowRight className="h-4 w-4" />
            </PixelButton>
            <button
              type="button"
              onClick={startSelling}
              className="group inline-flex h-14 items-center gap-2 rounded-control px-4 text-sm font-semibold text-text transition-colors hover:bg-surface-2"
            >
              Start selling
              <ArrowRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5" />
            </button>
          </motion.div>
          <motion.div {...item(5)}>
            <CreatorProof assets={stack} />
          </motion.div>
        </div>
        <FloatingStack assets={stack} />
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// stats
// ---------------------------------------------------------------------------

function CountUp({ value, run }: { value: number; run: boolean }) {
  const reduce = useReducedMotion()
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!run) return
    if (reduce) { setN(value); return }
    let raf = 0
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 1100)
      setN(Math.round(value * (1 - Math.pow(1 - p, 4))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, run, reduce])
  return <>{n.toLocaleString('en-IN')}</>
}

function StatsStrip() {
  const cats = useAssetCategories()
  const list = useAssetList({ limit: 100 })
  const [ref, inView] = useInViewOnce<HTMLDivElement>()
  const counts = cats.data ?? []
  const total = counts.reduce((s, c) => s + c.count, 0)
  const sounds = counts.filter((c) => c.key === 'sfx' || c.key === 'music').reduce((s, c) => s + c.count, 0)
  const items = list.data?.items ?? []
  const creators = new Set(items.map((a) => a.creator._id)).size
  const free = list.data ? items.filter((a) => a.isFree).length : 0
  const ready = !!cats.data && !!list.data
  const stats = [
    { label: 'Assets listed', value: total, icon: Sparkles, tone: 'text-primary' },
    { label: 'Indie creators', value: creators, icon: Headphones, tone: 'text-pink' },
    { label: 'Free to download', value: free, icon: Gift, tone: 'text-success' },
    { label: 'Sounds & tracks', value: sounds, icon: AudioLines, tone: 'text-accent' },
  ]
  return (
    <div ref={ref} className="grid grid-cols-2 overflow-hidden rounded-panel border border-border bg-surface/70 backdrop-blur lg:grid-cols-4">
      {stats.map((s, i) => (
        <div
          key={s.label}
          className={cn(
            'relative flex flex-col gap-2 p-5 sm:p-6',
            i % 2 === 1 && 'border-l border-border',
            i > 1 && 'border-t border-border lg:border-t-0',
            i === 2 && 'lg:border-l',
          )}
        >
          <div className="flex items-center gap-2 text-xs font-medium text-muted">
            <s.icon className={cn('h-4 w-4', s.tone)} />
            {s.label}
          </div>
          <div className="font-mono text-3xl font-semibold tracking-tight text-text sm:text-4xl">
            {ready ? <CountUp value={s.value} run={inView} /> : <span className="inline-block h-9 w-20 animate-pulse rounded bg-surface-3" />}
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// categories
// ---------------------------------------------------------------------------

function CategoryGrid() {
  const cats = useAssetCategories()
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cats.isLoading
        ? Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-[132px] animate-pulse rounded-card border border-border bg-surface" />)
        : (cats.data ?? []).map((c, i) => {
            const info = CATEGORY_MAP.get(c.key)
            const Icon = info?.icon ?? Sparkles
            const accent = CAT_ACCENT[c.key] ?? '#8B5CF6'
            const art = generateSpriteThumb(`category-${c.key}`, c.key)
            return (
              <Reveal key={c.key} index={i % 5}>
                <Link
                  to={`/explore?category=${c.key}`}
                  style={{ '--cat': accent } as React.CSSProperties}
                  className={cn(
                    'group relative flex h-[132px] flex-col justify-between overflow-hidden rounded-card border border-border bg-surface p-4 transition-all duration-[250ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
                    'hover:-translate-y-0.5 hover:border-[color:var(--cat)]/50 hover:shadow-[0_0_0_1px_color-mix(in_srgb,var(--cat)_45%,transparent),0_10px_34px_color-mix(in_srgb,var(--cat)_22%,transparent)]',
                  )}
                >
                  <img
                    src={art}
                    alt=""
                    className="pixelated pointer-events-none absolute -bottom-3 -right-3 h-28 w-28 rounded-[10px] object-cover opacity-40 transition-all duration-[400ms] [mask-image:radial-gradient(circle_at_70%_70%,black_30%,transparent_72%)] group-hover:-translate-x-1 group-hover:-translate-y-1 group-hover:scale-105 group-hover:opacity-80"
                  />
                  <span
                    className="relative flex h-9 w-9 items-center justify-center rounded-control ring-1 ring-inset"
                    style={{ color: accent, background: `color-mix(in srgb, ${accent} 14%, transparent)`, ['--tw-ring-color' as string]: `color-mix(in srgb, ${accent} 30%, transparent)` }}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="relative">
                    <span className="block font-display text-[15px] font-semibold text-text">{c.label}</span>
                    <span className="mt-0.5 block font-mono text-xs text-subtle">
                      {c.count} {c.count === 1 ? 'asset' : 'assets'}
                    </span>
                  </span>
                </Link>
              </Reveal>
            )
          })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// how it works + creator band
// ---------------------------------------------------------------------------

const STEPS: { title: string; text: string; art: IllustrationKind }[] = [
  { title: 'Discover', text: 'Search ten categories and filter by price, license, media type and tags. Every filter lives in the URL, so you can share it.', art: 'search' },
  { title: 'Preview', text: 'Zoom sprites to 8x, play sprite sheets frame by frame, and audition every sound before you spend a rupee.', art: 'gem' },
  { title: 'Download', text: 'Check out once and your files land in your library, licensed and ready for Godot, Unity or anything else.', art: 'chest' },
]

function HowItWorks() {
  return (
    <div>
      <Reveal className="mx-auto max-w-2xl text-center">
        <p className="font-pixel text-[9px] uppercase text-accent">How it works</p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">From idea to in-game in three steps</h2>
      </Reveal>
      <div className="relative mt-12 grid gap-4 md:grid-cols-3">
        <div className="pointer-events-none absolute left-[16%] right-[16%] top-[52px] hidden border-t-2 border-dashed border-border-strong md:block" />
        {STEPS.map((s, i) => (
          <Reveal key={s.title} index={i}>
            <div className="relative flex h-full flex-col items-center rounded-panel border border-border bg-surface px-6 pb-7 pt-6 text-center">
              <div className="relative flex h-[88px] w-[88px] items-center justify-center rounded-[18px] border border-border-strong bg-surface-2">
                <img src={generateIllustration(s.art, `how-${i}`)} alt="" className="pixelated h-20 w-20" />
                <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-[6px] bg-primary font-pixel text-[9px] text-white shadow-pixel-sm">
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold text-text">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  )
}

function CreatorBand() {
  const navigate = useNavigate()
  const status = useAuthStore((s) => s.status)
  const user = useAuthStore((s) => s.user)
  const setBecomeCreatorOpen = useUiStore((s) => s.setBecomeCreatorOpen)
  const go = () => {
    if (status !== 'authed') navigate('/register?intent=sell')
    else if (user?.role === 'buyer') setBecomeCreatorOpen(true)
    else navigate('/studio')
  }
  const bars = [32, 44, 38, 58, 50, 72, 64, 88, 76, 96]
  return (
    <Reveal>
      <div className="noise relative overflow-hidden rounded-[24px] border border-primary/25 bg-surface">
        <div className="dot-grid absolute inset-0 opacity-40 [mask-image:linear-gradient(to_right,transparent,black)]" />
        <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-primary/25 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-24 right-10 h-72 w-72 rounded-full bg-accent/15 blur-[100px]" />
        <div className="relative grid items-center gap-10 p-7 sm:p-10 lg:grid-cols-[1.1fr_1fr] lg:p-14">
          <div>
            <p className="font-pixel text-[9px] uppercase text-pink">For creators</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-text sm:text-[2.6rem] sm:leading-[1.1]">
              Keep <span className="text-gradient">90%</span> of every sale
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
              Upload once and sell forever. Set your own price in rupees, or give it away to grow your following. Live analytics show what&apos;s selling.
            </p>
            <ul className="mt-6 grid gap-2.5 text-sm text-text/90 sm:grid-cols-2">
              {['Publish in under 5 minutes', 'Audio and sprite previews built in', 'Your own storefront page', 'Sales and download analytics'].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 bg-success" /> {t}
                </li>
              ))}
            </ul>
            <PixelButton size="lg" tone="accent" className="mt-8" onClick={go}>
              Open your studio <ArrowRight className="h-4 w-4" />
            </PixelButton>
          </div>
          <div className="relative mx-auto w-full max-w-sm" aria-hidden="true">
            <div className="rounded-panel border border-border-strong bg-surface-2/90 p-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] backdrop-blur">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">Earnings · last 30 days</span>
                <span className="inline-flex items-center gap-1 rounded-md bg-success/15 px-1.5 py-0.5 font-mono text-[10px] text-success">
                  <TrendingUp className="h-3 w-3" /> +38%
                </span>
              </div>
              <p className="mt-2 font-mono text-3xl font-semibold text-text">₹48,260</p>
              <div className="mt-5 flex h-28 items-end gap-1.5">
                {bars.map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-[3px] bg-gradient-to-t from-primary/40 to-primary" style={{ height: `${h}%`, opacity: 0.45 + i * 0.055 }} />
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-xs">
                <span className="text-muted">Platform fee</span>
                <span className="font-mono text-text">10%</span>
              </div>
            </div>
            <div className="absolute -right-3 -top-4 rotate-6 rounded-control border border-border-strong bg-surface px-3 py-2 shadow-card sm:-right-6">
              <p className="font-pixel text-[8px] text-success">+ ₹1,299</p>
              <p className="mt-1 text-[11px] text-muted">New sale · Dungeon Tiles</p>
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  )
}

// ---------------------------------------------------------------------------
// page
// ---------------------------------------------------------------------------

function Section({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8', className)}>{children}</section>
}

function RailSkeleton() {
  return (
    <div>
      <div className="mb-4 h-7 w-48 animate-pulse rounded bg-surface-2" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => <AssetCardSkeleton key={i} variant="compact" className="w-[46%] shrink-0 sm:w-[31%] md:w-[23.5%] lg:w-[18.8%]" />)}
      </div>
    </div>
  )
}

export default function HomePage() {
  const home = useAssetHome()
  const d = home.data

  const rails: { title: string; subtitle: string; icon: ReactNode; items: AssetCardData[]; seeAll: string; audio?: boolean }[] = d
    ? [
        { title: 'Featured this week', subtitle: 'Hand-picked packs our team keeps coming back to.', icon: <Star className="h-5 w-5 fill-warning text-warning" />, items: d.featured, seeAll: '/explore?sort=popular' },
        { title: 'Trending now', subtitle: 'What indie devs are buying this week.', icon: <Flame className="h-5 w-5 text-danger" />, items: d.trending, seeAll: '/explore?sort=popular' },
        { title: 'Hear it', subtitle: 'Press play. Only one sound plays at a time, everywhere.', icon: <Headphones className="h-5 w-5 text-accent" />, items: d.audio, seeAll: '/explore?mediaKind=audio', audio: true },
        { title: 'Fresh drops', subtitle: 'Brand new from the forge.', icon: <Sparkles className="h-5 w-5 text-primary" />, items: d.newest, seeAll: '/explore?sort=newest' },
        { title: 'Free to grab', subtitle: 'Zero rupees. Still great.', icon: <Gift className="h-5 w-5 text-success" />, items: d.freebies, seeAll: '/explore?free=true' },
      ]
    : []

  return (
    <Page title="Game assets for indie devs" description="Buy and sell sprites, tilesets, sound effects, music and more. Preview in your browser, priced in rupees.">
      <Hero home={home} />

      <Section className="relative z-10 -mt-4">
        <Reveal><StatsStrip /></Reveal>
      </Section>

      <Section className="mt-20">
        <Reveal className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight text-text sm:text-2xl">Browse by category</h2>
            <p className="mt-1 text-sm text-muted">Everything a 2D or low-poly game needs, in one place.</p>
          </div>
          <Link to="/explore" className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-muted hover:text-text">
            All assets <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Reveal>
        <CategoryGrid />
      </Section>

      <Section className="mt-20 space-y-16">
        {home.isLoading
          ? [0, 1, 2].map((i) => <RailSkeleton key={i} />)
          : home.isError
            ? (
              <div className="rounded-panel border border-danger/30 bg-danger/5 p-8 text-center">
                <p className="font-display font-semibold text-text">We couldn&apos;t load the shelves.</p>
                <button type="button" onClick={() => home.refetch()} className="mt-3 text-sm font-medium text-primary hover:text-accent">Try again</button>
              </div>
            )
            : rails.map((rail) =>
                rail.items.length ? (
                  <Reveal key={rail.title}>
                    <AssetRail
                      title={rail.title}
                      subtitle={rail.subtitle}
                      icon={rail.icon}
                      seeAll={rail.seeAll}
                      itemClassName={rail.audio ? 'w-[62%] sm:w-[38%] md:w-[31%] lg:w-[23.5%]' : undefined}
                    >
                      {rail.items.map((a) => <AssetCard key={a._id} asset={a} variant={rail.audio ? 'default' : 'compact'} />)}
                    </AssetRail>
                  </Reveal>
                ) : null,
              )}
      </Section>

      <Section className="mt-28">
        <HowItWorks />
      </Section>

      <Section className="mt-24">
        <CreatorBand />
      </Section>

      {d && (
        <Section className="mt-20 text-center">
          <p className="text-sm text-muted">
            {compactNumber(d.trending.reduce((s, a) => s + a.stats.sales, 0))}+ downloads from the trending shelf alone.{' '}
            <Link to="/explore" className="font-medium text-primary hover:text-accent">Start exploring →</Link>
          </p>
        </Section>
      )}
    </Page>
  )
}
