import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Compass, Grid2x2, Grid3x3, Search, SlidersHorizontal, X } from 'lucide-react'
import { Page } from '@/components/layout'
import { AssetCard, AssetCardSkeleton, AssetGrid } from '@/components/asset/AssetCard'
import { Button, EmptyState, Input, RangeSlider, Select, Sheet, Spinner, Switch } from '@/components/ui'
import { api } from '@/api'
import { keys } from '@/hooks/keys'
import { useAssetCategories, useAssetTags } from '@/hooks/useAssets'
import { CATEGORY_MAP, LICENSES } from '@/lib/constants'
import { cn } from '@/lib/cn'
import type { AssetListParams, Category, License, MediaKind, SortKey } from '@/types/api'

// ---------- filter state (the URL is the source of truth) ----------
interface Filters {
  q: string
  category: Category | ''
  tags: string[]
  minPrice: number | null
  maxPrice: number | null
  free: boolean
  license: License | ''
  mediaKind: MediaKind | ''
  sort: SortKey
}

const PRICE_MAX = 5000

function filtersFromParams(sp: URLSearchParams): Filters {
  const num = (k: string) => {
    const v = sp.get(k)
    if (v === null || v === '') return null
    const n = Number(v)
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : null
  }
  return {
    q: sp.get('q') ?? '',
    category: (CATEGORY_MAP.has(sp.get('category') as Category) ? sp.get('category') : '') as Category | '',
    tags: (sp.get('tags') ?? '').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
    minPrice: num('minPrice'),
    maxPrice: num('maxPrice'),
    free: sp.get('free') === 'true',
    license: (sp.get('license') ?? '') as License | '',
    mediaKind: (sp.get('mediaKind') ?? '') as MediaKind | '',
    sort: (sp.get('sort') ?? 'newest') as SortKey,
  }
}

function paramsFromFilters(f: Filters): URLSearchParams {
  const p = new URLSearchParams()
  if (f.q) p.set('q', f.q)
  if (f.category) p.set('category', f.category)
  if (f.tags.length) p.set('tags', f.tags.join(','))
  if (f.minPrice !== null) p.set('minPrice', String(f.minPrice))
  if (f.maxPrice !== null) p.set('maxPrice', String(f.maxPrice))
  if (f.free) p.set('free', 'true')
  if (f.license) p.set('license', f.license)
  if (f.mediaKind) p.set('mediaKind', f.mediaKind)
  if (f.sort !== 'newest') p.set('sort', f.sort)
  return p
}

function toQuery(f: Filters): Omit<AssetListParams, 'page'> {
  return {
    q: f.q || undefined,
    category: f.category || undefined,
    tags: f.tags.length ? f.tags.join(',') : undefined,
    minPrice: f.minPrice ?? undefined,
    maxPrice: f.maxPrice ?? undefined,
    free: f.free ? 'true' : undefined,
    license: f.license || undefined,
    mediaKind: f.mediaKind || undefined,
    sort: f.sort === 'relevance' && !f.q ? 'newest' : f.sort,
    limit: 24,
  }
}

interface ActiveChip { key: string; label: string; clear: () => Filters }

