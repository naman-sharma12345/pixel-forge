// Contract shapes — mirrors SHARED CONTRACT sections 4, 9 and 10.

export type Role = 'buyer' | 'creator' | 'admin'
export type Category =
  | 'sprites'
  | 'tilesets'
  | 'characters'
  | 'ui'
  | 'backgrounds'
  | 'vfx'
  | 'fonts'
  | '3d'
  | 'sfx'
  | 'music'
export type License = 'cc0' | 'standard' | 'extended'
export type MediaKind = 'image' | 'audio' | 'other'
export type AssetStatus = 'published' | 'rejected' | 'archived'
export type SortKey = 'relevance' | 'newest' | 'popular' | 'top-rated' | 'price-asc' | 'price-desc'
export type OrderStatus = 'created' | 'paid' | 'failed'
export type OrderProvider = 'mock' | 'free'
export type PreviewKind = 'image' | 'audio'

// ---------- Envelope ----------
export interface Meta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
}

export interface Envelope<T> {
  success: true
  data: T
  meta?: Meta
  message?: string
}

export interface ApiErrorDetail {
  path: string
  message: string
}

export interface ApiErrorBody {
  success: false
  error: {
    code: string
    message: string
    details?: ApiErrorDetail[]
  }
}

// ---------- Users ----------
export interface Socials {
  website: string
  twitter: string
  itchio: string
  github: string
}

export interface UserPublic {
  _id: string
  name: string
  username: string
  avatarUrl: string
  bio: string
  socials: Socials
  role: Role
  createdAt: string
}

export interface UserMe extends UserPublic {
  email: string
  wishlist: string[]
  lastLoginAt: string | null
}

export interface PublicUserStats {
  assetCount: number
  totalSales: number
  totalDownloads: number
  avgRating: number
}

export interface RegisterBody {
  name: string
  username: string
  email: string
  password: string
}

export interface LoginBody {
  identifier: string
  password: string
}

export interface UpdateMeBody {
  name?: string
  username?: string
  bio?: string
  socials?: Partial<Socials>
}

export interface UpdatePasswordBody {
  currentPassword: string
  newPassword: string
}

// ---------- Assets ----------
export interface AssetThumbnail {
  url: string
}

export interface AssetPreview {
  url: string
  kind: PreviewKind
}

export interface CreatorPublic {
  _id: string
  username: string
  name: string
  avatarUrl: string
}

export interface AssetCardStats {
  sales: number
  downloads: number
  ratingAvg: number
  ratingCount: number
}

export interface AssetCard {
  _id: string
  slug: string
  title: string
  category: Category
  mediaKind: MediaKind
  thumbnail: AssetThumbnail
  previewAudioUrl: string | null
  price: number
  isFree: boolean
  license: License
  tags: string[]
  isFeatured: boolean
  stats: AssetCardStats
  creator: CreatorPublic
  createdAt: string
}

export interface AssetMeta {
  resolution?: string
  frames?: number
  durationSec?: number
  bpm?: number
  loopable?: boolean
  sampleRate?: number
}

export interface AssetFileInfo {
  format: string
  bytes: number
  originalName: string
}

export interface AssetStats extends AssetCardStats {
  views: number
  wishlistCount: number
}

export interface AssetDetail extends Omit<AssetCard, 'stats'> {
  description: string
  previews: AssetPreview[]
  fileFormats: string[]
  meta: AssetMeta
  fileInfo: AssetFileInfo
  status: AssetStatus
  rejectionReason: string
  stats: AssetStats
  updatedAt: string
  isOwned: boolean
  inWishlist: boolean
  isMine: boolean
}

export interface MyAsset extends AssetCard {
  status: AssetStatus
  rejectionReason: string
}

export interface AssetListParams {
  q?: string
  category?: Category
  tags?: string
  minPrice?: number
  maxPrice?: number
  free?: 'true'
  license?: License
  mediaKind?: MediaKind
  creator?: string
  sort?: SortKey
  page?: number
  limit?: number
}

export interface MyAssetsParams {
  status?: AssetStatus
  page?: number
  limit?: number
}

export interface AssetHome {
  featured: AssetCard[]
  trending: AssetCard[]
  newest: AssetCard[]
  freebies: AssetCard[]
  audio: AssetCard[]
}

export interface CategoryCount {
  key: Category
  label: string
  count: number
  mediaKind: MediaKind
}

export interface TagCount {
  tag: string
  count: number
}

