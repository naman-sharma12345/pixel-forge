import { useSearchParams } from 'react-router-dom'
import { useAssetList, useAssetCategories, useAssetTags } from '@/hooks/useAssets'
import { useState } from 'react'
import { Search } from 'lucide-react'
import { Page } from '@/components/layout'
import { Badge, Button, Card, EmptyState, Input, Pagination, PriceTag, Select, Skeleton } from '@/components/ui'
import { LICENSES, SORT_OPTIONS } from '@/lib/constants'
import { mediaUrl } from '@/lib/media'
import { Link } from 'react-router-dom'
import type { AssetCard, Category, License, SortKey } from '@/types/api'

function AssetCardItem({ a }: { a: AssetCard }) {
  return (
    <Link to={`/asset/${a.slug}`}>
      <Card className="group overflow-hidden">
        <div className="relative aspect-square overflow-hidden bg-surface-2">
          <img src={mediaUrl(a.thumbnail.url)} alt={a.title} loading="lazy" className="pixelated h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
          {a.isFree && <span className="absolute left-2 top-2 rounded bg-success/90 px-1.5 py-0.5 font-pixel text-[8px] text-bg">FREE</span>}
        </div>
        <div className="p-3">
          <p className="truncate text-sm font-medium text-text group-hover:text-primary">{a.title}</p>
          <p className="mt-0.5 truncate text-xs text-muted">{a.creator.name}</p>
          <div className="mt-2 flex items-center justify-between">
            <PriceTag price={a.price} size="sm" />
            <span className="font-mono text-[10px] text-subtle">{a.stats.sales} sold</span>
          </div>
        </div>
      </Card>
    </Link>
  )
}

export default function ExplorePage() {
  const [params, setParams] = useSearchParams()
  const [qInput, setQInput] = useState(params.get('q') ?? '')
  const page = Number(params.get('page') ?? 1)
  const category = (params.get('category') ?? '') as Category | ''
  const sort = (params.get('sort') ?? 'newest') as SortKey
  const free = params.get('free') === 'true'
  const license = (params.get('license') ?? '') as License | ''

  const queryParams = {
    q: params.get('q') ?? undefined,
    category: category || undefined,
    sort,
    free: free ? ('true' as const) : undefined,
    license: license || undefined,
    page,
    limit: 24,
  }
  const list = useAssetList(queryParams)
  const cats = useAssetCategories()
  const tags = useAssetTags()

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next)
  }

  return (
    <Page title="Explore — Pixel Forge" description="Browse every asset on the marketplace.">
      <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4">
          <h1 className="font-display text-2xl font-bold text-text sm:text-3xl">Explore</h1>
          <form
            onSubmit={(e) => { e.preventDefault(); setParam('q', qInput.trim()) }}
            className="flex max-w-xl gap-2"
          >
            <Input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Search assets, tags, creators…"
              leftIcon={<Search className="h-4 w-4" />}
            />
            <Button type="submit">Search</Button>
          </form>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={category}
              onChange={(e) => setParam('category', e.target.value)}
              className="h-9 w-auto min-w-36"
              options={[{ value: '', label: 'All categories' }, ...(cats.data ?? []).map((c) => ({ value: c.key, label: c.label }))]}
              aria-label="Category"
            />
            <Select
              value={sort}
              onChange={(e) => setParam('sort', e.target.value)}
              className="h-9 w-auto min-w-40"
              options={SORT_OPTIONS}
              aria-label="Sort"
            />
            <Select
              value={license}
              onChange={(e) => setParam('license', e.target.value)}
              className="h-9 w-auto min-w-44"
              options={[{ value: '', label: 'Any license' }, ...LICENSES.map((l) => ({ value: l.key, label: l.label }))]}
              aria-label="License"
            />
            <Button
              variant={free ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setParam('free', free ? '' : 'true')}
            >
              Free only
            </Button>
          </div>
          {(tags.data ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.data!.slice(0, 14).map((t) => (
                <button key={t.tag} type="button" onClick={() => setParam('tags', t.tag)}>
                  <Badge variant="outline" className="cursor-pointer hover:border-primary hover:text-primary">
                    #{t.tag} <span className="font-mono text-subtle">{t.count}</span>
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </div>

        {list.isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4]" />)}
          </div>
        ) : list.data && list.data.items.length ? (
          <>
            <p className="mb-4 font-mono text-xs text-subtle">{list.data.meta.total} assets</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {list.data.items.map((a) => <AssetCardItem key={a._id} a={a} />)}
            </div>
            <Pagination page={page} totalPages={list.data.meta.totalPages} onChange={(p) => setParam('page', String(p))} className="mt-8" />
          </>
        ) : (
          <EmptyState seed="no-results" kind="vfx" title="No assets found" text="Try a different search or remove some filters." />
        )}
      </div>
    </Page>
  )
}
