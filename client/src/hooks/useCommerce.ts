import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api'
import { keys } from './keys'
import type { LibraryParams, OrderListParams } from '@/types/api'

export function useCart() {
  return useQuery({ queryKey: keys.cart, queryFn: () => api.cart.get(), staleTime: 15_000 })
}

export function useCartCount() {
  const { data } = useCart()
  return data?.count ?? 0
}

export function useAddToCart() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (assetId: string) => api.cart.add({ assetId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.cart }),
  })
}

export function useRemoveFromCart() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (assetId: string) => api.cart.remove(assetId),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.cart }),
  })
}

export function useClearCart() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.cart.clear(),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.cart }),
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
