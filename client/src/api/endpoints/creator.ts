import { apiGet, apiGetList, type ListResult } from '../client'
import type { CreatorRange, CreatorSale, CreatorStats } from '@/types/api'

export interface CreatorApi {
  stats(range?: CreatorRange): Promise<CreatorStats>
  sales(params?: { page?: number; limit?: number }): Promise<ListResult<CreatorSale>>
}

export const creator: CreatorApi = {
  stats: (range = '30d') => apiGet('/creator/stats', { range }),
  sales: (params) => apiGetList('/creator/sales', params as Record<string, unknown>),
}
