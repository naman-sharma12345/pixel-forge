import { ApiClientError, type ListResult } from '@/api/client'
import type { AuthApi } from '@/api/endpoints/auth'
import type { UsersApi } from '@/api/endpoints/users'
import type { AssetsApi } from '@/api/endpoints/assets'
import type { ReviewsApi, ReviewListResult } from '@/api/endpoints/reviews'
import type { CartApi } from '@/api/endpoints/cart'
import type { OrdersApi } from '@/api/endpoints/orders'
import type { PaymentsApi } from '@/api/endpoints/payments'
import type { LibraryApi } from '@/api/endpoints/library'
import type { DownloadsApi } from '@/api/endpoints/downloads'
import type { CreatorApi } from '@/api/endpoints/creator'
import type { AdminApi } from '@/api/endpoints/admin'
import type {
  AdminAssetParams,
  AdminAssetUpdateBody,
  AdminStats,
  AdminUser,
  AdminUserParams,
  AdminUserUpdateBody,
  AssetCard,
  AssetDetail,
  AssetHome,
  AssetListParams,
  AssetMeta,
  AssetPreview,
  AssetStatus,
  CartView,
  Category,
  CategoryCount,
  CheckoutBody,
  CheckoutResult,
  ConfirmResult,
  CreatorRange,
  CreatorSale,
  CreatorStats,
  DownloadInfo,
  LibraryItem,
  License,
  LoginBody,
  Meta,
  MockConfirmBody,
  MyAsset,
  MyAssetsParams,
  OrderView,
  PublicUserStats,
  RegisterBody,
  Review,
  ReviewListParams,
  ReviewSummary,
  TagCount,
  UpdateAssetBody,
  UpdateMeBody,
  UpdatePasswordBody,
  UserMe,
  UserPublic,
} from '@/types/api'
import type { Api } from '@/api'
import { db, earningFor, feeFor, getSessionUserId, rid, saveDb, setSessionUserId, type MockAsset, type MockDb, type MockOrder, type MockPurchase, type MockReview, type MockUser } from './db'
import { audioPreviewUrl, type AudioKind } from './wav'
import { generateAvatar, generateSpriteSheet, generateSpriteThumb } from '@/lib/pixelArt'
import { CATEGORY_MAP } from '@/lib/constants'
import type { CreateAssetBody, CreateReviewBody, UpdateReviewBody } from '@/types/api'

// ---------- helpers ----------
const delay = () => new Promise((r) => setTimeout(r, 250 + Math.random() * 350))
function fail(status: number, code: string, message: string, details?: { path: string; message: string }[]): never {
  throw new ApiClientError(status, code, message, details)
}

/** Simulates multipart upload progress so the client progress UI behaves like the real API. */
async function simulateUpload(totalBytes: number, onProgress?: (p: number) => void) {
  if (!onProgress) return
  const steps = Math.min(24, Math.max(8, Math.round(totalBytes / 200_000)))
  for (let i = 1; i <= steps; i++) {
    await new Promise((r) => setTimeout(r, 70 + Math.random() * 60))
    onProgress(Math.round((i / steps) * 100))
  }
}

const CATEGORY_KEYS = ['sprites', 'tilesets', 'characters', 'ui', 'backgrounds', 'vfx', 'fonts', '3d', 'sfx', 'music']

/** Mirrors the server zod rules for asset fields; partial = PATCH. */
function validateAssetBody(body: Partial<CreateAssetBody>, partial: boolean) {
  const d: { path: string; message: string }[] = []
  const has = (k: keyof CreateAssetBody) => body[k] !== undefined
  if (!partial || has('title')) {
    const t = (body.title ?? '').trim()
    if (t.length < 3 || t.length > 80) d.push({ path: 'title', message: 'Title must be 3-80 characters' })
  }
  if (!partial || has('description')) {
    const t = (body.description ?? '').trim()
    if (t.length < 20 || t.length > 5000) d.push({ path: 'description', message: 'Description must be 20-5000 characters' })
  }
  if (!partial || has('category')) {
    if (!CATEGORY_KEYS.includes(String(body.category))) d.push({ path: 'category', message: 'Pick a valid category' })
  }
  if (has('price')) {
    const n = Number(body.price)
    if (!Number.isInteger(n) || n < 0 || n > 50000) d.push({ path: 'price', message: 'Price must be a whole number of rupees from 0 to 50,000' })
  }
  if (has('license') && !['cc0', 'standard', 'extended'].includes(String(body.license))) d.push({ path: 'license', message: 'Pick a valid license' })
  if (has('tags')) {
    const tags = String(body.tags).split(',').map((t) => t.trim()).filter(Boolean)
    if (tags.length > 10) d.push({ path: 'tags', message: 'Use at most 10 tags' })
    if (tags.some((t) => t.length > 24)) d.push({ path: 'tags', message: 'Each tag must be 24 characters or fewer' })
  }
  if (has('meta') && body.meta) {
    try { JSON.parse(String(body.meta)) } catch { d.push({ path: 'meta', message: 'Meta must be valid JSON' }) }
  }
  if (d.length) fail(400, 'VALIDATION_ERROR', 'Some fields need attention', d)
}
function badRequest(m: string): never { return fail(400, 'BAD_REQUEST', m) }
function unauthorized(m = 'Authentication required'): never { return fail(401, 'UNAUTHORIZED', m) }
function forbidden(m = 'You do not have permission to do that'): never { return fail(403, 'FORBIDDEN', m) }
function notFound(m = 'Not found'): never { return fail(404, 'NOT_FOUND', m) }
function conflict(m: string, code = 'CONFLICT'): never { return fail(409, code, m) }

function currentUser(): MockUser {
  const id = getSessionUserId()
  const user = id ? db.users.find((u) => u._id === id) : undefined
  if (!user) unauthorized()
  if (user!.isBanned) fail(403, 'ACCOUNT_BANNED', 'This account has been banned')
  return user!
}

function optionalUser(): MockUser | null {
  const id = getSessionUserId()
  const user = id ? db.users.find((u) => u._id === id) : undefined
  if (!user || user.isBanned) return null
  return user
}

function requireRole(...roles: MockUser['role'][]) {
  const u = currentUser()
  if (!roles.includes(u.role)) forbidden()
  return u
}

