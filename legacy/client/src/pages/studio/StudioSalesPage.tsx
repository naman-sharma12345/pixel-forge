import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Download, Upload } from 'lucide-react'
import { Page } from '@/components/layout'
import { DashHeader } from '@/components/dashboard/DashboardLayout'
import { rupees } from '@/components/dashboard/charts'
import { downloadCsv, TableFrame, TH } from '@/components/dashboard/table'
import { Avatar, Button, EmptyState, Pagination } from '@/components/ui'
import { useCreatorSales } from '@/hooks/useStudio'
import { mediaUrl } from '@/lib/media'
import type { CreatorSale } from '@/types/api'

function when(iso: string | null) {
  if (!iso) return '–'
  const d = new Date(iso)
  return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
}

export default function StudioSalesPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const page = Math.max(1, Number(params.get('page')) || 1)
  const { data, isLoading, isError, refetch } = useCreatorSales(page)
  const rows = data?.items ?? []
  const meta = data?.meta
  const pageEarnings = rows.reduce((s, r) => s + r.creatorEarning, 0)

  const exportCsv = () => {
    const header = ['Order ID', 'Paid at', 'Asset', 'Asset slug', 'Buyer', 'Price (INR)', 'Your earning (INR)']
    const body = rows.map((r: CreatorSale) => [r.orderId, r.paidAt ?? '', r.asset.title, r.asset.slug, r.buyer.username, r.price, r.creatorEarning])
    downloadCsv(`pixel-forge-sales-page-${page}.csv`, [header, ...body])
  }

  return (
    <Page title="Sales" description="Every sale of your assets.">
      <DashHeader
        eyebrow="Creator Studio"
        title="Sales"
        subtitle={meta ? `${meta.total} sale${meta.total === 1 ? '' : 's'} all time` : 'Every purchase of your assets'}
        actions={
          <Button variant="secondary" leftIcon={<Download className="h-4 w-4" />} disabled={!rows.length} onClick={exportCsv}>
            Export CSV
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-card border border-border bg-surface" />)}</div>
      ) : isError ? (
        <EmptyState compact art="skull" title="We couldn’t load your sales" action={<Button onClick={() => refetch()}>Try again</Button>} />
      ) : !rows.length ? (
        <EmptyState art="chest" title="No sales yet" text="When someone buys one of your assets it shows up here, with what you earned." action={<Button leftIcon={<Upload className="h-4 w-4" />} onClick={() => navigate('/studio/new')}>Upload an asset</Button>} />
      ) : (
        <>
          <TableFrame
            minWidth={720}
            head={
              <>
                <th scope="col" className={TH}>Asset</th>
                <th scope="col" className={TH}>Buyer</th>
                <th scope="col" className={TH}>Date</th>
                <th scope="col" className={`${TH} text-right`}>Price</th>
                <th scope="col" className={`${TH} text-right`}>You earned</th>
                <th scope="col" className={TH}>Order</th>
              </>
            }
          >
            {rows.map((r, i) => (
              <tr key={`${r.orderId}-${r.asset._id}-${i}`} className="transition-colors hover:bg-surface-2/60">
                <td className="px-3 py-2.5">
                  <Link to={`/asset/${r.asset.slug}`} className="flex items-center gap-3 hover:text-primary">
                    <img src={mediaUrl(r.asset.thumbnail.url)} alt="" className="pixelated h-10 w-10 shrink-0 rounded-[8px] object-cover ring-1 ring-border" />
                    <span className="max-w-[240px] truncate font-medium text-text">{r.asset.title}</span>
                  </Link>
                </td>
                <td className="px-3 py-2.5">
                  <Link to={`/u/${r.buyer.username}`} className="inline-flex items-center gap-2 text-muted hover:text-text">
                    <Avatar src={r.buyer.avatarUrl} username={r.buyer.username} name={r.buyer.username} size={24} />@{r.buyer.username}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted">{when(r.paidAt)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-xs text-muted">{rupees(r.price)}</td>
                <td className="px-3 py-2.5 text-right font-mono text-sm font-semibold text-success">+{rupees(r.creatorEarning)}</td>
                <td className="px-3 py-2.5 font-mono text-[11px] text-subtle">#{r.orderId.slice(-8).toUpperCase()}</td>
              </tr>
            ))}
          </TableFrame>
          <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-xs text-muted">
              This page: <span className="font-mono text-text">{rupees(pageEarnings)}</span> earned across {rows.length} sale{rows.length === 1 ? '' : 's'}
            </p>
            {meta && meta.totalPages > 1 && <Pagination page={meta.page} totalPages={meta.totalPages} onChange={(p) => setParams(p === 1 ? {} : { page: String(p) })} />}
          </div>
        </>
      )}
    </Page>
  )
}
