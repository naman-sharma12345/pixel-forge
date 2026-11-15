import { Link } from 'react-router-dom'
import { ArrowRight, Boxes, IndianRupee, Landmark, ShoppingCart, Store, Users } from 'lucide-react'
import { Page } from '@/components/layout'
import { DashHeader, Panel } from '@/components/dashboard/DashboardLayout'
import { KpiCard, THEME, TrendAreaChart, TrendBarChart, halfDelta, rupees } from '@/components/dashboard/charts'
import { Button } from '@/components/ui'
import { useAdminStats } from '@/hooks/useStudio'

export default function AdminOverviewPage() {
  const { data, isLoading, isError, refetch } = useAdminStats()
  const signups = data?.signupsSeries ?? []
  const revenue = data?.revenueSeries ?? []
  const signupVals = signups.map((d) => d.count)
  const revenueVals = revenue.map((d) => d.revenue)
  const newUsers30 = signupVals.reduce((s, v) => s + v, 0)
  const revenue30 = revenueVals.reduce((s, v) => s + v, 0)

  return (
    <Page title="Admin overview" description="Platform health at a glance.">
      <DashHeader
        eyebrow="Admin"
        title="Platform overview"
        subtitle="Users, catalogue and money across Pixel Forge"
        actions={
          <>
            <Link to="/admin/assets?status=published"><Button variant="secondary">Moderate assets</Button></Link>
            <Link to="/admin/users"><Button>Manage users</Button></Link>
          </>
        }
      />

      {isError ? (
        <Panel>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="font-display font-semibold text-text">Stats didn&apos;t load</p>
            <Button variant="secondary" onClick={() => refetch()}>Try again</Button>
          </div>
        </Panel>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {isLoading || !data ? (
              Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-[138px] animate-pulse rounded-card border border-border bg-surface" />)
            ) : (
              <>
                <KpiCard label="Users" value={data.users} icon={Users} color={THEME.accent} spark={signupVals} hint={`+${newUsers30} in 30 days`} />
                <KpiCard label="Creators" value={data.creators} icon={Store} color={THEME.pink} hint={`${data.users ? Math.round((data.creators / data.users) * 100) : 0}% of users`} />
                <KpiCard label="Assets" value={data.assets} icon={Boxes} color={THEME.primary} hint="All statuses" />
                <KpiCard label="Paid orders" value={data.orders} icon={ShoppingCart} color={THEME.success} hint="All time" />
                <KpiCard label="Gross revenue" value={data.revenue} format={rupees} icon={IndianRupee} color={THEME.warning} spark={revenueVals} delta={halfDelta(revenueVals)} />
                <KpiCard label="Platform fees" value={data.platformFees} format={rupees} icon={Landmark} color={THEME.danger} hint="10% of each sale" />
              </>
            )}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Signups · last 30 days" action={<span className="font-mono text-sm text-text">{newUsers30}</span>} bodyClassName="px-3 pb-4 pt-4 sm:px-4">
              {isLoading ? (
                <div className="h-[260px] animate-pulse rounded-control bg-surface-2" />
              ) : (
                <TrendBarChart data={signups} dataKey="count" color={THEME.accent} rows={[{ key: 'count', label: 'New users', color: THEME.accent, format: (n) => String(n) }]} />
              )}
            </Panel>
            <Panel title="Revenue · last 30 days" action={<span className="font-mono text-sm text-text">{rupees(revenue30)}</span>} bodyClassName="px-3 pb-4 pt-4 sm:px-4">
              {isLoading ? (
                <div className="h-[260px] animate-pulse rounded-control bg-surface-2" />
              ) : (
                <TrendAreaChart data={revenue} dataKey="revenue" color={THEME.warning} height={260} rows={[{ key: 'revenue', label: 'Revenue', color: THEME.warning, format: rupees }]} />
              )}
            </Panel>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { to: '/admin/users?banned=true', title: 'Banned accounts', text: 'Review who is locked out and why.', icon: Users },
              { to: '/admin/assets?status=rejected', title: 'Rejected assets', text: 'Follow up on assets that failed moderation.', icon: Boxes },
            ].map((l) => (
              <Link key={l.to} to={l.to} className="group flex items-center gap-4 rounded-card border border-border bg-surface p-4 transition-colors hover:border-border-strong">
                <span className="flex h-10 w-10 items-center justify-center rounded-control bg-surface-3 text-muted group-hover:text-primary"><l.icon className="h-5 w-5" /></span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-text">{l.title}</span>
                  <span className="block text-xs text-muted">{l.text}</span>
                </span>
                <ArrowRight className="h-4 w-4 text-subtle transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </Page>
  )
}