function paginate<T>(arr: T[], page = 1, limit = 24): { items: T[]; meta: Meta } {
  const p = Math.max(1, page)
  const l = Math.min(48, Math.max(1, limit))
  const total = arr.length
  const totalPages = Math.max(1, Math.ceil(total / l))
  const items = arr.slice((p - 1) * l, p * l)
  return { items, meta: { page: p, limit: l, total, totalPages, hasNext: p < totalPages } }
}

function listResult<T>(arr: T[], params?: { page?: number; limit?: number }): ListResult<T> {
  const { items, meta } = paginate(arr, params?.page, params?.limit)
  return { items, meta }
}

function cloneUserPublic(u: MockUser): UserPublic {
  return {
    _id: u._id, name: u.name, username: u.username, avatarUrl: u.avatarUrl,
    bio: u.bio, socials: { ...u.socials }, role: u.role, createdAt: u.createdAt,
  }
}

function toUserMe(u: MockUser): UserMe {
  return { ...cloneUserPublic(u), email: u.email, wishlist: [...u.wishlist], lastLoginAt: u.lastLoginAt }
}

function toAdminUser(u: MockUser): AdminUser {
  return { ...cloneUserPublic(u), email: u.email, isBanned: u.isBanned }
}

function previewUrl(a: MockAsset, p: MockAsset['previewSeeds'][number], index: number): { url: string; kind: 'image' | 'audio' } {
  if (p.kind === 'audio') return { url: audioPreviewUrl((p.audio ?? 'loop') as AudioKind), kind: 'audio' }
  // the first image preview of an animated asset is a real sprite sheet with meta.frames cells
  const frames = typeof a.meta.frames === 'number' ? a.meta.frames : 0
  if (index === 0 && frames > 1) return { url: generateSpriteSheet(p.seed, frames, a.category), kind: 'image' }
  return { url: generateSpriteThumb(p.seed, a.category), kind: 'image' }
}

function thumbUrl(a: MockAsset): string {
  return a.thumbUrl ?? generateSpriteThumb(a.thumbSeed, a.category)
}

function previewAudioOf(a: MockAsset): string | null {
  const p = a.previewSeeds.find((x) => x.kind === 'audio')
  return p ? audioPreviewUrl((p.audio ?? 'loop') as AudioKind) : null
}

function toCard(a: MockAsset): AssetCard {
  const creator = db.users.find((u) => u._id === a.creator)
  return {
    _id: a._id,
    slug: a.slug,
    title: a.title,
    category: a.category,
    mediaKind: a.mediaKind,
    thumbnail: { url: thumbUrl(a) },
    previewAudioUrl: previewAudioOf(a),
    price: a.price,
    isFree: a.price === 0,
    license: a.license,
    tags: [...a.tags],
    isFeatured: a.isFeatured,
    stats: {
      sales: a.stats.sales,
      downloads: a.stats.downloads,
      ratingAvg: a.stats.ratingAvg,
      ratingCount: a.stats.ratingCount,
    },
    creator: creator
      ? { _id: creator._id, username: creator.username, name: creator.name, avatarUrl: creator.avatarUrl }
      : { _id: '', username: 'unknown', name: 'Unknown', avatarUrl: '' },
    createdAt: a.createdAt,
  }
}

function owns(userId: string, assetId: string): boolean {
  return db.purchases.some((p) => p.user === userId && p.asset === assetId)
}

function toDetail(a: MockAsset, viewer: MockUser | null): AssetDetail {
  const card = toCard(a)
  const previews: AssetPreview[] = a.previewUrls?.length
    ? a.previewUrls.map((p) => ({ url: p.url, kind: p.kind }))
    : a.previewSeeds.map((p, i) => previewUrl(a, p, i))
  return {
    ...card,
    description: a.description,
    previews,
    fileFormats: [...a.fileFormats],
    meta: { ...(a.meta as AssetMeta) },
    fileInfo: { ...a.fileInfo },
    status: a.status,
    rejectionReason: a.rejectionReason,
    stats: { ...a.stats },
    updatedAt: a.updatedAt,
    isOwned: viewer ? owns(viewer._id, a._id) : false,
    inWishlist: viewer ? viewer.wishlist.includes(a._id) : false,
    isMine: viewer ? viewer._id === a.creator : false,
  }
}

function toMyAsset(a: MockAsset): MyAsset {
  return { ...toCard(a), status: a.status, rejectionReason: a.rejectionReason }
}

function visibleAsset(slugOrId: string, viewer: MockUser | null): MockAsset {
  const a = db.assets.find((x) => x.slug === slugOrId || x._id === slugOrId)
  if (!a) notFound('Asset not found')
  const isOwner = viewer && (viewer._id === a!.creator || viewer.role === 'admin')
  if (a!.status !== 'published' && !isOwner) notFound('Asset not found')
  return a!
}

function recomputeRating(assetId: string) {
  const rs = db.reviews.filter((r) => r.asset === assetId)
  const a = db.assets.find((x) => x._id === assetId)
  if (!a) return
  a.stats.ratingCount = rs.length
  a.stats.ratingAvg = rs.length ? Math.round((rs.reduce((s, r) => s + r.rating, 0) / rs.length) * 10) / 10 : 0
}

function orderView(o: MockOrder): OrderView {
  return {
    _id: o._id,
    items: o.items.map((i) => {
      const a = db.assets.find((x) => x._id === i.asset)
      return {
        assetId: i.asset,
        title: i.title,
        slug: a?.slug ?? '',
        thumbnailUrl: a ? thumbUrl(a) : '',
        category: a?.category ?? 'sprites',
        price: i.price,
        license: i.license,
        creatorEarning: i.creatorEarning,
      }
    }),
    subtotal: o.subtotal,
    platformFee: o.platformFee,
    total: o.total,
    currency: 'INR',
    status: o.status,
    provider: o.provider,
    paidAt: o.paidAt,
    createdAt: o.createdAt,
  }
}

function libraryItem(p: MockPurchase): LibraryItem {
  const a = db.assets.find((x) => x._id === p.asset)
  return {
    _id: p._id,
    asset: a ? toCard(a) : ({} as AssetCard),
    pricePaid: p.pricePaid,
    downloadCount: p.downloadCount,
    lastDownloadedAt: p.lastDownloadedAt,
    createdAt: p.createdAt,
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(file)
  })
}

