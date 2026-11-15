import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Lock, Trash2, X } from 'lucide-react'
import { Drawer, PixelButton, PriceTag } from '@/components/ui'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'
import { useCart, useRemoveFromCart } from '@/hooks/useCommerce'
import { useCheckout } from '@/features/checkout/useCheckout'
import { CATEGORY_MAP } from '@/lib/constants'
import { mediaUrl } from '@/lib/media'
import { generateIllustration } from '@/lib/pixelArt'

export function CartDrawer() {
  const open = useUiStore((s) => s.cartDrawerOpen)
  const peek = useUiStore((s) => s.cartDrawerPeek)
  const setOpen = useUiStore((s) => s.setCartDrawerOpen)
  const status = useAuthStore((s) => s.status)
  const { data, isLoading } = useCart()
  const remove = useRemoveFromCart()
  const { startCheckout, modal, isStarting } = useCheckout()
  const navigate = useNavigate()
  const reduce = useReducedMotion()
  const art = useMemo(() => generateIllustration('cart', 'drawer'), [])

  const close = () => setOpen(false)
  const onEnter = () => useUiStore.setState({ cartDrawerHovered: true })
  const onLeave = () => {
    useUiStore.setState({ cartDrawerHovered: false })
    // a peeking drawer closes once the pointer leaves it
    if (useUiStore.getState().cartDrawerPeek) useUiStore.setState({ cartDrawerOpen: false, cartDrawerPeek: false })
  }
  // any interaction promotes a peek into a normal open drawer
  const promote = () => { if (peek) useUiStore.setState({ cartDrawerPeek: false }) }

  const items = data?.items ?? []
  const count = items.length

  return (
    <>
      <Drawer
        open={open}
        onClose={close}
        peek={peek}
        title={
          <>
            Your cart
            {count > 0 && <span className="rounded-full bg-primary-soft px-2 py-0.5 font-mono text-xs text-primary">{count}</span>}
          </>
        }
      >
        <div className="flex h-full flex-col" onMouseEnter={onEnter} onMouseLeave={onLeave} onPointerDown={promote}>
          {status !== 'authed' ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <img src={art} alt="" className="pixelated h-28 w-28" />
              <div>
                <p className="font-display text-lg font-semibold text-text">Log in to use your cart</p>
                <p className="mt-1 text-sm text-muted">Your cart is saved to your account so it follows you everywhere.</p>
              </div>
              <PixelButton onClick={() => { close(); navigate('/login') }}>Log in</PixelButton>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col gap-3 p-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-16 w-16 animate-pulse rounded-control bg-surface-3" />
                  <div className="flex-1 space-y-2 py-1"><div className="h-4 w-3/4 animate-pulse rounded bg-surface-3" /><div className="h-3 w-1/3 animate-pulse rounded bg-surface-3" /></div>
                </div>
              ))}
            </div>
          ) : count === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <img src={art} alt="" className="pixelated h-32 w-32 animate-float" />
              <div>
                <p className="font-display text-lg font-semibold text-text">Your cart is empty</p>
                <p className="mx-auto mt-1 max-w-[260px] text-sm text-muted">Find sprites, sounds and tiles for your next build. They’ll wait here.</p>
              </div>
              <Link to="/explore" onClick={close} className="inline-flex items-center gap-1.5 rounded-control bg-surface-2 px-4 py-2.5 text-sm font-medium text-text ring-1 ring-border transition-colors hover:ring-border-strong">
                Explore assets <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <>
              <ul className="flex-1 overflow-y-auto px-3 py-2">
                <AnimatePresence initial={false}>
                  {items.map(({ asset }) => (
                    <motion.li
                      key={asset._id}
                      layout={!reduce}
                      initial={reduce ? false : { opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, x: 40, height: 0, marginTop: 0, marginBottom: 0 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      className="group flex gap-3 rounded-card p-2 transition-colors hover:bg-surface-2"
                    >
                      <Link to={`/asset/${asset.slug}`} onClick={close} className="shrink-0">
                        <img src={mediaUrl(asset.thumbnail.url)} alt="" className="pixelated h-16 w-16 rounded-control object-cover ring-1 ring-border" />
                      </Link>
                      <div className="min-w-0 flex-1 py-0.5">
                        <Link to={`/asset/${asset.slug}`} onClick={close} className="line-clamp-1 text-sm font-semibold text-text hover:text-primary">
                          {asset.title}
                        </Link>
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {asset.creator.name} · {CATEGORY_MAP.get(asset.category)?.label}
                        </p>
                        <PriceTag price={asset.price} size="sm" className="mt-1.5 block" />
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove ${asset.title} from cart`}
                        onClick={() => remove.mutate(asset._id)}
                        className="self-start rounded-control p-1.5 text-subtle opacity-60 transition-all hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>

              <div className="border-t border-border bg-surface-2/40 p-5">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-muted">Subtotal</span>
                  <PriceTag price={data?.subtotal ?? 0} size="lg" />
                </div>
                <div className="mt-3 rounded-control border border-border bg-surface p-3">
                  <div className="flex h-1.5 overflow-hidden rounded-full bg-surface-3">
                    <span className="h-full w-[90%] bg-gradient-to-r from-primary to-accent" />
                    <span className="h-full w-[10%] bg-border-strong" />
                  </div>
                  <p className="mt-2 text-[11px] leading-snug text-muted">
                    <span className="font-semibold text-text">90%</span> of your purchase goes straight to the creators.
                  </p>
                </div>
                <PixelButton className="mt-4 w-full" loading={isStarting} onClick={() => { promote(); void startCheckout() }}>
                  <Lock className="h-3.5 w-3.5" /> Checkout
                </PixelButton>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <Link to="/cart" onClick={close} className="font-medium text-muted hover:text-text">View cart</Link>
                  <button type="button" onClick={close} className="inline-flex items-center gap-1 text-subtle hover:text-text">
                    <X className="h-3 w-3" /> Keep browsing
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </Drawer>
      {modal}
    </>
  )
}
