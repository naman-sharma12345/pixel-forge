import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { toast } from 'react-hot-toast'
import { api, isApiClientError } from '@/api'
import { keys } from './keys'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import type { AssetCard, CartView, LibraryParams, OrderListParams } from '@/types/api'

const EMPTY_CART: CartView = { items: [], subtotal: 0, count: 0 }

function cartError(err: unknown, fallback: string) {
  if (isApiClientError(err)) {
    if (err.code === 'ALREADY_OWNED') return 'You already own this'
    return err.message
  }
  return fallback
}

/** Opens the cart drawer briefly after a desktop add-to-cart (stays if hovered). */
let peekTimer: number | undefined

/** Desktop only: peek the cart drawer for 2 s; it stays open while hovered. */
function flashCartDrawer() {
  if (typeof window === 'undefined' || window.innerWidth < 1024) return
  const ui = useUiStore.getState()
  if (ui.cartDrawerOpen && !ui.cartDrawerPeek) return // already fully open
  useUiStore.setState({ cartDrawerOpen: true, cartDrawerPeek: true })
  window.clearTimeout(peekTimer)
  peekTimer = window.setTimeout(() => {
    const s = useUiStore.getState()
    if (s.cartDrawerPeek && !s.cartDrawerHovered) useUiStore.setState({ cartDrawerOpen: false, cartDrawerPeek: false })
  }, 2000)
}

export function useCart() {
  const status = useAuthStore((s) => s.status)
  return useQuery({ queryKey: keys.cart, queryFn: () => api.cart.get(), staleTime: 15_000, enabled: status === 'authed' })
}

export function useCartCount() {
  const { data } = useCart()
  return data?.count ?? 0
}

export interface AddToCartVars {
  assetId: string
  /** AssetCard shape for optimistic insertion (optional). */
  card?: AssetCard
}

export function useAddToCart() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ assetId }: AddToCartVars) => api.cart.add({ assetId }),
    onMutate: async ({ assetId, card }) => {
      await qc.cancelQueries({ queryKey: keys.cart })
      const prev = qc.getQueryData<CartView>(keys.cart)
      if (prev && card && !prev.items.some((i) => i.asset._id === assetId)) {
        const items = [...prev.items, { asset: card, addedAt: new Date().toISOString() }]
        qc.setQueryData<CartView>(keys.cart, {
          items,
          subtotal: items.reduce((s, i) => s + i.asset.price, 0),
          count: items.length,
        })
      }
      return { prev }
    },
    onSuccess: (data) => {
      qc.setQueryData(keys.cart, data)
      flashCartDrawer()
      toast.success('Added to cart')
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(keys.cart, ctx.prev)
      toast.error(cartError(err, 'Could not add to cart'))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.cart }),
  })
}

export function useRemoveFromCart() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (assetId: string) => api.cart.remove(assetId),
    onMutate: async (assetId) => {
      await qc.cancelQueries({ queryKey: keys.cart })
      const prev = qc.getQueryData<CartView>(keys.cart)
      if (prev) {
        const items = prev.items.filter((i) => i.asset._id !== assetId)
        qc.setQueryData<CartView>(keys.cart, {
          items,
          subtotal: items.reduce((s, i) => s + i.asset.price, 0),
          count: items.length,
        })
      }
      return { prev }
    },
    onSuccess: (data) => qc.setQueryData(keys.cart, data),
    onError: (err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(keys.cart, ctx.prev)
      toast.error(cartError(err, 'Could not remove item'))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.cart }),
  })
}

export function useClearCart() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.cart.clear(),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: keys.cart })
      const prev = qc.getQueryData<CartView>(keys.cart)
      qc.setQueryData<CartView>(keys.cart, EMPTY_CART)
      return { prev }
    },
    onSuccess: (data) => qc.setQueryData(keys.cart, data),
    onError: (err, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(keys.cart, ctx.prev)
      toast.error(cartError(err, 'Could not clear cart'))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.cart }),
  })
}

export function useOrders(params?: OrderListParams) {
  return useQuery({ queryKey: keys.orders.list(params), queryFn: () => api.orders.list(params) })
}

export function useOrder(id: string | undefined) {
  return useQuery({ queryKey: keys.orders.detail(id ?? ''), queryFn: () => api.orders.byId(id!), enabled: !!id })
}

export function useCheckout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (assetIds?: string[]) => api.orders.checkout(assetIds ? { assetIds } : {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.cart }),
  })
}

export function useConfirmPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { orderId: string; outcome: 'success' | 'failure' }) => api.payments.mockConfirm(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.cart })
      qc.invalidateQueries({ queryKey: keys.orders.all })
      qc.invalidateQueries({ queryKey: keys.library.all })
      qc.invalidateQueries({ queryKey: ['assets'] })
    },
  })
}

export function useLibrary(params?: LibraryParams) {
  return useQuery({ queryKey: keys.library.list(params), queryFn: () => api.library.list(params) })
}

export function useClaimAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (assetId: string) => api.library.claim(assetId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.library.all })
      qc.invalidateQueries({ queryKey: ['assets'] })
    },
  })
}

/** Set of asset ids the current user owns (first library page, authed only). */
export function useOwnedAssetIds(): Set<string> {
  const status = useAuthStore((s) => s.status)
  const { data } = useQuery({
    queryKey: [...keys.library.all, 'owned-ids'],
    queryFn: () => api.library.list({ limit: 48 }),
    enabled: status === 'authed',
    staleTime: 30_000,
  })
  return useMemo(() => new Set(data?.items.map((i) => i.asset._id) ?? []), [data])
}

export function useReviews(assetId: string | undefined, page = 1) {
  return useQuery({
    queryKey: keys.reviews.list(assetId ?? '', page),
    queryFn: () => api.reviews.list({ asset: assetId!, page }),
    enabled: !!assetId,
  })
}

export function usePublicUser(username: string | undefined) {
  return useQuery({
    queryKey: keys.user.byUsername(username ?? ''),
    queryFn: () => api.users.byUsername(username!),
    enabled: !!username,
  })
}

// ---------- reviews ----------
export function useReviewsPage(assetId: string | undefined, page = 1) {
  return useQuery({
    queryKey: [...keys.reviews.list(assetId ?? '', 1), 'page', page],
    queryFn: () => api.reviews.list({ asset: assetId!, page, limit: 5 }),
    enabled: !!assetId,
    placeholderData: (prev) => prev,
  })
}

export function useCreateReview(assetId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { rating: number; comment?: string }) => api.reviews.create({ assetId, ...body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews', assetId] })
      qc.invalidateQueries({ queryKey: ['assets'] })
    },
  })
}

export function useUpdateReview(assetId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; rating?: number; comment?: string }) => api.reviews.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews', assetId] })
      qc.invalidateQueries({ queryKey: ['assets'] })
    },
  })
}

export function useDeleteReview(assetId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.reviews.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews', assetId] })
      qc.invalidateQueries({ queryKey: ['assets'] })
    },
  })
}

// ---------- downloads ----------
export function useDownloadAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (assetId: string) => {
      const { downloadAsset } = await import('@/lib/download')
      return downloadAsset(assetId)
    },
    onSuccess: (ok) => {
      if (!ok) return
      toast.success('Download started')
      qc.invalidateQueries({ queryKey: keys.library.all })
    },
  })
}
