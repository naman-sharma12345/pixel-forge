import { apiDelete, apiGet, apiPost } from '../client'
import type { AddCartItemBody, CartView } from '@/types/api'

export interface CartApi {
  get(): Promise<CartView>
  add(body: AddCartItemBody): Promise<CartView>
  remove(assetId: string): Promise<CartView>
  clear(): Promise<CartView>
}

export const cart: CartApi = {
  get: () => apiGet('/cart'),
  add: (body) => apiPost('/cart/items', body),
  remove: (assetId) => apiDelete(`/cart/items/${assetId}`),
  clear: () => apiDelete('/cart'),
}
