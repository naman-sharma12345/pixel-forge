import { Link } from 'react-router-dom'
import { ShoppingBag, Trash2 } from 'lucide-react'
import { Drawer, Button, PriceTag, Skeleton } from '@/components/ui'
import { useUiStore } from '@/stores/ui'
import { useCart, useClearCart, useRemoveFromCart } from '@/hooks/useCommerce'
import { EmptyState } from '@/components/ui'
import { mediaUrl } from '@/lib/media'

/** Cart drawer shell — full contents arrive in a later milestone. */
export function CartDrawer() {
  const open = useUiStore((s) => s.cartDrawerOpen)
  const setOpen = useUiStore((s) => s.setCartDrawerOpen)
  const { data, isLoading } = useCart()
  const remove = useRemoveFromCart()
  const clear = useClearCart()

  return (
    <Drawer open={open} onClose={() => setOpen(false)} title="Your cart">
      {isLoading ? (
        <div className="flex flex-col gap-3 p-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="p-4">
          <EmptyState
            seed="cart-empty"
            kind="ui"
            title="Your cart is empty"
            text="Browse the marketplace and forge your next project."
            action={<Button onClick={() => setOpen(false)}><Link to="/explore">Explore assets</Link></Button>}
          />
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <ul className="flex-1 divide-y divide-border overflow-y-auto">
            {data.items.map(({ asset }) => (
              <li key={asset._id} className="flex gap-3 p-4">
                <img src={mediaUrl(asset.thumbnail.url)} alt="" className="pixelated h-14 w-14 shrink-0 rounded-control border border-border object-cover" />
                <div className="min-w-0 flex-1">
                  <Link to={`/asset/${asset.slug}`} onClick={() => setOpen(false)} className="block truncate text-sm font-medium text-text hover:text-primary">
                    {asset.title}
                  </Link>
                  <p className="text-xs text-muted">{asset.creator.name}</p>
                  <PriceTag price={asset.price} size="sm" className="mt-1" />
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${asset.title}`}
                  onClick={() => remove.mutate(asset._id)}
                  className="self-start text-subtle hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-border p-4">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="text-muted">Subtotal</span>
              <PriceTag price={data.subtotal} />
            </div>
            <Link to="/checkout/success" onClick={() => setOpen(false)} className="block">
              <Button className="w-full"><ShoppingBag className="h-4 w-4" /> Checkout</Button>
            </Link>
            <button type="button" onClick={() => clear.mutate()} className="mt-2 w-full text-center text-xs text-subtle hover:text-danger">
              Clear cart
            </button>
          </div>
        </div>
      )}
    </Drawer>
  )
}
