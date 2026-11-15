import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, Lock, ShieldCheck, Trash2, Zap } from 'lucide-react'
import { Page } from '@/components/layout'
import { Avatar, Button, EmptyState, Modal, PixelButton, PriceTag } from '@/components/ui'
import { useCart, useClearCart, useRemoveFromCart } from '@/hooks/useCommerce'
import { useCheckout } from '@/features/checkout/useCheckout'
import { CATEGORY_MAP, LICENSE_MAP } from '@/lib/constants'
import { mediaUrl } from '@/lib/media'

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`

export default function CartPage() {
  const { data, isLoading } = useCart()
  const remove = useRemoveFromCart()
  const clear = useClearCart()
  const { startCheckout, modal, isStarting } = useCheckout()
  const [confirmClear, setConfirmClear] = useState(false)
  const reduce = useReducedMotion()

  const items = data?.items ?? []
  const subtotal = data?.subtotal ?? 0
  const creatorShare = Math.round(subtotal * 0.9)

  return (
    <Page title="Cart" description="Review your cart before checkout.">
      <div className="mx-auto max-w-[1120px] px-4 pb-10 pt-8 sm:px-6 lg:px-8">
        <Link to="/explore" className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-text">
          <ArrowLeft className="h-4 w-4" /> Continue browsing
        </Link>
        <div className="mb-8 flex items-end justify-between gap-4">
          <h1 className="font-display text-3xl font-bold tracking-tight text-text">
            Your cart {items.length > 0 && <span className="ml-1 font-mono text-xl text-subtle">({items.length})</span>}
          </h1>
          {items.length > 0 && (
            <button type="button" onClick={() => setConfirmClear(true)} className="inline-flex items-center gap-1.5 text-sm text-subtle transition-colors hover:text-danger">
              <Trash2 className="h-3.5 w-3.5" /> Clear cart
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-card border border-border bg-surface" />)}</div>
            <div className="h-72 animate-pulse rounded-panel border border-border bg-surface" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            art="cart"
            title="Your cart is empty"
            text="Sprites, sounds and tilesets you add will wait here until you’re ready."
            action={
              <>
                <Link to="/explore"><Button>Explore assets</Button></Link>
                <Link to="/wishlist"><Button variant="secondary">Open wishlist</Button></Link>
              </>
            }
          />
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
            <ul className="flex flex-col gap-3">
              <AnimatePresence initial={false}>
                {items.map(({ asset }) => {
                  const cat = CATEGORY_MAP.get(asset.category)
                  return (
                    <motion.li
                      key={asset._id}
                      layout={!reduce}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, x: -30, height: 0, marginBottom: -12 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      className="group flex gap-4 rounded-card border border-border bg-surface p-3 transition-colors hover:border-border-strong sm:p-4"
                    >
                      <Link to={`/asset/${asset.slug}`} className="shrink-0">
                        <img src={mediaUrl(asset.thumbnail.url)} alt="" className="pixelated h-20 w-20 rounded-control object-cover ring-1 ring-border sm:h-24 sm:w-24" />
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs text-subtle">{cat?.label}</p>
                            <Link to={`/asset/${asset.slug}`} className="line-clamp-1 font-display text-base font-semibold text-text hover:text-primary">{asset.title}</Link>
                          </div>
                          <PriceTag price={asset.price} className="shrink-0 text-base" />
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
                          <Avatar src={asset.creator.avatarUrl} name={asset.creator.name} username={asset.creator.username} size={16} />
                          {asset.creator.name}
                        </div>
                        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
                          <span className="truncate rounded-md bg-surface-2 px-2 py-0.5 text-[11px] text-muted">{LICENSE_MAP.get(asset.license)?.label.split(' - ')[0]} license</span>
                          <button
                            type="button"
                            onClick={() => remove.mutate(asset._id)}
                            className="inline-flex items-center gap-1 rounded-control px-2 py-1 text-xs text-subtle transition-colors hover:bg-danger/10 hover:text-danger"
                            aria-label={`Remove ${asset.title} from cart`}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Remove
                          </button>
                        </div>
                      </div>
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </ul>

            <aside className="rounded-panel border border-border bg-surface p-5 sm:p-6 lg:sticky lg:top-20">
              <h2 className="font-display text-lg font-semibold text-text">Order summary</h2>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between"><dt className="text-muted">Subtotal · {items.length} item{items.length === 1 ? '' : 's'}</dt><dd className="font-mono text-text">{rupees(subtotal)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Platform fee (10%)</dt><dd className="font-mono text-success">Included</dd></div>
                <div className="flex justify-between"><dt className="text-muted">Taxes</dt><dd className="font-mono text-subtle">₹0 · demo</dd></div>
              </dl>
              <div className="my-5 h-px bg-border" />
              <div className="flex items-baseline justify-between">
                <span className="font-semibold text-text">Total</span>
                <span className="font-mono text-2xl font-semibold tracking-tight text-text">{rupees(subtotal)}</span>
              </div>
              <div className="mt-4 rounded-control border border-border bg-surface-2/60 p-3">
                <div className="flex h-1.5 overflow-hidden rounded-full">
                  <span className="h-full w-[90%] bg-gradient-to-r from-primary to-accent" />
                  <span className="h-full w-[10%] bg-border-strong" />
                </div>
                <p className="mt-2 text-[11px] text-muted">
                  <span className="font-mono text-text">{rupees(creatorShare)}</span> goes directly to the creators.
                </p>
              </div>
              <PixelButton size="lg" className="mt-5 w-full" loading={isStarting} onClick={() => void startCheckout()}>
                <Lock className="h-4 w-4" /> Checkout · {rupees(subtotal)}
              </PixelButton>
              <ul className="mt-5 space-y-2 text-xs text-muted">
                <li className="flex items-center gap-2"><Zap className="h-3.5 w-3.5 text-warning" /> Instant download after payment</li>
                <li className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-success" /> Demo checkout, no real money is charged</li>
              </ul>
            </aside>
          </div>
        )}
      </div>

      <Modal open={confirmClear} onClose={() => setConfirmClear(false)} title="Clear your cart?">
        <p className="text-sm text-muted">This removes all {items.length} item{items.length === 1 ? '' : 's'}. You can add them again from each asset page.</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmClear(false)}>Keep items</Button>
          <Button variant="danger" loading={clear.isPending} onClick={() => clear.mutate(undefined, { onSettled: () => setConfirmClear(false) })}>
            Clear {items.length} item{items.length === 1 ? '' : 's'}
          </Button>
        </div>
      </Modal>
      {modal}
    </Page>
  )
}