function activeChips(f: Filters): ActiveChip[] {
  const chips: ActiveChip[] = []
  if (f.q) chips.push({ key: 'q', label: `“${f.q}”`, clear: () => ({ ...f, q: '' }) })
  if (f.category) chips.push({ key: 'cat', label: CATEGORY_MAP.get(f.category)?.label ?? f.category, clear: () => ({ ...f, category: '' }) })
  for (const t of f.tags) chips.push({ key: `tag-${t}`, label: `#${t}`, clear: () => ({ ...f, tags: f.tags.filter((x) => x !== t) }) })
  if (f.minPrice !== null || f.maxPrice !== null) {
    chips.push({
      key: 'price',
      label: `₹${(f.minPrice ?? 0).toLocaleString('en-IN')} – ${f.maxPrice !== null ? `₹${f.maxPrice.toLocaleString('en-IN')}` : 'any'}`,
      clear: () => ({ ...f, minPrice: null, maxPrice: null }),
    })
  }
  if (f.free) chips.push({ key: 'free', label: 'Free only', clear: () => ({ ...f, free: false }) })
  if (f.license) chips.push({ key: 'lic', label: LICENSES.find((l) => l.key === f.license)?.label.split(' - ')[0] ?? f.license, clear: () => ({ ...f, license: '' }) })
  if (f.mediaKind) chips.push({ key: 'mk', label: f.mediaKind === 'image' ? 'Images' : f.mediaKind === 'audio' ? 'Audio' : 'Other', clear: () => ({ ...f, mediaKind: '' }) })
  return chips
}

const SORT_OPTS: { value: string; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most popular' },
  { value: 'top-rated', label: 'Top rated' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
]

const MEDIA_OPTS: { value: MediaKind | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'image', label: 'Images' },
  { value: 'audio', label: 'Audio' },
  { value: 'other', label: 'Other' },
]

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2.5 font-pixel text-[8px] uppercase tracking-wider text-subtle">{children}</h3>
}

