import { useEffect, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Check, Download, Library } from 'lucide-react'
import { Page } from '@/components/layout'
import { Button, PixelButton } from '@/components/ui'
import { useDownloadAsset, useOrder } from '@/hooks/useCommerce'
import { mediaUrl } from '@/lib/media'
import { formatDate } from '@/lib/format'
import { fireConfetti } from '@/lib/confetti'
import { generateIllustration } from '@/lib/pixelArt'

const rupees = (n: number) => (n === 0 ? 'Free' : `₹${n.toLocaleString('en-IN')}`)

function DownloadButton({ assetId, title }: { assetId: string; title: string }) {
  const dl = useDownloadAsset()
  return (
    <Button
      size="sm"
      variant={dl.isSuccess ? 'secondary' : 'primary'}
      loading={dl.isPending}
      onClick={() => dl.mutate(assetId)}
      leftIcon={dl.isSuccess ? <Check className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
      aria-label={`Download ${title}`}
    >
      {dl.isSuccess ? 'Downloaded' : 'Download'}
    </Button>
  )
}

export default function CheckoutSuccessPage() {
  const [params] = useSearchParams()
  const orderId = params.get('order') ?? ''
  const { data: order, isLoading, isError } = useOrder(orderId || undefined)
  const reduce = useReducedMotion()
  const navigate = useNavigate()
  const art = useMemo(() => generateIllustration('chest', 'success'), [])

  useEffect(() => {
    const t = window.setTimeout(() => fireConfetti({ y: 0.35 }), 250)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <Page title="Order complete" description="Your purchase was successful.">
      <div className="relative mx-auto max-w-[720px] px-4 pb-12 pt-10 sm:px-6">
        <div className="pointer-events-none absolute left-1/2 top-8 h-56 w-56 -translate-x-1/2 rounded-full bg-success/15 blur-[90px]" />
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex flex-col items-center text-center"
        >
          <img src={art} alt="" className="pixelated h-32 w-32" />
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 font-pixel text-[8px] uppercase text-success">
            <Check className="h-3 w-3" strokeWidth={3} /> Payment complete
          </span>
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">Your assets are ready</h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
            Everything below is now in your library forever. Download now or come back any time. (Demo payment, no real money was charged.)
          </p>
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-10"
        >
          {isLoading ? (
            <div className="space-y-3 rounded-panel border border-border bg-surface p-5">
              {[0, 1].map((i) => <div key={i} className="h-16 animate-pulse rounded-control bg-surface-2" />)}
            </div>
          ) : isError || !order ? (
            <div className="rounded-panel border border-border bg-surface p-6 text-center text-sm text-muted">
              We couldn’t load the receipt, but your purchase is safe in your library.
            </div>
          ) : (
            <div className="overflow-hidden rounded-panel border border-border bg-surface">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-border-strong bg-surface-2/60 px-5 py-3.5">
                <p className="font-mono text-xs text-muted">
                  Order <span className="text-text">#{order._id.slice(-8).toUpperCase()}</span> · {formatDate(order.createdAt)}
                </p>
                <span className="rounded-md bg-success/15 px-2 py-0.5 text-[11px] font-semibold capitalize text-success">{order.status}</span>
              </div>
              <ul className="divide-y divide-border">
                {order.items.map((item) => (
                  <li key={item.assetId} className="flex items-center gap-4 p-4">
                    <img src={mediaUrl(item.thumbnailUrl)} alt="" className="pixelated h-14 w-14 shrink-0 rounded-control object-cover ring-1 ring-border" />
                    <div className="min-w-0 flex-1">
                      <Link to={`/asset/${item.slug}`} className="block truncate text-sm font-semibold text-text hover:text-primary">{item.title}</Link>
                      <p className="font-mono text-xs text-subtle">{rupees(item.price)}</p>
                    </div>
                    <DownloadButton assetId={item.assetId} title={item.title} />
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between border-t border-border px-5 py-4">
                <span className="text-sm text-muted">Total paid</span>
                <span className="font-mono text-lg font-semibold text-text">{rupees(order.total)}</span>
              </div>
            </div>
          )}
        </motion.div>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <PixelButton onClick={() => navigate('/library')}>
            <Library className="h-4 w-4" /> Open library
          </PixelButton>
          <Link to="/explore" className="group inline-flex items-center gap-1.5 rounded-control px-4 py-3 text-sm font-medium text-muted transition-colors hover:text-text">
            Keep exploring <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </Page>
  )
}
