import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { Page } from '@/components/layout'
import { Button, Card, EmptyState, PriceTag, Skeleton } from '@/components/ui'
import { useCart, useClearCart, useRemoveFromCart } from '@/hooks/useCommerce'
import { mediaUrl } from '@/lib/media'

export default function CartPage() {
  const { data, isLoading } = useCart()
  const remove = useRemoveFromCart()
  const clear = useClearCart()

  return (
    <Page title="Cart — Pixel Forge" description="Review your cart before checkout.">
      <div className="mx-auto max-w-[900px] px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-6 font-display text-2xl font-bold text-text">Your cart</h1>
        {isLoading ? (
          <div className="flex flex-col gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            seed="cart-empty"
            kind="ui"
            title="Your cart is empty"
            text="Add some assets and they will appear here."
            action={<Link to="/explore"><Button>Explore assets</Button></Link>}
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            <ul className="flex flex-col gap-3">
              {data.items.map(({ asset }) => (
                <li key={asset._id}>
                  <Card className="flex gap-4 p-4">
                    <img src={mediaUrl(asset.thumbnail.url)} alt="" className="pixelated h-20 w-20 shrink-0 rounded-control border border-border object-cover" />
                    <div className="min-w-0 flex-1">
                      <Link to={`/asset/${asset.slug}`} className="block truncate font-medium text-text hover:text-primary">{asset.title}</Link>
                      <p className="text-xs text-muted">{asset.creator.name} · {asset.category}</p>
                      <div className="mt-2 flex items-center gap-3">
                        <PriceTag price={asset.price} size="sm" />
                        <button type="button" onClick={() => remove.mutate(asset._id)} className="inline-flex items-center gap-1 text-xs text-subtle hover:text-danger">
                          <Trash2 className="h-3.5 w-3.5" /> Remove
                        </button>
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
              <button type="button" onClick={() => clear.mutate()} className="self-start text-xs text-subtle hover:text-danger">
                Clear cart
              </button>
            </ul>
            <Card className="h-fit p-5">
              <h2 className="mb-3 font-display text-sm font-semibold text-text">Summary</h2>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">Subtotal</span>
                <PriceTag price={data.subtotal} />
              </div>
              <p className="mt-1 text-xs text-subtle">Platform fee and taxes calculated at checkout.</p>
              <Link to="/checkout/success" className="mt-4 block">
                <Button className="w-full">Proceed to checkout</Button>
              </Link>
            </Card>
          </div>
        )}
      </div>
    </Page>
  )
}