export interface CreateAssetFields {
  title: string
  description: string
  category: Category
  tags?: string
  price?: number
  license?: License
  fileFormats?: string
  meta?: string
}

export type CreateAssetBody = CreateAssetFields
export type UpdateAssetBody = Partial<CreateAssetFields>

// ---------- Reviews ----------
export interface ReviewUser {
  _id: string
  username: string
  name: string
  avatarUrl: string
}

export interface Review {
  _id: string
  rating: number
  comment: string
  createdAt: string
  updatedAt: string
  user: ReviewUser
}

export interface ReviewSummary {
  avg: number
  count: number
  distribution: Record<1 | 2 | 3 | 4 | 5, number>
}

export interface ReviewList {
  reviews: Review[]
  summary: ReviewSummary
}

export interface ReviewListParams {
  asset: string
  page?: number
  limit?: number
}

export interface CreateReviewBody {
  assetId: string
  rating: number
  comment?: string
}

export interface UpdateReviewBody {
  rating?: number
  comment?: string
}

// ---------- Cart ----------
export interface CartItem {
  asset: AssetCard
  addedAt: string
}

export interface CartView {
  items: CartItem[]
  subtotal: number
  count: number
}

export interface AddCartItemBody {
  assetId: string
}

// ---------- Orders & payments ----------
export interface OrderItemView {
  assetId: string
  title: string
  slug: string
  thumbnailUrl: string
  category: Category
  price: number
  license: License
  creatorEarning: number
}

export interface OrderView {
  _id: string
  items: OrderItemView[]
  subtotal: number
  platformFee: number
  total: number
  currency: 'INR'
  status: OrderStatus
  provider: OrderProvider
  paidAt: string | null
  createdAt: string
}

export interface CheckoutBody {
  assetIds?: string[]
}

export interface CheckoutResult {
  order: OrderView
  payment: {
    provider: 'mock'
    providerOrderId: string
  }
}

export interface MockConfirmBody {
  orderId: string
  outcome: 'success' | 'failure'
}

export interface ConfirmResult {
  order: OrderView
  purchasedAssetIds: string[]
}

export interface OrderListParams {
  page?: number
  limit?: number
}

// ---------- Library & downloads ----------
export interface LibraryItem {
  _id: string
  asset: AssetCard
  pricePaid: number
  downloadCount: number
  lastDownloadedAt: string | null
  createdAt: string
}

export interface LibraryParams {
  q?: string
  category?: Category
  page?: number
  limit?: number
}

export interface DownloadInfo {
  url: string
  expiresAt: string
  fileName: string
}

// ---------- Creator ----------
export interface CreatorTotals {
  revenue: number
  sales: number
  downloads: number
  views: number
  assets: number
  avgRating: number
  wishlists: number
}

export interface CreatorSeriesPoint {
  date: string
  revenue: number
  sales: number
}

export interface CreatorTopAsset {
  asset: AssetCard
  revenue: number
  sales: number
}

export interface CreatorCategoryBreakdown {
  category: Category
  sales: number
  revenue: number
}

export interface CreatorStats {
  totals: CreatorTotals
  series: CreatorSeriesPoint[]
  topAssets: CreatorTopAsset[]
  categoryBreakdown: CreatorCategoryBreakdown[]
}

export type CreatorRange = '7d' | '30d' | '90d'

export interface CreatorSale {
  orderId: string
  asset: { _id: string; title: string; slug: string; thumbnail: { url: string } }
  buyer: { username: string; avatarUrl: string }
  price: number
  creatorEarning: number
  paidAt: string | null
}

export interface CreatorSalesParams {
  page?: number
  limit?: number
}

// ---------- Admin ----------
export interface AdminStats {
  users: number
  creators: number
  assets: number
  orders: number
  revenue: number
  platformFees: number
  signupsSeries: { date: string; count: number }[]
  revenueSeries: { date: string; revenue: number }[]
}

export interface AdminUser extends UserPublic {
  email: string
  isBanned: boolean
}

export interface AdminUserParams {
  q?: string
  role?: Role
  banned?: 'true' | 'false'
  page?: number
  limit?: number
}

export interface AdminUserUpdateBody {
  role?: Role
  isBanned?: boolean
}

export interface AdminAssetParams {
  status?: AssetStatus
  q?: string
  page?: number
  limit?: number
}

export interface AdminAssetUpdateBody {
  status?: AssetStatus
  isFeatured?: boolean
  rejectionReason?: string
}

// ---------- Paged result ----------
export interface Paged<T> {
  items: T[]
  meta: Meta
}