function slugifyTitle(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function parseAssetBody(body: CreateAssetBody | UpdateAssetBody) {
  const out: Partial<MockAsset> = {}
  if (body.title !== undefined) out.title = body.title
  if (body.description !== undefined) out.description = body.description
  if (body.category !== undefined) {
    out.category = body.category as Category
    out.mediaKind = body.category === 'sfx' || body.category === 'music' ? 'audio' : body.category === 'fonts' || body.category === '3d' ? 'other' : 'image'
  }
  if (body.tags !== undefined) out.tags = body.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 10)
  if (body.price !== undefined) out.price = Math.max(0, Math.round(Number(body.price) || 0))
  if (body.license !== undefined) out.license = body.license as License
  if (body.fileFormats !== undefined) out.fileFormats = body.fileFormats.split(',').map((f) => f.trim().toLowerCase()).filter(Boolean)
  if (body.meta !== undefined && body.meta) {
    try { out.meta = JSON.parse(body.meta) as Record<string, unknown> } catch { /* ignore */ }
  }
  return out
}

// ---------- auth ----------
export const mockAuth: AuthApi = {
  async register(body: RegisterBody) {
    await delay()
    const { name, username, email, password } = body
    if (db.users.some((u) => u.username === username.toLowerCase())) conflict('Username is already taken')
    if (db.users.some((u) => u.email === email.toLowerCase())) conflict('Email is already registered')
    if (!/^[a-z0-9_]{3,20}$/.test(username)) fail(400, 'VALIDATION_ERROR', 'Invalid username')
    if (password.length < 8 || password.length > 72 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      fail(400, 'VALIDATION_ERROR', 'Password must be 8-72 characters with at least one letter and one number')
    }
    const user: MockUser = {
      _id: rid('u'), name, username: username.toLowerCase(), email: email.toLowerCase(),
      password, role: 'buyer', avatarUrl: generateAvatar(username), avatarKey: '',
      bio: '', socials: { website: '', twitter: '', itchio: '', github: '' },
      wishlist: [], tokenVersion: 0, isBanned: false, lastLoginAt: new Date().toISOString(),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }
    db.users.push(user)
    setSessionUserId(user._id)
    saveDb(db)
    return { user: toUserMe(user), accessToken: `mock_${user._id}_${user.tokenVersion}` }
  },

  async login(body: LoginBody) {
    await delay()
    const id = body.identifier.trim().toLowerCase()
    const user = db.users.find((u) => u.email === id || u.username === id)
    if (!user || user.password !== body.password) fail(401, 'INVALID_CREDENTIALS', 'Invalid email/username or password')
    if (user.isBanned) fail(403, 'ACCOUNT_BANNED', 'This account has been banned')
    user.lastLoginAt = new Date().toISOString()
    user.updatedAt = new Date().toISOString()
    setSessionUserId(user._id)
    saveDb(db)
    return { user: toUserMe(user), accessToken: `mock_${user._id}_${user.tokenVersion}` }
  },

  async refresh() {
    await delay()
    const user = currentUser()
    return { user: toUserMe(user), accessToken: `mock_${user._id}_${user.tokenVersion}` }
  },

  async logout() {
    await delay()
    const user = currentUser()
    user.tokenVersion += 1
    setSessionUserId(null)
    saveDb(db)
    return null
  },
}

// ---------- users ----------
export const mockUsers: UsersApi = {
  async me() { await delay(); return toUserMe(currentUser()) },

  async updateMe(body: UpdateMeBody) {
    await delay()
    const u = currentUser()
    if (body.name !== undefined) u.name = body.name
    if (body.username !== undefined) {
      const un = body.username.toLowerCase()
      if (db.users.some((x) => x.username === un && x._id !== u._id)) conflict('Username is already taken')
      u.username = un
    }
    if (body.bio !== undefined) u.bio = body.bio
    if (body.socials !== undefined) u.socials = { ...u.socials, ...body.socials }
    u.updatedAt = new Date().toISOString()
    saveDb(db)
    return toUserMe(u)
  },

  async uploadAvatar(file: File) {
    await delay()
    const u = currentUser()
    u.avatarUrl = await fileToDataUrl(file)
    u.avatarKey = `avatars/${rid('av')}`
    u.updatedAt = new Date().toISOString()
    saveDb(db)
    return toUserMe(u)
  },

  async updatePassword(body: UpdatePasswordBody) {
    await delay()
    const u = currentUser()
    if (u.password !== body.currentPassword) fail(401, 'INVALID_CREDENTIALS', 'Current password is incorrect')
    u.password = body.newPassword
    u.tokenVersion += 1
    saveDb(db)
    return null
  },

  async becomeCreator() {
    await delay()
    const u = currentUser()
    if (u.role === 'buyer') u.role = 'creator'
    saveDb(db)
    return toUserMe(u)
  },

  async wishlist() {
    await delay()
    const u = currentUser()
    return u.wishlist.map((id) => db.assets.find((a) => a._id === id)).filter((a): a is MockAsset => !!a && a.status === 'published').map(toCard)
  },

  async addWishlist(assetId: string) {
    await delay()
    const u = currentUser()
    const a = db.assets.find((x) => x._id === assetId)
    if (!a || a.status !== 'published') notFound('Asset not found')
    if (!u.wishlist.includes(assetId)) {
      u.wishlist.push(assetId)
      a.stats.wishlistCount += 1
      saveDb(db)
    }
    return { wishlist: [...u.wishlist] }
  },

  async removeWishlist(assetId: string) {
    await delay()
    const u = currentUser()
    const idx = u.wishlist.indexOf(assetId)
    if (idx >= 0) {
      u.wishlist.splice(idx, 1)
      const a = db.assets.find((x) => x._id === assetId)
      if (a) a.stats.wishlistCount = Math.max(0, a.stats.wishlistCount - 1)
      saveDb(db)
    }
    return { wishlist: [...u.wishlist] }
  },

  async byUsername(username: string) {
    await delay()
    const u = db.users.find((x) => x.username === username.toLowerCase())
    if (!u) notFound('User not found')
    const myAssets = db.assets.filter((a) => a.creator === u!._id && a.status === 'published')
    const assetIds = new Set(myAssets.map((a) => a._id))
    const myReviews = db.reviews.filter((r) => assetIds.has(r.asset))
    const stats: PublicUserStats = {
      assetCount: myAssets.length,
      totalSales: myAssets.reduce((s, a) => s + a.stats.sales, 0),
      totalDownloads: myAssets.reduce((s, a) => s + a.stats.downloads, 0),
      avgRating: myReviews.length ? Math.round((myReviews.reduce((s, r) => s + r.rating, 0) / myReviews.length) * 10) / 10 : 0,
    }
    return { user: cloneUserPublic(u!), stats }
  },
}

