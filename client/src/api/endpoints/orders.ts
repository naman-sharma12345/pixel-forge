import { apiGet, apiGetList, apiPost, type ListResult } from '../client'
import type { CheckoutBody, CheckoutResult, OrderListParams, OrderView } from '@/types/api'

export interface OrdersApi {
  checkout(body?: CheckoutBody): Promise<CheckoutResult>
  list(params?: OrderListParams): Promise<ListResult<OrderView>>
  byId(id: string): Promise<OrderView>
}

export const orders: OrdersApi = {
  checkout: (body) => apiPost('/orders/checkout', body ?? {}),
  list: (params) => apiGetList('/orders', params as Record<string, unknown>),
  byId: (id) => apiGet(`/orders/${id}`),
}
