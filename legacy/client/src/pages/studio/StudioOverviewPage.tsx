import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Download, Eye, Heart, IndianRupee, ShoppingBag, Star, Upload } from 'lucide-react'
import { Page } from '@/components/layout'
import { DashHeader, Panel } from '@/components/dashboard/DashboardLayout'
import { CATEGORY_COLORS, Donut, KpiCard, THEME, TrendAreaChart, halfDelta, rupees } from '@/components/dashboard/charts'
import { Avatar, Button, PixelButton } from '@/components/ui'
import { useCreatorSales, useCreatorStats } from '@/hooks/useStudio'
import { categoryLabel } from '@/lib/constants'
import { mediaUrl } from '@/lib/media'
import { timeAgo } from '@/lib/format'
import { generateIllustration } from '@/lib/pixelArt'
import { cn } from '@/lib/cn'
import type { CreatorRange } from '@/types/api'

const RANGES: { key: CreatorRange; label: string }[] = [
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
]

function RangeTabs({ value, onChange }: { value: CreatorRange; onChange: (r: CreatorRange) => void }) {
  return (
    <div className="flex rounded-control border border-border bg-surface p-0.5" role="tablist" aria-label="Date range">
      {RANGES.map((r) => (
        <button
          key={r.key}
          type="button"
          role="tab"
          aria-selected={value === r.key}
          onClick={() => onChange(r.key)}
          className={cn('relative rounded-[8px] px-3 py-1.5 text-xs font-medium transition-colors', value === r.key ? 'text-text' : 'text-muted hover:text-text')}
        >
          {value === r.key && <motion.span layoutId="range-pill" className="absolute inset-0 -z-10 rounded-[8px] bg-surface-3" transition={{ duration: 0.2 }} />}
          {r.label}
        </button>
      ))}
    </div>
  )
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={cn('animate-pulse rounded-card border border-border bg-surface', className)} />
}

function FirstUpload() {
  const navigate = useNavigate()
  const art = useMemo(() => generateIllustration('star', 'first-upload'), [])
  return (
    <div className="noise relative mb-6 overflow-hidden rounded-panel border border-primary/30 bg-gradient-to-br from-primary/15 via-surface to-surface p-6 sm:p-8">
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-30 [mask-image:linear-gradient(to_left,black,transparent)]" />
      <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <img src={art} alt="" className="pixelated h-24 w-24 shrink-0 animate-float" />
        <div className="flex-1">
          <h2 className="font-display text-2xl font-bold tracking-tight text-text">Upload your first asset</h2>
          <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-muted">
            Your studio is ready. Publish a sprite pack, tileset or sound bank in a few minutes. You keep 90% of every sale, and the charts below come alive with your first buyer.
          </p>
        </div>
        <PixelButton size="lg" onClick={() => navigate('/studio/new')}>
          <Upload className="h-4 w-4" /> Upload asset
        </PixelButton>
      </div>
    </div>
  )
}