// ---------- assets ----------
function filterAssets(params: AssetListParams = {}): MockAsset[] {
  let list = db.assets.filter((a) => a.status === 'published')
  const q = params.q?.trim().toLowerCase()
  if (q) {
    list = list.filter((a) =>
      a.title.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.tags.some((t) => t.includes(q)),
    )
  }
  if (params.category) list = list.filter((a) => a.category === params.category)
  if (params.tags) {
    const wanted = params.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
    list = list.filter((a) => wanted.every((t) => a.tags.includes(t)))
  }
  if (params.minPrice !== undefined) list = list.filter((a) => a.price >= Number(params.minPrice))
  if (params.maxPrice !== undefined) list = list.filter((a) => a.price <= Number(params.maxPrice))
  if (params.free === 'true') list = list.filter((a) => a.price === 0)
  if (params.license) list = list.filter((a) => a.license === params.license)
  if (params.mediaKind) list = list.filter((a) => a.mediaKind === params.mediaKind)
  if (params.creator) {
    const cu = db.users.find((u) => u.username === params.creator!.toLowerCase())
    list = list.filter((a) => a.creator === (cu?._id ?? ''))
  }
  const sort = params.sort ?? 'newest'
  const byDate = (x: MockAsset, y: MockAsset) => y.createdAt.localeCompare(x.createdAt)
  switch (sort) {
    case 'newest': list.sort(byDate); break
    case 'popular': list.sort((x, y) => y.stats.sales - x.stats.sales); break
    case 'top-rated': list.sort((x, y) => y.stats.ratingAvg - x.stats.ratingAvg); break
    case 'price-asc': list.sort((x, y) => x.price - y.price); break
    case 'price-desc': list.sort((x, y) => y.price - x.price); break
    case 'relevance':
      if (q) {
        list.sort((x, y) => {
          const xs = x.title.toLowerCase().startsWith(q) ? 0 : 1
          const ys = y.title.toLowerCase().startsWith(q) ? 0 : 1
          return xs - ys || y.stats.sales - x.stats.sales
        })
      } else list.sort(byDate)
      break
  }
  return list
}

