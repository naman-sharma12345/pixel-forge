import { auth as realAuth, type AuthApi } from './endpoints/auth'
import { users as realUsers, type UsersApi } from './endpoints/users'
import { assets as realAssets, type AssetsApi } from './endpoints/assets'
import { reviews as realReviews, type ReviewsApi } from './endpoints/reviews'
import { cart as realCart, type CartApi } from './endpoints/cart'
import { orders as realOrders, type OrdersApi } from './endpoints/orders'
import { payments as realPayments, type PaymentsApi } from './endpoints/payments'
import { library as realLibrary, type LibraryApi } from './endpoints/library'
import { downloads as realDownloads, type DownloadsApi } from './endpoints/downloads'
import { creator as realCreator, type CreatorApi } from './endpoints/creator'
import { admin as realAdmin, type AdminApi } from './endpoints/admin'
import { mockApi } from '@/mocks'

export interface Api {
  auth: AuthApi
  users: UsersApi
  assets: AssetsApi
  reviews: ReviewsApi
  cart: CartApi
  orders: OrdersApi
  payments: PaymentsApi
  library: LibraryApi
  downloads: DownloadsApi
  creator: CreatorApi
  admin: AdminApi
}

const realApi: Api = {
  auth: realAuth,
  users: realUsers,
  assets: realAssets,
  reviews: realReviews,
  cart: realCart,
  orders: realOrders,
  payments: realPayments,
  library: realLibrary,
  downloads: realDownloads,
  creator: realCreator,
  admin: realAdmin,
}

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'

export const api: Api = USE_MOCKS ? mockApi : realApi
export { realApi, USE_MOCKS }
export * from './client'
