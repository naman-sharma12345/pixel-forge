import { apiGetList, apiPost, type ListResult } from '../client'
import type { LibraryItem, LibraryParams } from '@/types/api'

export interface LibraryApi {
  list(params?: LibraryParams): Promise<ListResult<LibraryItem>>
  claim(assetId: string): Promise<LibraryItem>
}

export const library: LibraryApi = {
  list: (params) => apiGetList('/library', params as Record<string, unknown>),
  claim: (assetId) => apiPost(`/library/claim/${assetId}`),
}