export const mockAssets: AssetsApi = {
  async list(params) { await delay(); return listResult(filterAssets(params).map(toCard), params) },

  async home() {
    await delay()
    const pub = db.assets.filter((a) => a.status === 'published')
    const bySales = [...pub].sort((x, y) => y.stats.sales - x.stats.sales)
    const byDate = [...pub].sort((x, y) => y.createdAt.localeCompare(x.createdAt))
    const slice = (arr: MockAsset[]) => arr.slice(0, 8).map(toCard)
    return {
      featured: slice(pub.filter((a) => a.isFeatured)),
      trending: slice(bySales),
      newest: slice(byDate),
      freebies: slice([...pub.filter((a) => a.price === 0)].sort((x, y) => y.createdAt.localeCompare(x.createdAt))),
      audio: slice([...pub.filter((a) => a.mediaKind === 'audio')].sort((x, y) => y.stats.sales - x.stats.sales)),
    } satisfies AssetHome
  },

  async categories() {
    await delay()
    const pub = db.assets.filter((a) => a.status === 'published')
    return ([...CATEGORY_MAP.keys()] as Category[]).map((key) => ({
      key,
      label: CATEGORY_MAP.get(key)!.label,
      count: pub.filter((a) => a.category === key).length,
      mediaKind: CATEGORY_MAP.get(key)!.mediaKind,
    })) satisfies CategoryCount[]
  },

  async tags() {
    await delay()
    const counts = new Map<string, number>()
    for (const a of db.assets.filter((x) => x.status === 'published')) {
      for (const t of a.tags) counts.set(t, (counts.get(t) ?? 0) + 1)
    }
    return [...counts.entries()].sort((x, y) => y[1] - x[1]).slice(0, 30)
      .map(([tag, count]) => ({ tag, count })) satisfies TagCount[]
  },

  async mine(params?: MyAssetsParams) {
    await delay()
    const u = requireRole('creator', 'admin')
    let list = db.assets.filter((a) => a.creator === u._id || u.role === 'admin')
    if (params?.status) list = list.filter((a) => a.status === params.status)
    list = [...list].sort((x, y) => y.createdAt.localeCompare(x.createdAt))
    return listResult(list.map(toMyAsset), params)
  },

  async bySlug(slug: string) {
    await delay()
    const viewer = optionalUser()
    const a = visibleAsset(slug, viewer)
    a.stats.views += 1
    saveDb(db)
    return toDetail(a, viewer)
  },

  async related(slug: string) {
    await delay()
    const a = db.assets.find((x) => x.slug === slug)
    if (!a) return []
    return db.assets
      .filter((x) => x.status === 'published' && x._id !== a._id && x.category === a.category)
      .sort((x, y) => y.stats.sales - x.stats.sales)
      .slice(0, 6)
      .map(toCard)
  },

  async create(body: CreateAssetBody, files: { thumbnail: File; previews?: File[]; file: File }, onProgress?: (p: number) => void) {
    const u = requireRole('creator', 'admin')
    validateAssetBody(body, false)
    if (!files?.thumbnail) fail(400, 'VALIDATION_ERROR', 'A thumbnail is required', [{ path: 'thumbnail', message: 'A thumbnail image is required' }])
    if (!files?.file) fail(400, 'VALIDATION_ERROR', 'The main file is required', [{ path: 'file', message: 'Upload the file buyers will download' }])
    const bytes = [files.thumbnail, files.file, ...(files.previews ?? [])].reduce((s, f) => s + (f?.size ?? 0), 0)
    await simulateUpload(bytes, onProgress)
    const patch = parseAssetBody(body)
    const category = (patch.category ?? body.category) as Category
    const mk = category === 'sfx' || category === 'music' ? 'audio' : category === 'fonts' || category === '3d' ? 'other' : 'image'
    const title = body.title?.trim() ?? ''
    if (title.length < 3) fail(400, 'VALIDATION_ERROR', 'Title must be at least 3 characters')
    const asset: MockAsset = {
      _id: rid('a'),
      slug: `${slugifyTitle(title)}-${rid('s')}`,
      title,
      description: body.description ?? '',
      creator: u._id,
      category,
      mediaKind: mk,
      tags: patch.tags ?? [],
      price: patch.price ?? 0,
      license: (patch.license ?? 'standard') as License,
      fileFormats: patch.fileFormats ?? [],
      meta: (patch.meta as Record<string, unknown>) ?? {},
      thumbSeed: `up-${rid('t')}`,
      thumbUrl: files.thumbnail ? await fileToDataUrl(files.thumbnail) : undefined,
      previewSeeds: [],
      previewUrls: [],
      fileInfo: files.file
        ? { format: (files.file.name.split('.').pop() ?? 'bin').toLowerCase(), bytes: files.file.size, originalName: files.file.name }
        : { format: 'zip', bytes: 0, originalName: 'asset.zip' },
      status: 'published',
      rejectionReason: '',
      isFeatured: false,
      stats: { views: 0, downloads: 0, sales: 0, ratingAvg: 0, ratingCount: 0, wishlistCount: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    for (const f of files.previews ?? []) {
      const isAudio = f.type.startsWith('audio/')
      asset.previewUrls!.push({ url: await fileToDataUrl(f), kind: isAudio ? 'audio' : 'image' })
    }
    if (!asset.previewUrls!.length && mk === 'audio') {
      asset.previewSeeds.push({ seed: `gen-${asset._id}`, kind: 'audio', audio: 'loop' })
    } else if (!asset.previewUrls!.length) {
      asset.previewSeeds.push({ seed: asset.thumbSeed, kind: 'image' })
    }
    db.assets.unshift(asset)
    saveDb(db)
    return toDetail(asset, u)
  },

  async update(id: string, body: UpdateAssetBody, files?: { thumbnail?: File; previews?: File[]; file?: File }, onProgress?: (p: number) => void) {
    const u = currentUser()
    validateAssetBody(body, true)
    const bytes = [files?.thumbnail, files?.file, ...(files?.previews ?? [])].reduce((s, f) => s + (f?.size ?? 0), 0)
    if (bytes) await simulateUpload(bytes, onProgress)
    else await delay()
    const a = db.assets.find((x) => x._id === id)
    if (!a) notFound('Asset not found')
    if (u._id !== a.creator && u.role !== 'admin') forbidden()
    const patch = parseAssetBody(body)
    Object.assign(a, patch)
    if (body.title !== undefined) a.slug = `${slugifyTitle(a.title)}-${a._id.slice(-6)}`
    if (files?.thumbnail) a.thumbUrl = await fileToDataUrl(files.thumbnail)
    if (files?.file) {
      a.fileInfo = { format: (files.file.name.split('.').pop() ?? 'bin').toLowerCase(), bytes: files.file.size, originalName: files.file.name }
    }
    if (files?.previews) {
      a.previewUrls = []
      a.previewSeeds = []
      for (const f of files.previews) {
        const isAudio = f.type.startsWith('audio/')
        a.previewUrls!.push({ url: await fileToDataUrl(f), kind: isAudio ? 'audio' : 'image' })
      }
    }
    a.updatedAt = new Date().toISOString()
    saveDb(db)
    return toDetail(a, u)
  },

  async remove(id: string) {
    await delay()
    const u = currentUser()
    const a = db.assets.find((x) => x._id === id)
    if (!a) notFound('Asset not found')
    if (u._id !== a.creator && u.role !== 'admin') forbidden()
    a.status = 'archived'
    a.updatedAt = new Date().toISOString()
    saveDb(db)
    return null
  },
}

// ---------- reviews ----------
export const mockReviews: ReviewsApi = {
  async list(params: ReviewListParams): Promise<ReviewListResult> {
    await delay()
    const assetId = params.asset
    const all = db.reviews.filter((r) => r.asset === assetId).sort((x, y) => y.createdAt.localeCompare(x.createdAt))
    const { items, meta } = paginate(all, params.page, params.limit)
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as ReviewSummary['distribution']
    for (const r of all) distribution[r.rating as 1 | 2 | 3 | 4 | 5] += 1
    const summary: ReviewSummary = {
      avg: all.length ? Math.round((all.reduce((s, r) => s + r.rating, 0) / all.length) * 10) / 10 : 0,
      count: all.length,
      distribution,
    }
    const reviews: Review[] = items.map((r) => {
      const u = db.users.find((x) => x._id === r.user)
      return {
        _id: r._id, rating: r.rating, comment: r.comment, createdAt: r.createdAt, updatedAt: r.updatedAt,
        user: u ? { _id: u._id, username: u.username, name: u.name, avatarUrl: u.avatarUrl } : { _id: '', username: 'unknown', name: 'Unknown', avatarUrl: '' },
      }
    })
    return { reviews, summary, meta }
  },

  async create(body: CreateReviewBody) {
    await delay()
    const u = currentUser()
    const a = db.assets.find((x) => x._id === body.assetId)
    if (!a || a.status !== 'published') notFound('Asset not found')
    if (a.creator === u._id) forbidden('You cannot review your own asset')
    if (!owns(u._id, a._id)) forbidden('You must own this asset to review it')
    if (db.reviews.some((r) => r.asset === a._id && r.user === u._id)) conflict('You already reviewed this asset')
    const now = new Date().toISOString()
    const review: MockReview = { _id: rid('r'), asset: a._id, user: u._id, rating: body.rating, comment: body.comment ?? '', createdAt: now, updatedAt: now }
    db.reviews.push(review)
    recomputeRating(a._id)
    saveDb(db)
    return {
      _id: review._id, rating: review.rating, comment: review.comment, createdAt: review.createdAt, updatedAt: review.updatedAt,
      user: { _id: u._id, username: u.username, name: u.name, avatarUrl: u.avatarUrl },
    }
  },

  async update(id: string, body: UpdateReviewBody) {
    await delay()
    const u = currentUser()
    const r = db.reviews.find((x) => x._id === id)
    if (!r) notFound('Review not found')
    if (r.user !== u._id) forbidden()
    if (body.rating !== undefined) r.rating = body.rating
    if (body.comment !== undefined) r.comment = body.comment
    r.updatedAt = new Date().toISOString()
    recomputeRating(r.asset)
    saveDb(db)
    const author = db.users.find((x) => x._id === r.user)
    return {
      _id: r._id, rating: r.rating, comment: r.comment, createdAt: r.createdAt, updatedAt: r.updatedAt,
      user: author ? { _id: author._id, username: author.username, name: author.name, avatarUrl: author.avatarUrl } : { _id: '', username: 'unknown', name: 'Unknown', avatarUrl: '' },
    }
  },

  async remove(id: string) {
    await delay()
    const u = currentUser()
    const idx = db.reviews.findIndex((x) => x._id === id)
    if (idx < 0) notFound('Review not found')
    const r = db.reviews[idx]
    if (r.user !== u._id && u.role !== 'admin') forbidden()
    db.reviews.splice(idx, 1)
    recomputeRating(r.asset)
    saveDb(db)
    return null
  },
}

// ---------- cart ----------
function cartFor(userId: string) {
  let c = db.carts.find((x) => x.user === userId)
  if (!c) { c = { user: userId, items: [] }; db.carts.push(c) }
  return c
}

function cartView(userId: string): CartView {
  const c = cartFor(userId)
  const items = c.items
    .map((i) => ({ asset: db.assets.find((a) => a._id === i.asset), addedAt: i.addedAt }))
    .filter((x): x is { asset: MockAsset; addedAt: string } => !!x.asset && x.asset.status === 'published')
  // drop stale entries
  c.items = c.items.filter((i) => db.assets.some((a) => a._id === i.asset && a.status === 'published'))
  return {
    items: items.map((i) => ({ asset: toCard(i.asset), addedAt: i.addedAt })),
    subtotal: items.reduce((s, i) => s + i.asset.price, 0),
    count: items.length,
  }
}

export const mockCart: CartApi = {
  async get() { await delay(); return cartView(currentUser()._id) },

  async add(body: { assetId: string }) {
    await delay()
    const u = currentUser()
    const a = db.assets.find((x) => x._id === body.assetId)
    if (!a || a.status !== 'published') notFound('Asset not found')
    if (a.creator === u._id) badRequest('You cannot add your own asset to the cart')
    if (owns(u._id, a._id)) conflict('You already own this asset', 'ALREADY_OWNED')
    if (a.price === 0) badRequest('Free assets are claimed, not bought')
    const c = cartFor(u._id)
    if (!c.items.some((i) => i.asset === a._id)) {
      c.items.push({ asset: a._id, addedAt: new Date().toISOString() })
      saveDb(db)
    }
    return cartView(u._id)
  },

  async remove(assetId: string) {
    await delay()
    const u = currentUser()
    const c = cartFor(u._id)
    c.items = c.items.filter((i) => i.asset !== assetId)
    saveDb(db)
    return cartView(u._id)
  },

  async clear() {
    await delay()
    const u = currentUser()
    const c = cartFor(u._id)
    c.items = []
    saveDb(db)
    return cartView(u._id)
  },
}

// ---------- orders & payments ----------
function buildOrder(userId: string, assetIds: string[]): MockOrder {
  const items = assetIds.map((id) => {
    const a = db.assets.find((x) => x._id === id)
    if (!a || a.status !== 'published') notFound('Asset not found')
    return {
      asset: a._id, title: a.title, price: a.price, creator: a.creator,
      license: a.license, creatorEarning: earningFor(a.price),
    }
  })
  const subtotal = items.reduce((s, i) => s + i.price, 0)
  return {
    _id: rid('o'), user: userId, items,
    subtotal, platformFee: feeFor(subtotal), total: subtotal,
    currency: 'INR', status: 'created', provider: 'mock',
    providerOrderId: `mock_${rid('po')}`, providerPaymentId: '',
    paidAt: null, createdAt: new Date().toISOString(),
  }
}

function markPaid(order: MockOrder) {
  order.status = 'paid'
  order.paidAt = new Date().toISOString()
  for (const item of order.items) {
    if (db.purchases.some((p) => p.user === order.user && p.asset === item.asset)) continue
    const purchase: MockPurchase = {
      _id: rid('p'), user: order.user, asset: item.asset, order: order._id,
      pricePaid: item.price, downloadCount: 0, lastDownloadedAt: null, createdAt: order.paidAt!,
    }
    db.purchases.push(purchase)
    const a = db.assets.find((x) => x._id === item.asset)
    if (a) { a.stats.sales += 1 }
  }
  // remove purchased assets from cart
  const c = db.carts.find((x) => x.user === order.user)
  if (c) {
    const ids = new Set(order.items.map((i) => i.asset))
    c.items = c.items.filter((i) => !ids.has(i.asset))
  }
  saveDb(db)
}

export const mockOrders: OrdersApi = {
  async checkout(body?: CheckoutBody): Promise<CheckoutResult> {
    await delay()
    const u = currentUser()
    let assetIds = body?.assetIds
    if (!assetIds || !assetIds.length) {
      const c = cartFor(u._id)
      assetIds = c.items.map((i) => i.asset)
    }
    if (!assetIds.length) badRequest('Your cart is empty')
    const order = buildOrder(u._id, assetIds)
    db.orders.push(order)
    saveDb(db)
    return { order: orderView(order), payment: { provider: 'mock', providerOrderId: order.providerOrderId } }
  },

  async list(params) {
    await delay()
    const u = currentUser()
    const mine = db.orders.filter((o) => o.user === u._id).sort((x, y) => y.createdAt.localeCompare(x.createdAt))
    const { items, meta } = paginate(mine, params?.page, params?.limit)
    return { items: items.map(orderView), meta }
  },

  async byId(id: string) {
    await delay()
    const u = currentUser()
    const o = db.orders.find((x) => x._id === id)
    if (!o) notFound('Order not found')
    if (o.user !== u._id && u.role !== 'admin') forbidden()
    return orderView(o)
  },
}

export const mockPayments: PaymentsApi = {
  async mockConfirm(body: MockConfirmBody): Promise<ConfirmResult> {
    await delay()
    const u = currentUser()
    const o = db.orders.find((x) => x._id === body.orderId)
    if (!o) notFound('Order not found')
    if (o.user !== u._id) forbidden()
    if (body.outcome === 'failure') {
      o.status = 'failed'
      saveDb(db)
      fail(402, 'PAYMENT_FAILED', 'Payment failed. Please try again.')
    }
    markPaid(o)
    return { order: orderView(o), purchasedAssetIds: o.items.map((i) => i.asset) }
  },
}

// ---------- library & downloads ----------
export const mockLibrary: LibraryApi = {
  async list(params) {
    await delay()
    const u = currentUser()
    let items = db.purchases.filter((p) => p.user === u._id && db.assets.some((a) => a._id === p.asset))
      .sort((x, y) => y.createdAt.localeCompare(x.createdAt))
    const q = params?.q?.trim().toLowerCase()
    if (q) {
      items = items.filter((p) => {
        const a = db.assets.find((x) => x._id === p.asset)
        return a && (a.title.toLowerCase().includes(q) || a.tags.some((t) => t.includes(q)))
      })
    }
    if (params?.category) {
      items = items.filter((p) => db.assets.find((x) => x._id === p.asset)?.category === params.category)
    }
    const { items: pageItems, meta } = paginate(items, params?.page, params?.limit)
    return { items: pageItems.map(libraryItem), meta }
  },

  async claim(assetId: string) {
    await delay()
    const u = currentUser()
    const a = db.assets.find((x) => x._id === assetId)
    if (!a || a.status !== 'published') notFound('Asset not found')
    if (a.creator === u._id) badRequest('This is your own asset')
    if (owns(u._id, a._id)) conflict('You already own this asset', 'ALREADY_OWNED')
    if (a.price !== 0) badRequest('This is a paid asset — use checkout instead')
    const purchase: MockPurchase = {
      _id: rid('p'), user: u._id, asset: a._id, order: null,
      pricePaid: 0, downloadCount: 0, lastDownloadedAt: null, createdAt: new Date().toISOString(),
    }
    db.purchases.push(purchase)
    a.stats.sales += 1
    saveDb(db)
    return libraryItem(purchase)
  },
}

export const mockDownloads: DownloadsApi = {
  async get(assetId: string): Promise<DownloadInfo> {
    await delay()
    const u = currentUser()
    const a = db.assets.find((x) => x._id === assetId)
    if (!a) notFound('Asset not found')
    const isOwner = owns(u._id, a._id)
    const isCreator = a.creator === u._id
    const isAdmin = u.role === 'admin'
    if (!isOwner && !isCreator && !isAdmin) forbidden('You do not have access to this download')
    const p = db.purchases.find((x) => x.user === u._id && x.asset === a._id)
    if (p) {
      p.downloadCount += 1
      p.lastDownloadedAt = new Date().toISOString()
    }
    a.stats.downloads += 1
    saveDb(db)
    const ext = a.fileInfo.format || 'zip'
    return {
      url: `mockdl_${a._id}_${rid('t')}`,
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
      fileName: `${a.slug}.${ext}`,
    }
  },

  async file(token: string) {
    await delay()
    // mock tokens look like `mockdl_<assetId>_<rand>`; regenerate a tiny blob
    const m = /^mockdl_([A-Za-z0-9]+)_/.exec(token)
    if (!m) unauthorized('Invalid or expired download link')
    const a = db.assets.find((x) => x._id === m![1])
    if (!a) unauthorized('Invalid or expired download link')
    const blob = await (await fetch(audioPreviewUrl('loop'))).blob()
    return { blobUrl: URL.createObjectURL(blob), fileName: `${a.slug}.${a.fileInfo.format || 'zip'}` }
  },
}

// ---------- creator ----------
export const mockCreator: CreatorApi = {
  async stats(range: CreatorRange = '30d'): Promise<CreatorStats> {
    await delay()
    const u = requireRole('creator', 'admin')
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30
    const since = Date.now() - days * 86400_000
    const myAssets = db.assets.filter((a) => a.creator === u._id)
    const myAssetIds = new Set(myAssets.map((a) => a._id))
    const paidOrders = db.orders.filter((o) => o.status === 'paid' && o.paidAt && new Date(o.paidAt).getTime() >= since)
    const myItems = paidOrders.flatMap((o) =>
      o.items.filter((i) => myAssetIds.has(i.asset)).map((i) => ({ order: o, item: i })),
    )
    const revenue = myItems.reduce((s, x) => s + x.item.creatorEarning, 0)
    const sales = myItems.length
    const downloads = myAssets.reduce((s, a) => s + a.stats.downloads, 0)
    const views = myAssets.reduce((s, a) => s + a.stats.views, 0)
    const wishlists = myAssets.reduce((s, a) => s + a.stats.wishlistCount, 0)
    const rated = myAssets.filter((a) => a.stats.ratingCount > 0)
    const avgRating = rated.length
      ? Math.round((rated.reduce((s, a) => s + a.stats.ratingAvg * a.stats.ratingCount, 0) / rated.reduce((s, a) => s + a.stats.ratingCount, 0)) * 10) / 10
      : 0

    const series: CreatorStats['series'] = []
    for (let d = days - 1; d >= 0; d--) {
      const dayStart = new Date(Date.now() - (d + 1) * 86400_000)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = dayStart.getTime() + 86400_000
      const dayItems = myItems.filter((x) => {
        const t = new Date(x.order.paidAt!).getTime()
        return t >= dayStart.getTime() && t < dayEnd
      })
      series.push({
        date: dayStart.toISOString().slice(0, 10),
        revenue: dayItems.reduce((s, x) => s + x.item.creatorEarning, 0),
        sales: dayItems.length,
      })
    }

    const byAsset = new Map<string, { revenue: number; sales: number }>()
    for (const x of myItems) {
      const cur = byAsset.get(x.item.asset) ?? { revenue: 0, sales: 0 }
      cur.revenue += x.item.creatorEarning
      cur.sales += 1
      byAsset.set(x.item.asset, cur)
    }
    const topAssets = [...byAsset.entries()]
      .sort((x, y) => y[1].revenue - x[1].revenue)
      .slice(0, 5)
      .map(([id, v]) => {
        const a = db.assets.find((x) => x._id === id)!
        return { asset: toCard(a), revenue: v.revenue, sales: v.sales }
      })

    const catMap = new Map<Category, { sales: number; revenue: number }>()
    for (const x of myItems) {
      const a = db.assets.find((y) => y._id === x.item.asset)
      if (!a) continue
      const cur = catMap.get(a.category) ?? { sales: 0, revenue: 0 }
      cur.sales += 1
      cur.revenue += x.item.creatorEarning
      catMap.set(a.category, cur)
    }
    const categoryBreakdown = [...catMap.entries()].map(([category, v]) => ({ category, ...v }))

    return {
      totals: { revenue, sales, downloads, views, assets: myAssets.length, avgRating, wishlists },
      series,
      topAssets,
      categoryBreakdown,
    }
  },

  async sales(params) {
    await delay()
    const u = requireRole('creator', 'admin')
    const myAssetIds = new Set(db.assets.filter((a) => a.creator === u._id).map((a) => a._id))
    const rows: CreatorSale[] = []
    for (const o of db.orders.filter((x) => x.status === 'paid')) {
      for (const i of o.items) {
        if (!myAssetIds.has(i.asset)) continue
        const buyer = db.users.find((x) => x._id === o.user)
        const a = db.assets.find((x) => x._id === i.asset)
        rows.push({
          orderId: o._id,
          asset: { _id: i.asset, title: i.title, slug: a?.slug ?? '', thumbnail: { url: a ? thumbUrl(a) : '' } },
          buyer: { username: buyer?.username ?? 'unknown', avatarUrl: buyer?.avatarUrl ?? '' },
          price: i.price,
          creatorEarning: i.creatorEarning,
          paidAt: o.paidAt,
        })
      }
    }
    rows.sort((x, y) => (y.paidAt ?? '').localeCompare(x.paidAt ?? ''))
    return listResult(rows, params)
  },
}

// ---------- admin ----------
export const mockAdmin: AdminApi = {
  async stats(): Promise<AdminStats> {
    await delay()
    requireRole('admin')
    const paid = db.orders.filter((o) => o.status === 'paid')
    const revenue = paid.reduce((s, o) => s + o.total, 0)
    const platformFees = paid.reduce((s, o) => s + o.platformFee, 0)
    const signupsSeries: AdminStats['signupsSeries'] = []
    const revenueSeries: AdminStats['revenueSeries'] = []
    for (let d = 29; d >= 0; d--) {
      const start = new Date(Date.now() - (d + 1) * 86400_000)
      start.setHours(0, 0, 0, 0)
      const end = start.getTime() + 86400_000
      const date = start.toISOString().slice(0, 10)
      signupsSeries.push({ date, count: db.users.filter((u) => {
        const t = new Date(u.createdAt).getTime()
        return t >= start.getTime() && t < end
      }).length })
      revenueSeries.push({ date, revenue: paid.filter((o) => {
        const t = new Date(o.createdAt).getTime()
        return t >= start.getTime() && t < end
      }).reduce((s, o) => s + o.total, 0) })
    }
    return {
      users: db.users.length,
      creators: db.users.filter((u) => u.role === 'creator' || u.role === 'admin').length,
      assets: db.assets.length,
      orders: db.orders.length,
      revenue,
      platformFees,
      signupsSeries,
      revenueSeries,
    }
  },

  async users(params?: AdminUserParams) {
    await delay()
    requireRole('admin')
    let list = [...db.users]
    const q = params?.q?.trim().toLowerCase()
    if (q) list = list.filter((u) => u.name.toLowerCase().includes(q) || u.username.includes(q) || u.email.includes(q))
    if (params?.role) list = list.filter((u) => u.role === params.role)
    if (params?.banned === 'true') list = list.filter((u) => u.isBanned)
    if (params?.banned === 'false') list = list.filter((u) => !u.isBanned)
    list.sort((x, y) => y.createdAt.localeCompare(x.createdAt))
    return listResult(list.map(toAdminUser), params)
  },

  async updateUser(id: string, body: AdminUserUpdateBody) {
    await delay()
    const admin = requireRole('admin')
    const u = db.users.find((x) => x._id === id)
    if (!u) notFound('User not found')
    if (u._id === admin._id) forbidden('You cannot modify your own admin account')
    if (body.role !== undefined) u.role = body.role
    if (body.isBanned !== undefined) u.isBanned = body.isBanned
    u.updatedAt = new Date().toISOString()
    // banning signs the user out everywhere (their next request fails with ACCOUNT_BANNED)
    if (body.isBanned) u.tokenVersion += 1
    saveDb(db)
    return toAdminUser(u)
  },

  async assets(params?: AdminAssetParams) {
    await delay()
    requireRole('admin')
    let list = [...db.assets]
    if (params?.status) list = list.filter((a) => a.status === params.status)
    const q = params?.q?.trim().toLowerCase()
    if (q) list = list.filter((a) => a.title.toLowerCase().includes(q))
    list.sort((x, y) => y.createdAt.localeCompare(x.createdAt))
    return listResult(list.map(toMyAsset), params)
  },

  async updateAsset(id: string, body: AdminAssetUpdateBody) {
    await delay()
    requireRole('admin')
    const a = db.assets.find((x) => x._id === id)
    if (!a) notFound('Asset not found')
    if (body.status !== undefined) {
      a.status = body.status as AssetStatus
      if (a.status === 'published') a.rejectionReason = ''
    }
    if (body.isFeatured !== undefined) a.isFeatured = body.isFeatured
    if (body.rejectionReason !== undefined) a.rejectionReason = body.rejectionReason
    a.updatedAt = new Date().toISOString()
    saveDb(db)
    return toMyAsset(a)
  },
}

export const mockApi: Api = {
  auth: mockAuth,
  users: mockUsers,
  assets: mockAssets,
  reviews: mockReviews,
  cart: mockCart,
  orders: mockOrders,
  payments: mockPayments,
  library: mockLibrary,
  downloads: mockDownloads,
  creator: mockCreator,
  admin: mockAdmin,
}

export type { MockDb, MockUser, MockAsset, MockOrder, MockPurchase, MockReview }