export default function StudioOverviewPage() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('range')
  const range: CreatorRange = raw === '7d' || raw === '90d' ? raw : '30d'
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useCreatorStats(range)
  const sales = useCreatorSales(1)

  const series = data?.series ?? []
  const revSeries = series.map((s) => s.revenue)
  const salesSeries = series.map((s) => s.sales)
  const t = data?.totals
  const isNew = !!t && t.assets === 0
  const topMax = Math.max(1, ...(data?.topAssets ?? []).map((x) => x.revenue))
  const topTotal = (data?.topAssets ?? []).reduce((s, x) => s + x.revenue, 0)

  const donut = (data?.categoryBreakdown ?? []).map((c) => ({ key: c.category, name: categoryLabel(c.category), value: c.revenue, color: CATEGORY_COLORS[c.category] }))
  const recent = (sales.data?.items ?? []).slice(0, 8)

  return (
    <Page title="Creator Studio" description="Your sales, earnings and assets at a glance.">
      <DashHeader
        eyebrow="Creator Studio"
        title="Overview"
        subtitle={`Performance over the last ${range === '7d' ? '7' : range === '90d' ? '90' : '30'} days`}
        actions={
          <>
            <RangeTabs value={range} onChange={(r) => setParams(r === '30d' ? {} : { range: r }, { replace: true })} />
            <Button leftIcon={<Upload className="h-4 w-4" />} onClick={() => navigate('/studio/new')}>Upload asset</Button>
          </>
        }
      />

      {isNew && <FirstUpload />}

      {isError ? (
        <Panel>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="font-display font-semibold text-text">We couldn&apos;t load your stats</p>
            <Button variant="secondary" onClick={() => refetch()}>Try again</Button>
          </div>
        </Panel>
      ) : (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {isLoading || !t ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonBlock key={i} className="h-[138px]" />)
            ) : (
              <>
                <KpiCard label="Earnings" value={t.revenue} format={rupees} icon={IndianRupee} color={THEME.primary} spark={revSeries} delta={halfDelta(revSeries)} />
                <KpiCard label="Sales" value={t.sales} icon={ShoppingBag} color={THEME.accent} spark={salesSeries} delta={halfDelta(salesSeries)} />
                <KpiCard label="Downloads" value={t.downloads} icon={Download} color={THEME.success} hint="All time" />
                <KpiCard label="Views" value={t.views} icon={Eye} color={THEME.pink} hint="All time" />
                <KpiCard label="Avg rating" value={t.avgRating} decimals={1} format={(n) => (n ? n.toFixed(1) : '–')} icon={Star} color={THEME.warning} hint={`${t.assets} asset${t.assets === 1 ? '' : 's'}`} />
                <KpiCard label="Wishlists" value={t.wishlists} icon={Heart} color={THEME.danger} hint="Saved by buyers" />
              </>
            )}
          </div>

          {/* earnings + category */}
          <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <Panel
              title="Earnings"
              action={t && <span className="font-mono text-sm text-text">{rupees(t.revenue)}</span>}
              bodyClassName="px-3 pb-4 pt-4 sm:px-4"
            >
              {isLoading ? (
                <div className="h-[280px] animate-pulse rounded-control bg-surface-2" />
              ) : (
                <TrendAreaChart
                  data={series}
                  dataKey="revenue"
                  rows={[
                    { key: 'revenue', label: 'Earnings', color: THEME.primary, format: rupees },
                    { key: 'sales', label: 'Sales', color: THEME.accent, format: (n) => String(n) },
                  ]}
                />
              )}
            </Panel>
            <Panel title="Sales by category">
              {isLoading ? (
                <div className="h-44 animate-pulse rounded-control bg-surface-2" />
              ) : (
                <Donut
                  data={donut}
                  centerLabel="earned"
                  centerValue={rupees(t?.revenue ?? 0)}
                  legendValue={(d) => rupees(d.value)}
                />
              )}
            </Panel>
          </div>

          {/* top assets + recent sales */}
          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Top assets" action={<Link to="/studio/assets" className="text-xs font-medium text-muted hover:text-text">All assets</Link>} bodyClassName="p-2">
              {isLoading ? (
                <div className="space-y-2 p-3">{[0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-control bg-surface-2" />)}</div>
              ) : !data?.topAssets.length ? (
                <p className="px-3 py-10 text-center text-sm text-muted">Your best sellers will be ranked here.</p>
              ) : (
                <ol>
                  {data.topAssets.map((x, i) => (
                    <li key={x.asset._id}>
                      <Link to={`/asset/${x.asset.slug}`} className="flex items-center gap-3 rounded-control p-3 transition-colors hover:bg-surface-2">
                        <span className="w-5 text-center font-pixel text-[9px] text-subtle">{i + 1}</span>
                        <img src={mediaUrl(x.asset.thumbnail.url)} alt="" className="pixelated h-11 w-11 shrink-0 rounded-[8px] object-cover ring-1 ring-border" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-text">{x.asset.title}</p>
                          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-3">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                              initial={{ width: 0 }}
                              animate={{ width: `${(x.revenue / topMax) * 100}%` }}
                              transition={{ duration: 0.7, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                            />
                          </div>
                        </div>
                        <div className="w-24 shrink-0 text-right">
                          <p className="font-mono text-sm text-text">{rupees(x.revenue)}</p>
                          <p className="font-mono text-[11px] text-subtle">
                            {x.sales} sale{x.sales === 1 ? '' : 's'} · {topTotal ? Math.round((x.revenue / topTotal) * 100) : 0}%
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>

            <Panel
              title="Recent sales"
              action={
                <Link to="/studio/sales" className="group inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-text">
                  View all <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </Link>
              }
              bodyClassName="p-2"
            >
              {sales.isLoading ? (
                <div className="space-y-2 p-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-11 animate-pulse rounded-control bg-surface-2" />)}</div>
              ) : !recent.length ? (
                <p className="px-3 py-10 text-center text-sm text-muted">No sales yet. Share your store link to get the first one.</p>
              ) : (
                <ul>
                  {recent.map((s, i) => (
                    <li key={`${s.orderId}-${s.asset._id}-${i}`} className="flex items-center gap-3 rounded-control px-3 py-2.5 transition-colors hover:bg-surface-2">
                      <Avatar src={s.buyer.avatarUrl} username={s.buyer.username} name={s.buyer.username} size={30} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-text">
                          <span className="font-medium">@{s.buyer.username}</span> <span className="text-muted">bought</span>{' '}
                          <Link to={`/asset/${s.asset.slug}`} className="font-medium hover:text-primary">{s.asset.title}</Link>
                        </p>
                        <p className="text-[11px] text-subtle">{timeAgo(s.paidAt)}</p>
                      </div>
                      <span className="shrink-0 rounded-md bg-success/10 px-2 py-0.5 font-mono text-xs text-success">+{rupees(s.creatorEarning)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      )}
    </Page>
  )
}