// ---------- filters panel (desktop sidebar + mobile sheet) ----------
function FiltersPanel({
  value,
  onPatch,
  categories,
  tags,
  idPrefix,
}: {
  value: Filters
  onPatch: (patch: Partial<Filters>) => void
  categories: { key: Category; label: string; count: number }[]
  tags: { tag: string; count: number }[]
  idPrefix: string
}) {
  const [qInput, setQInput] = useState(value.q)
  useEffect(() => setQInput(value.q), [value.q])
  // debounced 350 ms search -> URL
  useEffect(() => {
    const t = window.setTimeout(() => {
      const v = qInput.trim()
      if (v !== value.q) onPatch({ q: v })
    }, 350)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qInput])

  const priceRange: [number, number] = [value.minPrice ?? 0, value.maxPrice ?? PRICE_MAX]
  const allCount = categories.reduce((s, c) => s + c.count, 0)

  const catRow = (key: Category | '', label: string, count: number, Icon: React.ComponentType<{ className?: string }>) => {
    const active = value.category === key
    return (
      <button
        key={key || 'all'}
        type="button"
        role="radio"
        aria-checked={active}
        onClick={() => onPatch({ category: active && key ? '' : key })}
        className={cn(
          'group flex items-center gap-2.5 rounded-control px-2.5 py-1.5 text-left text-sm transition-colors',
          active ? 'bg-primary-soft text-text' : 'text-muted hover:bg-surface-2 hover:text-text',
        )}
      >
        <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-subtle group-hover:text-muted')} />
        <span className="flex-1 truncate">{label}</span>
        <span className={cn('font-mono text-[11px]', active ? 'text-primary' : 'text-subtle')}>{count}</span>
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-7">
      <Input
        value={qInput}
        onChange={(e) => setQInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onPatch({ q: qInput.trim() }) }}
        placeholder="Search assets…"
        leftIcon={<Search className="h-4 w-4" />}
        aria-label="Search assets"
        type="search"
      />

      <div>
        <SectionLabel>Category</SectionLabel>
        <div className="-mx-1 flex flex-col gap-0.5" role="radiogroup" aria-label="Category">
          {catRow('', 'All categories', allCount, Compass)}
          {categories.map((c) => catRow(c.key, c.label, c.count, CATEGORY_MAP.get(c.key)?.icon ?? Compass))}
        </div>
      </div>

      <div>
        <SectionLabel>Media type</SectionLabel>
        <div className="grid grid-cols-4 gap-0.5 rounded-control border border-border bg-surface-2 p-0.5" role="radiogroup" aria-label="Media type">
          {MEDIA_OPTS.map((o) => (
            <button
              key={o.value || 'all'}
              type="button"
              role="radio"
              aria-checked={value.mediaKind === o.value}
              onClick={() => onPatch({ mediaKind: o.value })}
              className={cn(
                'rounded-[7px] px-1 py-1.5 text-xs font-medium transition-all',
                value.mediaKind === o.value ? 'bg-surface-3 text-text shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_6px_rgba(0,0,0,0.4)]' : 'text-muted hover:text-text',
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>Price (₹)</SectionLabel>
        <RangeSlider
          label="Price range"
          min={0}
          max={PRICE_MAX}
          step={50}
          value={priceRange}
          onChange={([lo, hi]) => onPatch({ minPrice: lo === 0 ? null : lo, maxPrice: hi >= PRICE_MAX ? null : hi })}
        />
        <div className="mt-3 flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={value.minPrice ?? ''}
            onChange={(e) => onPatch({ minPrice: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })}
            placeholder="0"
            className="h-9 font-mono text-xs"
            aria-label="Minimum price in rupees"
          />
          <span className="text-subtle">–</span>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={value.maxPrice ?? ''}
            onChange={(e) => onPatch({ maxPrice: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })}
            placeholder={`${PRICE_MAX}+`}
            className="h-9 font-mono text-xs"
            aria-label="Maximum price in rupees"
          />
        </div>
        <div className="mt-4 rounded-control border border-border bg-surface-2/60 px-3 py-2.5">
          <Switch checked={value.free} onChange={(v) => onPatch({ free: v })} label="Free assets only" />
        </div>
      </div>

      <div>
        <SectionLabel>License</SectionLabel>
        <div className="-mx-1 flex flex-col gap-0.5" role="radiogroup" aria-label="License">
          {[{ value: '', label: 'Any license' }, ...LICENSES.map((l) => ({ value: l.key, label: l.label }))].map((o) => {
            const active = value.license === o.value
            const [name, detail] = o.label.split(' - ')
            return (
              <label key={o.value || 'any'} className={cn('flex cursor-pointer items-start gap-2.5 rounded-control px-2 py-1.5 text-sm transition-colors hover:bg-surface-2', active ? 'text-text' : 'text-muted')}>
                <input
                  type="radio"
                  name={`license-${idPrefix}`}
                  checked={active}
                  onChange={() => onPatch({ license: o.value as License | '' })}
                  className="peer sr-only"
                />
                <span className={cn('mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent', active ? 'border-primary' : 'border-border-strong')}>
                  {active && <span className="h-2 w-2 rounded-full bg-primary" />}
                </span>
                <span className="leading-snug">
                  {name}
                  {detail && <span className="block text-xs text-subtle">{detail}</span>}
                </span>
              </label>
            )
          })}
        </div>
      </div>

      {tags.length > 0 && (
        <div>
          <SectionLabel>Popular tags</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {tags.slice(0, 20).map((t) => {
              const active = value.tags.includes(t.tag)
              return (
                <button
                  key={t.tag}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onPatch({ tags: active ? value.tags.filter((x) => x !== t.tag) : [...value.tags, t.tag] })}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-xs transition-colors',
                    active ? 'border-primary/60 bg-primary-soft text-text' : 'border-border text-muted hover:border-border-strong hover:text-text',
                  )}
                >
                  #{t.tag}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------- page ----------
export default function ExplorePage() {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => filtersFromParams(params), [params])
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [draft, setDraft] = useState<Filters>(filters)

  const cats = useAssetCategories()
  const tags = useAssetTags()

  const query = useMemo(() => toQuery(filters), [filters])
  const list = useInfiniteQuery({
    queryKey: [...keys.assets.list(query as AssetListParams), 'infinite'],
    queryFn: ({ pageParam }) => api.assets.list({ ...query, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.hasNext ? last.meta.page + 1 : undefined),
  })

  const items = useMemo(() => list.data?.pages.flatMap((p) => p.items) ?? [], [list.data])
  const total = list.data?.pages[0]?.meta.total ?? 0

  const commit = (next: Filters) => setParams(paramsFromFilters(next))
  const patch = (p: Partial<Filters>) => commit({ ...filters, ...p })

  const chips = activeChips(filters)
  const hasFilters = chips.length > 0 || filters.sort !== 'newest'
  const clearAll = () => setParams(new URLSearchParams())

  // infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null)
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = list
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage()
      },
      { rootMargin: '600px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, items.length])

  const catInfo = filters.category ? CATEGORY_MAP.get(filters.category) : undefined
  const heading = catInfo ? catInfo.label : filters.q ? 'Search results' : filters.free ? 'Free to grab' : filters.mediaKind === 'audio' ? 'Sound & music' : 'Explore'
  const subheading = catInfo
    ? catInfo.blurb
    : filters.q
      ? 'Assets matching your search across every category.'
      : filters.free
        ? 'Every free asset on Pixel Forge. Claim it and it is yours to keep.'
        : 'Sprites, tilesets, UI, sound effects and music from indie creators.'
  const pageTitle = catInfo ? `${catInfo.label} · Explore` : filters.q ? `“${filters.q}” · Explore` : 'Explore'

  const sortOptions = filters.q ? [{ value: 'relevance', label: 'Best match' }, ...SORT_OPTS] : SORT_OPTS

  return (
    <Page title={pageTitle} description="Browse every sprite, tileset, sound and track on Pixel Forge.">
      <div className="mx-auto max-w-[1280px] px-4 pb-8 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        <div className="flex gap-8">
          {/* ===== sidebar (desktop) ===== */}
          <aside className="sticky top-20 hidden h-fit w-[260px] shrink-0 lg:block" aria-label="Filters">
            <div className="max-h-[calc(100vh-6rem)] overflow-y-auto rounded-panel border border-border bg-surface/70 p-4 backdrop-blur [scrollbar-width:thin]">
              <FiltersPanel value={filters} onPatch={patch} categories={cats.data ?? []} tags={tags.data ?? []} idPrefix="side" />
              {hasFilters && (
                <Button variant="ghost" size="sm" className="mt-5 w-full" leftIcon={<X className="h-3.5 w-3.5" />} onClick={clearAll}>
                  Clear all filters
                </Button>
              )}
            </div>
          </aside>

          {/* ===== results ===== */}
          <div className="min-w-0 flex-1">
            <div className="mb-5 flex items-start gap-4">
              {catInfo && (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] border border-primary/30 bg-primary-soft text-primary">
                  <catInfo.icon className="h-6 w-6" />
                </span>
              )}
              <div className="min-w-0">
                <h1 className="font-display text-2xl font-bold tracking-tight text-text sm:text-3xl">{heading}</h1>
                <p className="mt-1 text-sm text-muted">{subheading}</p>
              </div>
            </div>

            {/* sticky top bar */}
            <div className="sticky top-16 z-20 -mx-4 mb-5 flex flex-col gap-3 border-b border-border/60 bg-bg/85 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:mx-0 lg:rounded-card lg:border lg:px-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted" aria-live="polite">
                  {list.isLoading ? (
                    <span className="inline-block h-4 w-40 animate-pulse rounded bg-surface-3 align-middle" />
                  ) : (
                    <>
                      Showing <span className="font-mono font-semibold text-text">{total.toLocaleString('en-IN')}</span> result{total === 1 ? '' : 's'}
                      {filters.q && <> for <span className="text-text">&ldquo;{filters.q}&rdquo;</span></>}
                    </>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="lg:hidden"
                    leftIcon={<SlidersHorizontal className="h-3.5 w-3.5" />}
                    onClick={() => { setDraft(filters); setSheetOpen(true) }}
                  >
                    Filters
                    {chips.length > 0 && (
                      <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] text-white">{chips.length}</span>
                    )}
                  </Button>
                  <div className="hidden items-center rounded-control border border-border bg-surface-2 p-0.5 sm:flex" role="group" aria-label="Grid density">
                    {([['comfortable', Grid2x2, 'Large cards'], ['compact', Grid3x3, 'Small cards']] as const).map(([d, Icon, label]) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDensity(d)}
                        aria-label={label}
                        aria-pressed={density === d}
                        title={label}
                        className={cn('rounded-[7px] p-1.5 transition-colors', density === d ? 'bg-surface-3 text-text' : 'text-subtle hover:text-text')}
                      >
                        <Icon className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                  <Select
                    value={filters.sort === 'relevance' && !filters.q ? 'newest' : filters.sort}
                    onChange={(e) => patch({ sort: e.target.value as SortKey })}
                    options={sortOptions}
                    className="h-9 w-[168px]"
                    aria-label="Sort results"
                  />
                </div>
              </div>

              {chips.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {chips.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      aria-label={`Remove filter ${c.label}`}
                      onClick={() => commit(c.clear())}
                      className="group inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary-soft py-1 pl-2.5 pr-1.5 text-xs text-text transition-colors hover:border-danger/50 hover:bg-danger/10"
                    >
                      {c.label}
                      <X className="h-3 w-3 text-muted group-hover:text-danger" />
                    </button>
                  ))}
                  <button type="button" onClick={clearAll} className="ml-1 text-xs font-medium text-muted hover:text-text">
                    Clear all
                  </button>
                </div>
              )}
            </div>

            {list.isLoading ? (
              <AssetGrid density={density}>
                {Array.from({ length: 12 }).map((_, i) => <AssetCardSkeleton key={i} variant={density === 'compact' ? 'compact' : 'default'} />)}
              </AssetGrid>
            ) : list.isError ? (
              <EmptyState
                art="skull"
                title="The forge hiccuped"
                text="We couldn't load these assets. Check your connection and try again."
                action={<Button onClick={() => list.refetch()} loading={list.isRefetching}>Try again</Button>}
              />
            ) : items.length === 0 ? (
              <EmptyState
                art="search"
                title={filters.q ? `Nothing matches “${filters.q}”` : 'No assets match these filters'}
                text="Try a broader search, a different category, or remove a filter or two."
                action={
                  <>
                    {hasFilters && <Button onClick={clearAll}>Clear filters</Button>}
                    <Button variant="secondary" onClick={() => setParams(new URLSearchParams({ free: 'true' }))}>Browse freebies</Button>
                  </>
                }
              />
            ) : (
              <>
                <AssetGrid density={density}>
                  {items.map((a) => <AssetCard key={a._id} asset={a} variant={density === 'compact' ? 'compact' : 'default'} />)}
                  {isFetchingNextPage && Array.from({ length: 4 }).map((_, i) => <AssetCardSkeleton key={`s${i}`} variant={density === 'compact' ? 'compact' : 'default'} />)}
                </AssetGrid>
                <div ref={sentinelRef} className="flex justify-center py-10">
                  {isFetchingNextPage ? (
                    <Spinner label="Loading more" />
                  ) : !hasNextPage ? (
                    <p className="font-pixel text-[8px] uppercase text-subtle">End of results · {total.toLocaleString('en-IN')} assets</p>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ===== mobile filter sheet ===== */}
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filters"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setDraft(filtersFromParams(new URLSearchParams()))}>
              Reset
            </Button>
            <Button className="flex-[2]" onClick={() => { commit(draft); setSheetOpen(false) }}>
              Apply filters
            </Button>
          </div>
        }
      >
        <FiltersPanel value={draft} onPatch={(p) => setDraft((d) => ({ ...d, ...p }))} categories={cats.data ?? []} tags={tags.data ?? []} idPrefix="sheet" />
      </Sheet>
    </Page>
  )
}
