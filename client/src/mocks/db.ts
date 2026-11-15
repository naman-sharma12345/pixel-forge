import { seededRng, int, pick } from '@/lib/seeded'
import { generateAvatar } from '@/lib/pixelArt'
import type { Category, License, MediaKind, AssetStatus, Role, OrderStatus, OrderProvider } from '@/types/api'

// ---------- stored shapes (server-side fields included) ----------
export interface MockSocials { website: string; twitter: string; itchio: string; github: string }

export interface MockUser {
  _id: string
  name: string
  username: string
  email: string
  password: string
  role: Role
  avatarUrl: string
  avatarKey: string
  bio: string
  socials: MockSocials
  wishlist: string[]
  tokenVersion: number
  isBanned: boolean
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

export interface MockAsset {
  _id: string
  slug: string
  title: string
  description: string
  creator: string
  category: Category
  mediaKind: MediaKind
  tags: string[]
  price: number
  license: License
  fileFormats: string[]
  meta: Record<string, unknown>
  thumbSeed: string
  thumbUrl?: string
  previewSeeds: { seed: string; kind: 'image' | 'audio'; audio?: string }[]
  previewUrls?: { url: string; kind: 'image' | 'audio' }[]
  fileInfo: { format: string; bytes: number; originalName: string }
  status: AssetStatus
  rejectionReason: string
  isFeatured: boolean
  stats: { views: number; downloads: number; sales: number; ratingAvg: number; ratingCount: number; wishlistCount: number }
  createdAt: string
  updatedAt: string
}

export interface MockReview {
  _id: string
  asset: string
  user: string
  rating: number
  comment: string
  createdAt: string
  updatedAt: string
}

export interface MockCartItem { asset: string; addedAt: string }
export interface MockCart { user: string; items: MockCartItem[] }

export interface MockOrderItem {
  asset: string
  title: string
  price: number
  creator: string
  license: License
  creatorEarning: number
}

export interface MockOrder {
  _id: string
  user: string
  items: MockOrderItem[]
  subtotal: number
  platformFee: number
  total: number
  currency: 'INR'
  status: OrderStatus
  provider: OrderProvider
  providerOrderId: string
  providerPaymentId: string
  paidAt: string | null
  createdAt: string
}

export interface MockPurchase {
  _id: string
  user: string
  asset: string
  order: string | null
  pricePaid: number
  downloadCount: number
  lastDownloadedAt: string | null
  createdAt: string
}

export interface MockDb {
  users: MockUser[]
  assets: MockAsset[]
  reviews: MockReview[]
  carts: MockCart[]
  orders: MockOrder[]
  purchases: MockPurchase[]
}

// ---------- ids / time ----------
let counter = 0
export function rid(prefix: string): string {
  counter += 1
  const rand = Math.random().toString(36).slice(2, 10)
  return `${prefix}${Date.now().toString(36)}${counter.toString(36)}${rand}`.slice(0, 24)
}

export function daysAgo(n: number, jitterHours = 0): string {
  const d = new Date(Date.now() - n * 86400_000 - jitterHours * 3600_000)
  return d.toISOString()
}

const FEE_PERCENT = 10
export function feeFor(subtotal: number): number {
  return Math.round((subtotal * FEE_PERCENT) / 100)
}
export function earningFor(price: number): number {
  return price - feeFor(price)
}

// ---------- seed ----------
const CREATORS: { name: string; username: string; role: Role; blurb: string }[] = [
  { name: 'Mira Pixel', username: 'mirapixel', role: 'creator', blurb: 'Chiptune composer and sprite artist. Making cute things since 2019.' },
  { name: 'Jonas Vex', username: 'jonasvex', role: 'creator', blurb: 'Environment artist — tilesets, parallax backgrounds and mood.' },
  { name: 'Koko Labs', username: 'kokolabs', role: 'creator', blurb: 'Small studio shipping UI kits and icon packs.' },
  { name: 'ByteForge', username: 'byteforge', role: 'creator', blurb: 'Tools, fonts and 3D props for jam games.' },
  { name: 'Ana Reyes', username: 'anareyes', role: 'creator', blurb: 'Character designer and animator. SFX hobbyist.' },
  { name: 'Null Pointer', username: 'nullptr', role: 'creator', blurb: 'VFX and shader-ish juice for your gameplay.' },
]

const ASSET_TITLES: Record<Category, string[]> = {
  sprites: ['Tiny Adventurer Pack', 'Slime & Critter Set', 'Weapon Icons Vol. 2', 'RPG Item Sprites', 'Enemy Fleet Pack', 'Pixel Pets Bundle', 'Spell Effects Sprites', 'NPC Villager Pack'],
  tilesets: ['Forest Tileset v3', 'Cyberpunk City Tiles', 'Desert Ruins Tiles', 'Ice Cavern Tileset', 'Platformer Mega Tiles', 'Top-Down Town Tiles', 'Volcanic Tileset', 'Dungeon Tiles Premium'],
  characters: ['Hero Rig Pack', 'Villager Character Set', 'Monster Bestiary', 'Protagonist Portraits', 'Mech Pilot Characters', 'Animal Crossing-style Critters', 'Boss Sprites Vol.1', 'Idle Game Characters'],
  ui: ['Fantasy RPG UI Kit', 'Sci-Fi HUD Pack', 'Mobile Game UI Kit', 'Inventory & Dialog System', 'Pixel Button Pack', 'Minimalist UI Kit', 'RPG Menu Pack', 'Touch Controls Kit'],
  backgrounds: ['Neon City Parallax', 'Pixel Forest Backgrounds', 'Space Station Backdrops', 'Underground Cave Set', 'Sunset Beach Scene', 'Cyberpunk Alley Pack', 'Medieval Village BGs', 'Asteroid Field Pack'],
  vfx: ['Explosion Sprite Sheet', 'Magic Spell VFX', 'Weather & Particle Pack', 'Hit & Damage Effects', 'Portal & Teleport FX', 'Footstep Dust Pack', 'Level-Up Effects', 'Fire & Smoke Pack'],
  fonts: ['Press Start Future', 'Pixel Quest Font', 'Arcade Chunks', 'Retro Terminal Font', 'Tiny 8px Font', 'Fantasy Display Font', 'Mono Game Font', 'Chunky Display Pack'],
  '3d': ['Low-Poly Props Pack', 'Sci-Fi Corridor Kit', 'RPG Item Models', 'Nature Props Set', 'Space Station Modules', 'Pixel-Style 3D Tiles', 'Weapon Models Pack', 'Vehicle Models Kit'],
  sfx: ['UI Sound Pack', 'Retro Combat SFX', 'Platformer Jump & Land', 'Explosion & Impact Pack', 'Ambient Loops Vol.1', 'Pickup & Coin SFX', 'Magic Spell Sounds', 'Footsteps & Foley Pack'],
  music: ['Chiptune Battle Themes', 'Lo-fi Pixel Loops', '8-bit overworld pack', 'Synthwave Drive Loops', 'Cave & Dungeon Music', 'Boss Battle Suite', 'Menu & Title Themes', 'Acoustic Pixel Folk'],
}

const TAG_POOL: Record<Category, string[]> = {
  sprites: ['pixel-art', '2d', 'rpg', 'top-down', 'retro', '16-bit'],
  tilesets: ['tiles', 'autotile', 'parallax', 'platformer', 'top-down', 'pixel-art'],
  characters: ['animated', 'rigged', 'pixel-art', 'npc', 'portrait', 'idle'],
  ui: ['ui-kit', 'hud', 'responsive', 'pixel-art', 'mobile', 'inventory'],
  backgrounds: ['parallax', 'pixel-art', '16-bit', 'scene', 'landscape', 'loop'],
  vfx: ['particles', 'sprite-sheet', 'pixel-art', 'juice', 'effects', 'loop'],
  fonts: ['pixel-font', 'ttf', 'otf', '8bit', 'display', 'retro'],
  '3d': ['low-poly', 'obj', 'fbx', 'props', 'stylized', 'blender'],
  sfx: ['wav', 'ogg', 'retro', 'ui', 'loop', '8-bit'],
  music: ['chiptune', '8-bit', 'loop', 'wav', 'ogg', 'royalty-free'],
}

const LICENSES_: License[] = ['cc0', 'standard', 'extended']
const FORMATS: Record<Category, string[]> = {
  sprites: ['png', 'aseprite', 'gif'],
  tilesets: ['png', 'tsx', 'aseprite'],
  characters: ['png', 'aseprite', 'gif'],
  ui: ['png', 'psd', 'figma'],
  backgrounds: ['png', 'jpg', 'psd'],
  vfx: ['png', 'gif', 'spritesheet'],
  fonts: ['ttf', 'otf', 'woff2'],
  '3d': ['obj', 'fbx', 'blend', 'gltf'],
  sfx: ['wav', 'ogg', 'mp3'],
  music: ['wav', 'ogg', 'mp3', 'midi'],
}

function mediaKindFor(cat: Category): MediaKind {
  if (cat === 'sfx' || cat === 'music') return 'audio'
  if (cat === 'fonts' || cat === '3d') return 'other'
  return 'image'
}

export function buildSeedDb(): MockDb {
  const rng = seededRng('pixelforge-seed-v1')
  const now = Date.now()
  const users: MockUser[] = []
  const assets: MockAsset[] = []
  const reviews: MockReview[] = []

  const mkUser = (name: string, username: string, role: Role, blurb = ''): MockUser => ({
    _id: rid('u'),
    name,
    username,
    email: `${username}@example.com`,
    password: 'Password123',
    role,
    avatarUrl: generateAvatar(username),
    avatarKey: '',
    bio: blurb,
    socials: { website: '', twitter: '', itchio: '', github: '' },
    wishlist: [],
    tokenVersion: 0,
    isBanned: false,
    lastLoginAt: null,
    createdAt: daysAgo(int(rng, 120, 400)),
    updatedAt: daysAgo(int(rng, 10, 60)),
  })

  for (const c of CREATORS) users.push(mkUser(c.name, c.username, c.role, c.blurb))
  users.push(mkUser('Demo Player', 'demo', 'buyer', 'Just here to browse the forge.'))
  users.push(mkUser('Forge Admin', 'admin', 'admin', 'Keeps the forge fires burning.'))
  // recent buyers so admin signups and creator sales have realistic shape
  const BUYERS: [string, string][] = [
    ['Riya Sen', 'riyasen'], ['Leo Park', 'leopark'], ['Sam Okafor', 'samokafor'], ['Ivy Chen', 'ivychen'],
    ['Theo Brandt', 'theob'], ['Maya Iyer', 'mayaiyer'], ['Kai Ruiz', 'kairuiz'], ['Zoe Lam', 'zoelam'],
  ]
  for (const [n, un] of BUYERS) {
    const b = mkUser(n, un, 'buyer')
    b.createdAt = daysAgo(int(rng, 1, 29))
    users.push(b)
  }

  const categories = Object.keys(ASSET_TITLES) as Category[]
  const audioKinds = ['coin', 'laser', 'jump', 'explosion', 'loop'] as const

  let ai = 0
  for (const cat of categories) {
    const count = cat === 'sprites' || cat === 'music' || cat === 'sfx' ? 6 : cat === 'ui' ? 5 : 4
    for (let i = 0; i < count && ai < 48; i++, ai++) {
      const creator = users[i % 6]
      const title = `${ASSET_TITLES[cat][i % ASSET_TITLES[cat].length]}${count > ASSET_TITLES[cat].length ? ` ${Math.floor(i / ASSET_TITLES[cat].length) + 2}` : ''}`
      const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${ai.toString(36)}x${int(rng, 10, 99)}`
      const free = rng() < 0.3
      const price = free ? 0 : int(rng, 49, 4999)
      const mk = mediaKindFor(cat)
      const tagSet = new Set<string>()
      while (tagSet.size < int(rng, 2, 4)) tagSet.add(pick(rng, TAG_POOL[cat]))
      const daysOld = int(rng, 1, 180)
      const previewSeeds: MockAsset['previewSeeds'] = []
      if (mk === 'audio') {
        const ak = audioKinds[int(rng, 0, audioKinds.length - 1)]
        previewSeeds.push({ seed: `pv-${ai}`, kind: 'audio', audio: ak })
        if (rng() < 0.4) previewSeeds.push({ seed: `pv-${ai}-b`, kind: 'audio', audio: audioKinds[int(rng, 0, audioKinds.length - 1)] })
      } else {
        const nPrev = int(rng, 1, 3)
        for (let p = 0; p < nPrev; p++) previewSeeds.push({ seed: `pv-${ai}-${p}`, kind: 'image' })
      }
      const status: AssetStatus = rng() < 0.94 ? 'published' : rng() < 0.5 ? 'rejected' : 'archived'
      const sales = int(rng, 0, 400)
      const ratingCount = int(rng, 0, 60)
      const ratingAvg = ratingCount ? Math.round((3 + rng() * 2) * 10) / 10 : 0
      assets.push({
        _id: rid('a'),
        slug,
        title,
        description: `${title} — a polished ${cat.replace(/s$/, '')} pack built for indie developers. Includes every file listed, clear licensing, and lifetime updates. Perfect for game jams, prototypes and shipped titles.`,
        creator: creator._id,
        category: cat,
        mediaKind: mk,
        tags: [...tagSet],
        price,
        license: pick(rng, LICENSES_),
        fileFormats: FORMATS[cat],
        meta: mk === 'audio'
          ? { durationSec: int(rng, 30, 240), bpm: int(rng, 90, 160), loopable: rng() < 0.7, sampleRate: 44100 }
          : mk === 'image'
            ? { resolution: pick(rng, ['16x16', '32x32', '64x64', '128x128', '1920x1080']), frames: cat === 'vfx' || cat === 'sprites' ? int(rng, 4, 24) : undefined }
            : { resolution: 'vector' },
        thumbSeed: `asset-${ai}`,
        previewSeeds,
        fileInfo: {
          format: FORMATS[cat][0],
          bytes: int(rng, 200_000, 45_000_000),
          originalName: `${slug}.${FORMATS[cat][0]}`,
        },
        status,
        rejectionReason: status === 'rejected' ? 'Thumbnail does not match the described content.' : '',
        isFeatured: false,
        stats: {
          views: int(rng, 50, 4000),
          downloads: sales + int(rng, 0, 50),
          sales,
          ratingAvg,
          ratingCount,
          wishlistCount: int(rng, 0, 120),
        },
        createdAt: new Date(now - daysOld * 86400_000 - int(rng, 0, 23) * 3600_000).toISOString(),
        updatedAt: daysAgo(int(rng, 0, 30)),
      })
    }
  }

  // feature a handful of published assets
  const published = assets.filter((a) => a.status === 'published')
  for (let i = 0; i < Math.min(6, published.length); i++) published[i * 5].isFeatured = true

  // seed reviews on popular assets
  const reviewComments = [
    'Exactly what I needed for my jam game. Clean files, great docs.',
    'Love the style — fits perfectly with my pixel art. Instant buy.',
    'Good quality overall. Would love a few more color variants.',
    'Used this in my shipped game. Customers keep complimenting the art!',
    'Solid pack. The license is clear and the files are well organized.',
    'Decent, though I expected more frames in the animation sheet.',
    'Amazing value for the price. Highly recommended.',
    'Works great with Godot and Unity. No complaints.',
  ]
  let ri = 0
  for (const a of [...published].sort((x, y) => y.stats.sales - x.stats.sales).slice(0, 18)) {
    const n = int(rng, 1, 4)
    for (let i = 0; i < n; i++) {
      const reviewer = users[(ri * 7 + i) % users.length]
      if (reviewer._id === a.creator) continue
      if (reviews.some((r) => r.asset === a._id && r.user === reviewer._id)) continue
      const created = new Date(now - int(rng, 1, 90) * 86400_000).toISOString()
      reviews.push({
        _id: rid('r'),
        asset: a._id,
        user: reviewer._id,
        rating: int(rng, 3, 5),
        comment: reviewComments[ri % reviewComments.length],
        createdAt: created,
        updatedAt: created,
      })
      ri++
    }
  }

  // a few purchases/orders so library + creator stats have data
  const purchases: MockPurchase[] = []
  const orders: MockOrder[] = []
  const demo = users.find((u) => u.username === 'demo')!
  const demoBuys = published.filter((a) => a.price === 0).slice(0, 2).concat(published.filter((a) => a.price > 0).slice(0, 3))
  for (const a of demoBuys) {
    const pricePaid = a.price
    const order: MockOrder = {
      _id: rid('o'),
      user: demo._id,
      items: [{
        asset: a._id,
        title: a.title,
        price: a.price,
        creator: a.creator,
        license: a.license,
        creatorEarning: earningFor(a.price),
      }],
      subtotal: a.price,
      platformFee: feeFor(a.price),
      total: a.price,
      currency: 'INR',
      status: 'paid',
      provider: a.price === 0 ? 'free' : 'mock',
      providerOrderId: `mock_${rid('po')}`,
      providerPaymentId: `mock_${rid('pp')}`,
      paidAt: daysAgo(int(rng, 1, 20)),
      createdAt: daysAgo(int(rng, 1, 20)),
    }
    orders.push(order)
    purchases.push({
      _id: rid('p'),
      user: demo._id,
      asset: a._id,
      order: order._id,
      pricePaid,
      downloadCount: int(rng, 0, 3),
      lastDownloadedAt: daysAgo(int(rng, 0, 10)),
      createdAt: order.createdAt,
    })
    a.stats.sales += 1
    a.stats.downloads += 1
  }

  // ~140 paid orders from other buyers over the last 90 days
  const buyers = users.filter((u) => u.role === 'buyer' && u.username !== 'demo')
  const paidAssets = published.filter((a) => a.price > 0)
  for (let i = 0; i < 140; i++) {
    const b = pick(rng, buyers)
    const a = pick(rng, paidAssets)
    if (purchases.some((p) => p.user === b._id && p.asset === a._id)) continue
    const when = daysAgo(int(rng, 1, 89), int(rng, 0, 20))
    const order: MockOrder = {
      _id: rid('o'),
      user: b._id,
      items: [{ asset: a._id, title: a.title, price: a.price, creator: a.creator, license: a.license, creatorEarning: earningFor(a.price) }],
      subtotal: a.price,
      platformFee: feeFor(a.price),
      total: a.price,
      currency: 'INR',
      status: 'paid',
      provider: 'mock',
      providerOrderId: `mock_${rid('po')}`,
      providerPaymentId: `mock_${rid('pp')}`,
      paidAt: when,
      createdAt: when,
    }
    orders.push(order)
    purchases.push({ _id: rid('p'), user: b._id, asset: a._id, order: order._id, pricePaid: a.price, downloadCount: int(rng, 0, 4), lastDownloadedAt: when, createdAt: when })
    a.stats.sales += 1
    a.stats.downloads += 1
  }

  return { users, assets, reviews, carts: [], orders, purchases }
}

// ---------- persistence ----------
const KEY = 'pf_mock_db_v2'
const SESSION_KEY = 'pf_mock_session'

export function loadDb(): MockDb {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as MockDb
      if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.assets)) return parsed
    }
  } catch { /* corrupted -> reseed */ }
  const db = buildSeedDb()
  saveDb(db)
  return db
}

export function saveDb(db: MockDb) {
  try { sessionStorage.setItem(KEY, JSON.stringify(db)) } catch { /* quota */ }
}

export function getSessionUserId(): string | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as { userId: string }).userId : null
  } catch { return null }
}

export function setSessionUserId(userId: string | null) {
  if (userId) sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId }))
  else sessionStorage.removeItem(SESSION_KEY)
}

export const db = loadDb()
