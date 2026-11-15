import type { AssetListParams, LibraryParams, MyAssetsParams, OrderListParams, AdminUserParams, AdminAssetParams, CreatorRange } from '@/types/api'

export const keys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  assets: {
    all: ['assets'] as const,
    list: (params?: AssetListParams) => ['assets', 'list', params ?? {}] as const,
    home: ['assets', 'home'] as const,
    categories: ['assets', 'categories'] as const,
    tags: ['assets', 'tags'] as const,
    mine: (params?: MyAssetsParams) => ['assets', 'mine', params ?? {}] as const,
    detail: (slug: string) => ['assets', 'detail', slug] as const,
    related: (slug: string) => ['assets', 'related', slug] as const,
  },
  reviews: {
    list: (assetId: string, page = 1) => ['reviews', assetId, page] as const,
  },
  cart: ['cart'] as const,
  orders: {
    all: ['orders'] as const,
    list: (params?: OrderListParams) => ['orders', 'list', params ?? {}] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
  },
  library: {
    all: ['library'] as const,
    list: (params?: LibraryParams) => ['library', 'list', params ?? {}] as const,
  },
  creator: {
    stats: (range: CreatorRange) => ['creator', 'stats', range] as const,
    sales: (page = 1) => ['creator', 'sales', page] as const,
  },
  admin: {
    stats: ['admin', 'stats'] as const,
    users: (params?: AdminUserParams) => ['admin', 'users', params ?? {}] as const,
    assets: (params?: AdminAssetParams) => ['admin', 'assets', params ?? {}] as const,
  },
  user: {
    byUsername: (username: string) => ['user', username] as const,
    wishlist: ['user', 'wishlist'] as const,
  },
}
