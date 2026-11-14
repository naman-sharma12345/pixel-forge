/**
 * Procedural pixel-art engine.
 *
 * Everything the mock backend and the UI need as imagery is drawn here at a
 * small logical resolution (real pixel art), then upscaled with nearest
 * neighbour so it stays crisp anywhere. Output is deterministic per seed and
 * memoised, so the same asset always gets the same picture.
 */
import { seededRng, pick, int } from './seeded'

type Rng = () => number
export type Ramp = readonly [string, string, string, string]

const OUT = '#0b0a14'
const WHITE = '#f7f5ff'

export const RAMPS = {
  violet: ['#2e1a5e', '#5b34c4', '#8b5cf6', '#c9b8ff'],
  cyan: ['#0c3b4f', '#0e7c99', '#22d3ee', '#b6f6ff'],
  pink: ['#4d1238', '#a8306f', '#f472b6', '#fdd5ea'],
  lime: ['#203d0c', '#4f8a12', '#a3e635', '#e8fcc2'],
  amber: ['#4f2c06', '#b85e0a', '#fbbf24', '#fff0b8'],
  rose: ['#4f0e20', '#c0284b', '#fb7185', '#ffe0e5'],
  steel: ['#22223a', '#45456a', '#8585a8', '#d4d4ea'],
  wood: ['#2e1a0e', '#5c3317', '#8f5a2b', '#c48a4f'],
  leaf: ['#0f2e1a', '#1e6b3a', '#3fae5a', '#9be38a'],
  stone: ['#1c1c2a', '#3a3a52', '#5e5e7c', '#9494b4'],
} as const satisfies Record<string, Ramp>

type RampName = keyof typeof RAMPS
const BRIGHT: RampName[] = ['violet', 'cyan', 'pink', 'lime', 'amber', 'rose']
const SKINS: Ramp[] = [
  ['#5a3420', '#9a5b3a', '#d08a5c', '#f1c09a'],
  ['#3b2416', '#6b4128', '#a36a43', '#d3a079'],
  ['#6b4a3a', '#c08a6a', '#f0c4a0', '#ffe4cc'],
  ['#2a1a12', '#4f3020', '#7a4c30', '#a8744c'],
]

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]

const ramp = (rng: Rng, from: RampName[] = BRIGHT): Ramp => RAMPS[pick(rng, from)]

// ---------------------------------------------------------------------------
// canvas + raster primitives
// ---------------------------------------------------------------------------

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  return { c, ctx }
}

const rgbCache = new Map<string, [number, number, number]>()
function rgb(hex: string): [number, number, number] {
  let v = rgbCache.get(hex)
  if (!v) {
    const h = hex.replace('#', '')
    v = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
    rgbCache.set(hex, v)
  }
  return v
}

export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = rgb(a)
  const [r2, g2, b2] = rgb(b)
  const h = (n: number) => Math.round(n).toString(16).padStart(2, '0')
  return `#${h(r1 + (r2 - r1) * t)}${h(g1 + (g2 - g1) * t)}${h(b1 + (b2 - b1) * t)}`
}

class Raster {
  readonly w: number
  readonly h: number
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private readonly img: ImageData
  private readonly buf: Uint8ClampedArray

  constructor(w: number, h: number) {
    this.w = w
    this.h = h
    const { c, ctx } = makeCanvas(w, h)
    this.canvas = c
    this.ctx = ctx
    this.img = ctx.createImageData(w, h)
    this.buf = this.img.data
  }

  px(x: number, y: number, hex: string, a = 1) {
    x = Math.floor(x)
    y = Math.floor(y)
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return
    const [r, g, b] = rgb(hex)
    const i = (y * this.w + x) * 4
    const buf = this.buf
    if (a >= 1) {
      buf[i] = r
      buf[i + 1] = g
      buf[i + 2] = b
      buf[i + 3] = 255
    } else {
      const ia = 1 - a
      const old = buf[i + 3] / 255
      buf[i] = old ? buf[i] * ia + r * a : r
      buf[i + 1] = old ? buf[i + 1] * ia + g * a : g
      buf[i + 2] = old ? buf[i + 2] * ia + b * a : b
      buf[i + 3] = Math.max(buf[i + 3], a * 255)
    }
  }

  rect(x: number, y: number, w: number, h: number, hex: string, a = 1) {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.px(xx, yy, hex, a)
  }

  /** Ordered-dither between two colours; level 0..16. */
  dither(x: number, y: number, a: string, b: string, level: number) {
    this.px(x, y, level > BAYER[((y % 4) + 4) % 4][((x % 4) + 4) % 4] ? b : a)
  }

  /** Vertical banded gradient with Bayer dithering between bands. */
  gradientV(x0: number, y0: number, w: number, h: number, colors: readonly string[]) {
    const n = colors.length - 1
    for (let y = 0; y < h; y++) {
      const t = (y / Math.max(1, h - 1)) * n
      const base = Math.min(n, Math.floor(t))
      const frac = (t - base) * 16
      for (let x = 0; x < w; x++) {
        const c = base < n && frac > BAYER[y & 3][x & 3] ? colors[base + 1] : colors[base]
        this.px(x0 + x, y0 + y, c)
      }
    }
  }

  /** Dithered soft disc (glow) — strength 0..1 at centre fading to 0. */
  glow(cx: number, cy: number, r: number, hex: string, strength = 1) {
    for (let y = Math.floor(cy - r); y <= cy + r; y++)
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        const d = Math.hypot(x - cx, y - cy) / r
        if (d >= 1) continue
        const lvl = (1 - d) * strength * 17
        if (lvl > BAYER[((y % 4) + 4) % 4][((x % 4) + 4) % 4]) this.px(x, y, hex)
      }
  }

  disc(cx: number, cy: number, r: number, hex: string) {
    for (let y = Math.floor(cy - r); y <= cy + r; y++)
      for (let x = Math.floor(cx - r); x <= cx + r; x++)
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) this.px(x, y, hex)
  }

  /** Checkerboard-dithered ellipse used for drop shadows. */
  shadow(cx: number, cy: number, rx: number, ry: number, hex = '#000000') {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
      for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
        if (d > 1) continue
        if (d < 0.45 || (x + y) % 2 === 0) this.px(x, y, hex, 0.55)
      }
  }

  blit(g: Grid, ox: number, oy: number, s = 1, alpha = 1) {
    for (let y = 0; y < g.h; y++)
      for (let x = 0; x < g.w; x++) {
        const c = g.get(x, y)
        if (c) this.rect(ox + x * s, oy + y * s, s, s, c, alpha)
      }
  }

  text(str: string, x: number, y: number, hex: string | ((row: number) => string), s = 1, shadow?: string) {
    let cx = x
    for (const ch of str.toUpperCase()) {
      const glyph = FONT[ch] ?? FONT[' ']
      for (let gy = 0; gy < 5; gy++)
        for (let gx = 0; gx < 3; gx++) {
          if (glyph[gy][gx] !== '1') continue
          if (shadow) this.rect(cx + gx * s + s, y + gy * s + s, s, s, shadow)
          this.rect(cx + gx * s, y + gy * s, s, s, typeof hex === 'function' ? hex(gy) : hex)
        }
      cx += 4 * s
    }
    return cx - x - s
  }

  url(scale: number): string {
    this.ctx.putImageData(this.img, 0, 0)
    if (scale === 1) return this.canvas.toDataURL('image/png')
    const { c, ctx } = makeCanvas(this.w * scale, this.h * scale)
    ctx.drawImage(this.canvas, 0, 0, c.width, c.height)
    return c.toDataURL('image/png')
  }
}

// ---------------------------------------------------------------------------
// sprite grids (auto outline + directional shading)
// ---------------------------------------------------------------------------

class Grid {
  readonly w: number
  readonly h: number
  private readonly cells: (string | null)[]

  constructor(w: number, h: number) {
    this.w = w
    this.h = h
    this.cells = new Array(w * h).fill(null)
  }

  get(x: number, y: number) {
    return x < 0 || y < 0 || x >= this.w || y >= this.h ? null : this.cells[y * this.w + x]
  }

  set(x: number, y: number, c: string | null) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return
    this.cells[y * this.w + x] = c
  }

  rect(x: number, y: number, w: number, h: number, c: string) {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, c)
  }

  /** Adds a 1px dark outline around every filled shape. */
  outline(color = OUT) {
    const add: [number, number][] = []
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y)) continue
        if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) add.push([x, y])
      }
    for (const [x, y] of add) this.set(x, y, color)
    return this
  }
}

/**
 * Builds a sprite from a text template. Digits 1-4 map to a 4-step colour ramp
 * (dark -> light). With `mirror`, rows are left halves that get mirrored and
 * the right half is shaded one step darker, so light always comes from the
 * top-left. Other characters map through `extra`; '.' is transparent.
 */
function fromTemplate(rows: readonly string[], r: Ramp, extra: Record<string, string> = {}, mirror = true): Grid {
  const width = mirror ? 16 : Math.max(...rows.map((row) => row.length))
  const g = new Grid(width + 2, rows.length + 2)
  rows.forEach((row, y) => {
    const full = mirror ? row.padEnd(8, '.').slice(0, 8) + [...row.padEnd(8, '.').slice(0, 8)].reverse().join('') : row
    ;[...full].forEach((ch, x) => {
      if (ch === '.' || ch === ' ') return
      let color: string | undefined
      if (ch >= '1' && ch <= '4') {
        const right = mirror && x >= 8
        color = r[Math.max(0, Number(ch) - 1 - (right ? 1 : 0))]
      } else if (ch === 'w') color = WHITE
      else if (ch === 'k') color = OUT
      else color = extra[ch]
      if (color) g.set(x + 1, y + 1, color)
    })
  })
  return g.outline()
}

const T = {
  heart: ['........', '........', '..333...', '.34433..', '3443333.', '33333333', '33333333', '.3333333', '..233333', '...22333', '....2223', '.....222', '......21', '.......1'],
  potion: ['........', '.....ccc', '.....ccc', '......gg', '......g4', '.....g44', '....g333', '...g3w33', '..g3w333', '..g33333', '..g23333', '..g22233', '...g2222', '....g111', '.....ggg'],
  mushroom: ['........', '........', '....3333', '..334443', '.3ww4433', '.3ww3333', '33333333', '333333ww', '2222222w', '.1111111', '....ssss', '....ssss', '....sSss', '...sSsss', '...SSSSS'],
  gem: ['........', '........', '....3333', '...34444', '..344w44', '.3444w44', '33333333', '.2333333', '..233333', '...23333', '....2333', '.....233', '......23', '.......2'],
  ghost: ['........', '.....333', '...33444', '..344444', '..344444', '.3444kk4', '.3444kk4', '.3444444', '.3344444', '.3334444', '.3333333', '.3333333', '.2333333', '.2.233.3', '....2..2'],
  slime: ['........', '........', '........', '........', '........', '.....333', '...33444', '..34w444', '.34ww444', '.344k444', '3344k444', '33444444', '23333333', '.2222222', '..111111'],
  shield: ['........', '.2222222', '.2333333', '.234w333', '.234w33a', '.2343aaa', '.23333aa', '.233333a', '..233333', '..233333', '...23333', '....2333', '.....233', '......22'],
  skull: ['........', '....3333', '..334444', '.3444444', '.3444444', '.34kkk44', '.34kkk44', '.34kk444', '..34444k', '...3444k', '...33333', '...3k3k3', '....3333'],
  star: ['.......3', '......34', '......34', '.....344', '33333444', '.3444444', '..344444', '...34444', '...34444', '..344433', '..3433..', '.33.....'],
  chest: ['........', '...12222', '..122333', '..233444', '..mmmmmm', '..233333', '..23333a', '..mmmmmk', '..12222a', '..122222', '..mmmmmm', '..111111'],
} as const

const CART = [
  '................',
  'ss..............',
  '.s..............',
  '.s4444444444444.',
  '..434343434343..',
  '..434343434343..',
  '...4343434343...',
  '...3333333333...',
  '....s.......s...',
  '...sssssssssss..',
  '................',
  '....kk.....kk...',
  '...kwwk...kwwk..',
  '....kk.....kk...',
]

const MAGNIFIER = [
  '................',
  '....22222.......',
  '...2ggggg2......',
  '..2gwwgggg2.....',
  '..2gwggggg2.....',
  '..2ggggggg2.....',
  '..2ggggggg2.....',
  '..2ggggggg2.....',
  '...2ggggg2......',
  '....22222h......',
  '.........hh.....',
  '..........hh....',
  '...........hh...',
  '............hh..',
]

const NOTE = ['..1111', '..1..1', '..1..1', '..1..1', '111.11', '111.11', '11....']

type TemplateKey = keyof typeof T
const ITEM_KEYS: TemplateKey[] = ['heart', 'potion', 'mushroom', 'gem', 'ghost', 'slime', 'shield', 'skull', 'star', 'chest']

function templateSprite(key: TemplateKey, rng: Rng): Grid {
  const r = key === 'chest' ? RAMPS.wood : key === 'skull' ? RAMPS.steel : ramp(rng)
  return fromTemplate(T[key], r, {
    c: RAMPS.wood[2],
    g: RAMPS.steel[3],
    s: '#f1e4cf',
    S: '#c9b79c',
    a: RAMPS.amber[3],
    m: RAMPS.steel[2],
  })
}

/** Mirrored random creature (Bollinger-style) with eyes, gradient and outline. */
function creature(rng: Rng, r: Ramp = ramp(rng)): Grid {
  const MASK = [
    '........',
    '.....111',
    '....1122',
    '...11222',
    '...12222',
    '..112222',
    '..122222',
    '.1122222',
    '.1122222',
    '11122222',
    '.1112222',
    '..111122',
    '..1.11.1',
    '..1..1..',
  ]
  const half = MASK.map((row) => [...row].map((ch) => ch === '2' || (ch === '1' && rng() < 0.55)))
  const g = new Grid(18, MASK.length + 2)
  const H = MASK.length
  for (let y = 0; y < H; y++)
    for (let x = 0; x < 8; x++) {
      if (!half[y][x]) continue
      const lvl = y < H * 0.3 ? 3 : y < H * 0.65 ? 2 : 1
      g.set(x + 1, y + 1, r[lvl])
      g.set(16 - x, y + 1, r[Math.max(0, lvl - 1)])
    }
  // highlight spot + eyes + optional mouth
  g.set(5, 4, r[3])
  g.set(6, 4, WHITE)
  const ey = 5 + int(rng, 0, 2)
  const ex = int(rng, 4, 6)
  for (const xx of [ex, 17 - ex]) {
    g.set(xx, ey, WHITE)
    g.set(xx, ey + 1, OUT)
  }
  if (rng() < 0.6) for (let x = 7; x <= 10; x++) g.set(x, ey + 3, OUT)
  return g.outline()
}

interface HumanoidLook {
  skin: Ramp
  hair: Ramp
  cloth: Ramp
  pants: Ramp
  hairStyle: number
  gear: number
}

function humanoidLook(rng: Rng): HumanoidLook {
  return {
    skin: pick(rng, SKINS),
    hair: RAMPS[pick(rng, ['wood', 'amber', 'steel', 'rose', 'violet', 'stone'] as RampName[])],
    cloth: ramp(rng),
    pants: RAMPS[pick(rng, ['stone', 'wood', 'steel', 'violet'] as RampName[])],
    hairStyle: int(rng, 0, 4),
    gear: int(rng, 0, 2),
  }
}

/** 18x26 full-body character. */
function humanoid(look: HumanoidLook, frame = 0): Grid {
  const { skin, hair, cloth, pants, hairStyle, gear } = look
  const g = new Grid(18, 26)
  const bob = frame % 2
  // legs + boots
  const stride = frame % 4 === 1 ? 1 : frame % 4 === 3 ? -1 : 0
  g.rect(6, 17 + bob, 2, 4 - bob, pants[2])
  g.rect(10, 17 + bob, 2, 4 - bob, pants[1])
  g.rect(5 + stride, 21, 3, 2, RAMPS.wood[1])
  g.rect(10 - stride, 21, 3, 2, RAMPS.wood[0])
  const oy = bob
  // arms
  g.rect(3, 11 + oy, 2, 5, cloth[2])
  g.rect(13, 11 + oy, 2, 5, cloth[1])
  g.rect(3, 16 + oy, 2, 1, skin[2])
  g.rect(13, 16 + oy, 2, 1, skin[1])
  // torso
  g.rect(5, 11 + oy, 8, 6, cloth[2])
  g.rect(5, 11 + oy, 1, 6, cloth[3])
  g.rect(12, 11 + oy, 1, 6, cloth[1])
  g.rect(7, 11 + oy, 4, 1, cloth[3])
  g.rect(5, 16 + oy, 8, 1, RAMPS.wood[1])
  g.rect(8, 16 + oy, 2, 1, RAMPS.amber[3])
  // neck + head
  g.rect(8, 10 + oy, 2, 1, skin[1])
  g.rect(5, 2 + oy, 8, 8, skin[2])
  g.rect(6, 3 + oy, 2, 2, skin[3])
  g.rect(12, 2 + oy, 1, 8, skin[1])
  g.rect(5, 9 + oy, 8, 1, skin[1])
  const blink = frame % 6 === 5
  g.rect(7, 6 + oy, 1, blink ? 1 : 2, OUT)
  g.rect(10, 6 + oy, 1, blink ? 1 : 2, OUT)
  g.set(6, 8 + oy, RAMPS.pink[3])
  g.set(11, 8 + oy, RAMPS.pink[2])
  // hair
  switch (hairStyle) {
    case 0:
      g.rect(5, 1 + oy, 8, 3, hair[2])
      g.rect(6, 1 + oy, 3, 1, hair[3])
      g.rect(5, 4 + oy, 1, 2, hair[1])
      g.rect(12, 4 + oy, 1, 2, hair[1])
      break
    case 1:
      g.rect(5, 1 + oy, 8, 3, hair[2])
      g.rect(4, 3 + oy, 2, 8, hair[2])
      g.rect(12, 3 + oy, 2, 8, hair[1])
      g.rect(6, 1 + oy, 3, 1, hair[3])
      break
    case 2:
      g.rect(5, 2 + oy, 8, 2, hair[2])
      for (const x of [5, 7, 9, 11]) g.rect(x, oy, 1, 2, hair[x < 9 ? 3 : 2])
      g.rect(12, 4 + oy, 1, 2, hair[1])
      break
    case 3: // hood
      g.rect(4, oy, 10, 4, cloth[2])
      g.rect(4, 4 + oy, 1, 7, cloth[2])
      g.rect(13, 4 + oy, 1, 7, cloth[1])
      g.rect(5, oy, 4, 1, cloth[3])
      break
    default: // helmet with plume
      g.rect(4, 1 + oy, 10, 4, RAMPS.steel[2])
      g.rect(5, 1 + oy, 3, 1, RAMPS.steel[3])
      g.rect(4, 5 + oy, 1, 4, RAMPS.steel[1])
      g.rect(13, 5 + oy, 1, 4, RAMPS.steel[1])
      g.rect(8, oy - 1 < 0 ? 0 : oy - 1, 2, 2, RAMPS.rose[2])
  }
  // gear
  if (gear === 1) {
    // sword
    g.rect(15, 5 + oy, 1, 9, RAMPS.steel[3])
    g.rect(16, 5 + oy, 1, 9, RAMPS.steel[2])
    g.rect(14, 14 + oy, 4, 1, RAMPS.amber[2])
    g.rect(15, 15 + oy, 2, 2, RAMPS.wood[1])
  } else if (gear === 2) {
    // staff with orb
    g.rect(15, 6 + oy, 1, 17 - oy, RAMPS.wood[2])
    g.rect(14, 3 + oy, 3, 3, RAMPS.cyan[2])
    g.set(14, 3 + oy, RAMPS.cyan[3])
  }
  return g.outline()
}

// ---------------------------------------------------------------------------
// memo
// ---------------------------------------------------------------------------

const cache = new Map<string, string>()
function memo(key: string, fn: () => string): string {
  if (typeof document === 'undefined') return ''
  let v = cache.get(key)
  if (v === undefined) {
    v = fn()
    cache.set(key, v)
  }
  return v
}

// ---------------------------------------------------------------------------
// bitmap font (3x5)
// ---------------------------------------------------------------------------

const FONT: Record<string, string[]> = {
  A: ['010', '101', '111', '101', '101'], B: ['110', '101', '110', '101', '110'], C: ['011', '100', '100', '100', '011'],
  D: ['110', '101', '101', '101', '110'], E: ['111', '100', '110', '100', '111'], F: ['111', '100', '110', '100', '100'],
  G: ['011', '100', '101', '101', '011'], H: ['101', '101', '111', '101', '101'], I: ['111', '010', '010', '010', '111'],
  J: ['001', '001', '001', '101', '010'], K: ['101', '101', '110', '101', '101'], L: ['100', '100', '100', '100', '111'],
  M: ['101', '111', '111', '101', '101'], N: ['110', '101', '101', '101', '101'], O: ['010', '101', '101', '101', '010'],
  P: ['110', '101', '110', '100', '100'], Q: ['010', '101', '101', '110', '011'], R: ['110', '101', '110', '101', '101'],
  S: ['011', '100', '010', '001', '110'], T: ['111', '010', '010', '010', '010'], U: ['101', '101', '101', '101', '111'],
  V: ['101', '101', '101', '101', '010'], W: ['101', '101', '111', '111', '101'], X: ['101', '101', '010', '101', '101'],
  Y: ['101', '101', '010', '010', '010'], Z: ['111', '001', '010', '100', '111'],
  0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'], 2: ['110', '001', '010', '100', '111'],
  3: ['110', '001', '010', '001', '110'], 4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '110', '001', '110'],
  6: ['011', '100', '111', '101', '111'], 7: ['111', '001', '010', '010', '010'], 8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '110'],
  ' ': ['000', '000', '000', '000', '000'], '!': ['010', '010', '010', '000', '010'], '+': ['000', '010', '111', '010', '000'],
  '-': ['000', '000', '111', '000', '000'], '.': ['000', '000', '000', '000', '010'], ':': ['000', '010', '000', '010', '000'],
  '/': ['001', '001', '010', '100', '100'], '?': ['110', '001', '010', '000', '010'],
}

// ---------------------------------------------------------------------------
// landscapes (backgrounds, banners, auth art)
// ---------------------------------------------------------------------------

interface Sky {
  sky: string[]
  layers: string[]
  body: 'sun' | 'moon'
  bodyColor: string
  stars: boolean
  city: boolean
}

function skyFor(rng: Rng): Sky {
  const v = int(rng, 0, 3)
  if (v === 0)
    return { sky: ['#1b0f3b', '#4a1f6e', '#a8306f', '#f472b6', '#fbbf24'], layers: ['#5b2a6e', '#3b1a52', '#24113a', '#140a24'], body: 'sun', bodyColor: '#fff0b8', stars: false, city: rng() < 0.35 }
  if (v === 1)
    return { sky: ['#05050d', '#0d0b24', '#1f1450', '#3b2a80'], layers: ['#2a2260', '#1c1744', '#120f2e', '#09081a'], body: 'moon', bodyColor: '#e8e4ff', stars: true, city: rng() < 0.5 }
  if (v === 2)
    return { sky: ['#0b4a6b', '#0e7c99', '#22b8d8', '#7ee3f5', '#c9f6ff'], layers: ['#5a8fb0', '#2f6b5a', '#1e4f3a', '#12301f'], body: 'sun', bodyColor: '#fffbe6', stars: false, city: false }
  return { sky: ['#071a12', '#0f3b2a', '#1e6b5a', '#3fae8a', '#a3e635'], layers: ['#1f5a4a', '#16443a', '#0e2e28', '#071a16'], body: 'moon', bodyColor: '#e8fcc2', stars: true, city: false }
}

function drawLandscape(r: Raster, rng: Rng, w: number, h: number, offset = 0) {
  const s = skyFor(rng)
  r.gradientV(0, 0, w, Math.ceil(h * 0.78), s.sky)
  r.rect(0, Math.ceil(h * 0.78), w, h, s.sky[s.sky.length - 1])
  if (s.stars)
    for (let i = 0; i < (w * h) / 60; i++) {
      const x = int(rng, 0, w - 1)
      const y = int(rng, 0, Math.floor(h * 0.55))
      r.px(x, y, WHITE, 0.35 + rng() * 0.65)
      if (rng() < 0.08) {
        r.px(x - 1, y, WHITE, 0.4)
        r.px(x + 1, y, WHITE, 0.4)
        r.px(x, y - 1, WHITE, 0.4)
        r.px(x, y + 1, WHITE, 0.4)
      }
    }
  const bx = int(rng, Math.floor(w * 0.15), Math.floor(w * 0.85))
  const by = Math.floor(h * (0.22 + rng() * 0.15))
  const br = Math.max(4, Math.floor(h * 0.11))
  r.glow(bx, by, br * 3, s.bodyColor, 0.45)
  r.disc(bx, by, br, s.bodyColor)
  if (s.body === 'moon') r.disc(bx + br * 0.45, by - br * 0.25, br * 0.8, s.sky[1])
  else r.rect(bx - br, by + 1, br * 2 + 1, 1, s.sky[3])

  // clouds on day skies
  if (!s.stars)
    for (let c = 0; c < 3; c++) {
      const cx = int(rng, 0, w)
      const cy = int(rng, 4, Math.floor(h * 0.35))
      for (let i = 0; i < 5; i++) r.disc(cx + i * 3 - 6, cy + (i % 2), 2 + (i % 3), WHITE)
    }

  // mountain / hill layers, far to near
  s.layers.forEach((col, li) => {
    const base = h * (0.5 + li * 0.11)
    const amp = h * (0.16 - li * 0.025)
    const f1 = 0.04 + rng() * 0.05
    const f2 = 0.11 + rng() * 0.08
    const p1 = rng() * 10
    const p2 = rng() * 10
    const jag = li < 2
    for (let x = 0; x < w; x++) {
      const xx = x + offset * (li + 1) * 0.5
      let top = base - amp * (jag ? Math.abs(Math.sin(xx * f1 + p1)) : 0.5 + 0.5 * Math.sin(xx * f1 + p1)) - amp * 0.35 * Math.sin(xx * f2 + p2)
      top = Math.round(top)
      for (let y = top; y < h; y++) r.px(x, y, col)
      if (li === 0 && top < base - amp * 0.7) for (let y = top; y < top + 2; y++) r.px(x, y, mix(col, WHITE, 0.45))
      else if (li < 3) r.px(x, top, mix(col, s.sky[s.sky.length - 1], 0.35))
    }
    // pine tree line on the third layer
    if (li === 2)
      for (let x = int(rng, 0, 4); x < w; x += int(rng, 4, 9)) {
        const top = Math.round(base - amp * 0.5 - amp * 0.35 * Math.sin((x + offset * 1.5) * f2 + p2)) - int(rng, 3, 7)
        for (let k = 0; k < 8; k++) {
          const half = Math.floor(k / 2)
          for (let dx = -half; dx <= half; dx++) r.px(x + dx, top + k, s.layers[3])
        }
      }
  })

  if (s.city) {
    let x = int(rng, 0, 4)
    while (x < w) {
      const bw = int(rng, 4, 9)
      const bh = int(rng, Math.floor(h * 0.12), Math.floor(h * 0.32))
      const top = h - bh
      r.rect(x, top, bw, bh, s.layers[3])
      for (let wy = top + 2; wy < h - 2; wy += 3)
        for (let wx = x + 1; wx < x + bw - 1; wx += 2) if (rng() < 0.35) r.px(wx, wy, rng() < 0.7 ? RAMPS.amber[2] : RAMPS.cyan[2])
      x += bw + int(rng, 1, 3)
    }
  }
}

// ---------------------------------------------------------------------------
// category scenes (96x96 logical unless noted)
// ---------------------------------------------------------------------------

const S = 96

function backdrop(r: Raster, tint: string) {
  r.gradientV(0, 0, r.w, r.h, ['#0b0b14', mix('#0f0f17', tint, 0.18), mix('#161622', tint, 0.3)])
}

function sparkle(r: Raster, x: number, y: number, c: string) {
  r.px(x, y, WHITE)
  r.px(x - 1, y, c)
  r.px(x + 1, y, c)
  r.px(x, y - 1, c)
  r.px(x, y + 1, c)
}

function sceneSprites(rng: Rng): Raster {
  const r = new Raster(S, S)
  const tint = ramp(rng)
  backdrop(r, tint[1])
  if (rng() < 0.5) {
    // sprite-sheet layout: 2x2 cells
    for (let i = 0; i < 4; i++) {
      const cx = (i % 2) * 48
      const cy = Math.floor(i / 2) * 48
      if ((i + (i > 1 ? 1 : 0)) % 2 === 0) r.rect(cx, cy, 48, 48, '#ffffff', 0.025)
      const g = rng() < 0.45 ? creature(rng) : templateSprite(pick(rng, ITEM_KEYS), rng)
      r.shadow(cx + 24, cy + 40, 11, 3)
      r.blit(g, cx + 24 - g.w, cy + 40 - g.h * 2 + 2, 2)
    }
    for (let i = 0; i < 6; i++) sparkle(r, int(rng, 4, 92), int(rng, 4, 92), tint[2])
  } else {
    // hero creature on a platform
    r.glow(48, 44, 40, tint[1], 0.6)
    r.rect(14, 80, 68, 4, RAMPS.stone[2])
    r.rect(14, 80, 68, 1, RAMPS.stone[3])
    r.rect(18, 84, 60, 4, RAMPS.stone[1])
    const g = creature(rng, tint)
    r.shadow(48, 80, 22, 3)
    r.blit(g, 48 - g.w * 2, 80 - g.h * 4 + 4, 4)
    for (let i = 0; i < 8; i++) sparkle(r, int(rng, 4, 92), int(rng, 4, 60), pick(rng, [tint[3], RAMPS.amber[3], WHITE]))
  }
  return r
}

function sceneTileset(rng: Rng): Raster {
  const r = new Raster(S, S)
  const sky = pick(rng, [
    ['#0e2a4a', '#1b4f7a', '#3a86b5', '#8fd4ef'],
    ['#2a1350', '#5b34c4', '#a07ae8', '#e2d4ff'],
    ['#3b1430', '#a8306f', '#f08aa8', '#ffd9c7'],
  ])
  r.gradientV(0, 0, S, S, sky)
  for (let c = 0; c < 3; c++) {
    const cx = int(rng, 6, 90)
    const cy = int(rng, 6, 30)
    for (let i = 0; i < 4; i++) r.disc(cx + i * 3, cy + (i % 2), 2 + (i % 2), WHITE)
  }
  const T8 = 8
  const grass = pick(rng, [RAMPS.leaf, RAMPS.lime, RAMPS.cyan, RAMPS.pink])
  const dirt = RAMPS.wood
  const ground: number[] = []
  let gh = int(rng, 8, 9)
  for (let tx = 0; tx < 12; tx++) {
    if (rng() < 0.18) gh = Math.max(7, Math.min(10, gh + (rng() < 0.5 ? -1 : 1)))
    ground.push(gh)
  }
  const pitStart = int(rng, 3, 7)
  const tile = (tx: number, ty: number, kind: 'grass' | 'dirt' | 'brick' | 'water') => {
    const x0 = tx * T8
    const y0 = ty * T8
    for (let y = 0; y < T8; y++)
      for (let x = 0; x < T8; x++) {
        const n = ((tx * 7 + x * 13 + y * 17 + ty * 3) * 2654435761) >>> 28
        let c: string
        if (kind === 'water') c = y === 0 ? RAMPS.cyan[3] : y < 3 ? RAMPS.cyan[2] : RAMPS.cyan[1]
        else if (kind === 'brick') {
          const row = Math.floor(y / 4)
          const mortar = y % 4 === 3 || (x + row * 4) % 8 === 7
          c = mortar ? RAMPS.stone[0] : y % 4 === 0 ? RAMPS.stone[3] : RAMPS.stone[2]
        } else {
          c = n < 2 ? dirt[0] : n > 13 ? dirt[3] : dirt[2]
          if (kind === 'grass') {
            const edge = 2 + (((x * 5 + tx) % 3) === 0 ? 1 : 0)
            if (y < edge) c = y === 0 ? grass[3] : grass[2]
            else if (y === edge) c = grass[1]
          }
        }
        r.px(x0 + x, y0 + y, c, kind === 'water' ? 0.85 : 1)
      }
  }
  for (let tx = 0; tx < 12; tx++) {
    const isPit = tx >= pitStart && tx < pitStart + 2
    for (let ty = ground[tx]; ty < 12; ty++) {
      if (isPit && ty <= ground[tx]) tile(tx, ty + 1, 'water')
      else if (!isPit) tile(tx, ty, ty === ground[tx] ? 'grass' : 'dirt')
      else if (ty > ground[tx] + 1) tile(tx, ty, 'dirt')
    }
  }
  // floating brick platform with coins
  const px = int(rng, 1, 7)
  const py = int(rng, 3, 5)
  for (let i = 0; i < 3; i++) tile(px + i, py, 'brick')
  for (let i = 0; i < 3; i++) {
    const cx = (px + i) * T8 + 4
    const cy = (py - 1) * T8 + 3
    r.rect(cx - 1, cy - 2, 3, 5, RAMPS.amber[2])
    r.px(cx - 1, cy - 2, RAMPS.amber[3])
    r.rect(cx + 1, cy - 1, 1, 3, RAMPS.amber[1])
  }
  // a tree
  const tt = pitStart > 5 ? 1 : 9
  const baseY = ground[tt] * T8
  r.rect(tt * T8 + 3, baseY - 8, 2, 8, RAMPS.wood[1])
  r.disc(tt * T8 + 4, baseY - 12, 5, grass[1])
  r.disc(tt * T8 + 3, baseY - 13, 3, grass[2])
  r.px(tt * T8 + 2, baseY - 15, grass[3])
  // tile grid overlay (editor feel)
  for (let i = 0; i <= S; i += T8) {
    for (let k = 0; k < S; k += 2) {
      r.px(i, k, WHITE, 0.07)
      r.px(k, i, WHITE, 0.07)
    }
  }
  return r
}

function sceneCharacters(rng: Rng): Raster {
  const r = new Raster(S, S)
  const tint = ramp(rng)
  backdrop(r, tint[1])
  r.glow(48, 40, 44, tint[1], 0.55)
  r.gradientV(0, 84, S, 12, [RAMPS.stone[1], RAMPS.stone[0]])
  r.rect(0, 84, S, 1, RAMPS.stone[2])
  const side1 = humanoid(humanoidLook(rng))
  const side2 = humanoid(humanoidLook(rng))
  const hero = humanoid(humanoidLook(rng))
  r.shadow(14, 86, 12, 2)
  r.shadow(82, 86, 12, 2)
  r.blit(side1, -4, 86 - side1.h * 2, 2, 0.85)
  r.blit(side2, 64, 86 - side2.h * 2, 2, 0.85)
  r.shadow(48, 88, 18, 3)
  r.blit(hero, 48 - hero.w * 1.5, 89 - hero.h * 3, 3)
  return r
}

function bevel(r: Raster, x: number, y: number, w: number, h: number, rp: Ramp, fill: string) {
  r.rect(x, y, w, h, OUT)
  r.rect(x + 1, y + 1, w - 2, h - 2, fill)
  r.rect(x + 1, y + 1, w - 2, 1, rp[3])
  r.rect(x + 1, y + 1, 1, h - 2, rp[3])
  r.rect(x + 1, y + h - 2, w - 2, 1, rp[0])
  r.rect(x + w - 2, y + 1, 1, h - 2, rp[0])
}

function sceneUI(rng: Rng): Raster {
  const W = 128
  const r = new Raster(W, W)
  const accent = ramp(rng)
  r.gradientV(0, 0, W, W, ['#0b0b14', accent[0], '#0b0b14'])
  for (let y = 0; y < W; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < W; x += 8) r.px(x, y, accent[1], 0.5)
  // window
  bevel(r, 6, 6, 116, 116, RAMPS.steel, '#161622')
  r.rect(8, 8, 112, 12, accent[1])
  r.rect(8, 8, 112, 1, accent[3])
  r.rect(8, 19, 112, 1, accent[0])
  r.text(pick(rng, ['ITEMS', 'INVENTORY', 'PAUSED', 'SHOP', 'QUEST LOG']), 12, 12, WHITE, 1, accent[0])
  bevel(r, 107, 10, 9, 8, RAMPS.rose, RAMPS.rose[2])
  r.text('X', 110, 11, WHITE)
  // bars
  const bar = (y: number, label: string, rp: Ramp, pct: number) => {
    r.text(label, 12, y + 1, rp[3])
    r.rect(24, y, 92, 7, OUT)
    r.rect(25, y + 1, 90, 5, '#0b0b14')
    const fw = Math.round(90 * pct)
    r.rect(25, y + 1, fw, 5, rp[2])
    r.rect(25, y + 1, fw, 1, rp[3])
    r.rect(25, y + 5, fw, 1, rp[1])
    for (let x = 25 + 10; x < 25 + fw; x += 10) r.rect(x, y + 1, 1, 5, rp[1])
  }
  bar(26, 'HP', RAMPS.rose, 0.55 + rng() * 0.4)
  bar(36, 'MP', RAMPS.cyan, 0.3 + rng() * 0.6)
  // slots
  for (let i = 0; i < 8; i++) {
    const sx = 12 + (i % 4) * 26
    const sy = 48 + Math.floor(i / 4) * 26
    bevel(r, sx, sy, 24, 24, RAMPS.stone, i === 0 ? accent[0] : '#101018')
    if (i === 0) r.rect(sx, sy, 24, 1, accent[3])
    if (rng() < 0.8) r.blit(templateSprite(pick(rng, ITEM_KEYS), rng), sx + 3, sy + 3)
    if (rng() < 0.3) r.text(String(int(rng, 2, 9)), sx + 18, sy + 17, WHITE, 1, OUT)
  }
  // buttons
  bevel(r, 12, 102, 50, 14, accent, accent[2])
  r.text('USE', 12 + 25 - 6, 107, WHITE, 1, accent[0])
  bevel(r, 66, 102, 50, 14, RAMPS.steel, RAMPS.steel[1])
  r.text('DROP', 66 + 25 - 8, 107, RAMPS.steel[3])
  return r
}

function sceneBackground(rng: Rng): Raster {
  const r = new Raster(S, S)
  drawLandscape(r, rng, S, S)
  return r
}

function burst(r: Raster, cx: number, cy: number, R: number, cols: readonly string[], rng: Rng, k = 7) {
  const ph = rng() * 6
  const k2 = k + 4
  for (let y = Math.floor(cy - R * 1.3); y <= cy + R * 1.3; y++)
    for (let x = Math.floor(cx - R * 1.3); x <= cx + R * 1.3; x++) {
      const d = Math.hypot(x - cx, y - cy)
      const a = Math.atan2(y - cy, x - cx)
      const rr = R * (0.72 + 0.28 * Math.sin(a * k + ph) + 0.12 * Math.sin(a * k2 - ph))
      const v = 1 - d / rr
      if (v <= 0) continue
      const t = v * (cols.length - 0.01) + (BAYER[((y % 4) + 4) % 4][((x % 4) + 4) % 4] / 16 - 0.5) * 0.9
      const idx = Math.max(0, Math.min(cols.length - 1, Math.floor(t)))
      r.px(x, y, cols[idx])
    }
}

const VFX_SETS: string[][] = [
  [RAMPS.rose[0], RAMPS.rose[1], RAMPS.rose[2], RAMPS.amber[2], RAMPS.amber[3], WHITE],
  [RAMPS.violet[0], RAMPS.violet[1], RAMPS.violet[2], RAMPS.cyan[2], RAMPS.cyan[3], WHITE],
  [RAMPS.lime[0], RAMPS.lime[1], RAMPS.lime[2], RAMPS.lime[3], WHITE],
  [RAMPS.cyan[0], RAMPS.cyan[1], RAMPS.cyan[2], RAMPS.steel[3], WHITE],
  [RAMPS.pink[0], RAMPS.pink[1], RAMPS.pink[2], RAMPS.violet[3], WHITE],
]

function sceneVfx(rng: Rng): Raster {
  const r = new Raster(S, S)
  const cols = pick(rng, VFX_SETS)
  r.gradientV(0, 0, S, S, ['#07070d', mix('#07070d', cols[1], 0.25), '#07070d'])
  r.glow(48, 38, 42, cols[1], 0.5)
  burst(r, 48, 38, 24, cols, rng, int(rng, 5, 9))
  for (let i = 0; i < 26; i++) {
    const a = rng() * Math.PI * 2
    const d = 26 + rng() * 16
    const x = 48 + Math.cos(a) * d
    const y = 38 + Math.sin(a) * d * 0.9
    const c = pick(rng, cols.slice(2))
    r.rect(x, y, rng() < 0.3 ? 2 : 1, rng() < 0.3 ? 2 : 1, c)
  }
  // frame strip
  r.rect(0, 74, S, 22, '#000000', 0.45)
  r.rect(0, 74, S, 1, cols[1])
  for (let f = 0; f < 5; f++) {
    const fx = 2 + f * 19 + 8
    if (f) for (let y = 77; y < 94; y += 2) r.px(2 + f * 19 - 1, y, WHITE, 0.15)
    burst(r, fx, 85, 2 + f * 1.6, cols, rng, 5 + f)
  }
  return r
}

function sceneFont(rng: Rng): Raster {
  const r = new Raster(S, S)
  const rp = ramp(rng)
  r.rect(0, 0, S, S, '#0e0e18')
  for (let y = 12; y < S; y += 14) for (let x = 0; x < S; x += 2) r.px(x, y, rp[1], 0.35)
  const big = pick(rng, ['ABC', 'AAZ', 'PXL', 'GO!', 'K.O', 'XYZ'])
  const rowCol = (row: number) => (row < 2 ? rp[3] : row < 4 ? rp[2] : rp[1])
  r.text(big, 15, 10, rowCol, 6, rp[0])
  r.text(pick(rng, ['PIXEL FONT', 'GAME OVER', 'LEVEL UP!', 'PRESS START', 'HIGH SCORE']).slice(0, 10), 8, 50, WHITE, 2, OUT)
  r.text('0123456789', 8, 66, RAMPS.steel[3], 2)
  const sw = [rp[0], rp[1], rp[2], rp[3], WHITE]
  sw.forEach((c, i) => r.rect(8 + i * 10, 82, 8, 6, c))
  r.text('A-Z', 66, 83, RAMPS.steel[2])
  return r
}

function isoCube(r: Raster, sx: number, sy: number, rp: Ramp) {
  // top diamond
  for (let y = 0; y < 8; y++) {
    const hw = y < 4 ? y * 2 + 2 : (8 - y) * 2
    for (let x = -hw; x < hw; x++) r.px(sx + x, sy + y, y === 0 || Math.abs(x) >= hw - 1 ? rp[3] : rp[2])
  }
  // left face
  for (let x = 0; x < 8; x++) {
    const top = sy + 4 + Math.floor(x / 2)
    for (let y = 0; y < 8; y++) r.px(sx - 8 + x, top + y, y === 7 ? rp[0] : rp[1])
  }
  // right face
  for (let x = 0; x < 8; x++) {
    const top = sy + 7 - Math.floor(x / 2)
    for (let y = 0; y < 8; y++) r.px(sx + x, top + y, rp[0])
  }
}

function scene3d(rng: Rng): Raster {
  const r = new Raster(S, S)
  const tint = ramp(rng)
  backdrop(r, tint[1])
  r.glow(48, 46, 44, tint[1], 0.45)
  const ox = 48
  const oy = 30
  const N = 4
  const heights: number[][] = []
  for (let gx = 0; gx < N; gx++) {
    heights.push([])
    for (let gy = 0; gy < N; gy++) heights[gx].push(1 + (rng() < 0.35 ? 1 : 0) + (gx + gy < 2 && rng() < 0.5 ? 1 : 0))
  }
  const top = pick(rng, [RAMPS.leaf, RAMPS.lime, RAMPS.pink, RAMPS.cyan])
  r.shadow(48, 74, 34, 8)
  const cubes: { gx: number; gy: number; gz: number; rp: Ramp }[] = []
  for (let gx = 0; gx < N; gx++)
    for (let gy = 0; gy < N; gy++) for (let gz = 0; gz < heights[gx][gy]; gz++) cubes.push({ gx, gy, gz, rp: gz === heights[gx][gy] - 1 ? top : RAMPS.wood })
  // a prop on a random tile: tree or crystal
  const tx = int(rng, 0, N - 1)
  const ty = int(rng, 0, N - 1)
  const h0 = heights[tx][ty]
  if (rng() < 0.5) {
    cubes.push({ gx: tx, gy: ty, gz: h0, rp: RAMPS.wood })
    cubes.push({ gx: tx, gy: ty, gz: h0 + 1, rp: RAMPS.leaf })
    cubes.push({ gx: tx, gy: ty, gz: h0 + 2, rp: RAMPS.leaf })
  } else {
    cubes.push({ gx: tx, gy: ty, gz: h0, rp: tint })
    cubes.push({ gx: tx, gy: ty, gz: h0 + 1, rp: tint })
  }
  cubes.sort((a, b) => a.gx + a.gy - (b.gx + b.gy) || a.gz - b.gz)
  for (const c of cubes) isoCube(r, ox + (c.gx - c.gy) * 8, oy + (c.gx + c.gy) * 4 - c.gz * 8 + 16, c.rp)
  return r
}

function speaker(r: Raster, x: number, y: number, rp: Ramp) {
  r.rect(x, y + 6, 6, 10, RAMPS.steel[2])
  r.rect(x, y + 6, 6, 1, RAMPS.steel[3])
  for (let i = 0; i < 8; i++) r.rect(x + 6 + i, y + 6 - i, 1, 10 + i * 2, i < 2 ? RAMPS.steel[2] : rp[2 - (i > 5 ? 1 : 0)])
  r.rect(x + 6, y - 2, 1, 1, rp[3])
}

function sceneSfx(rng: Rng): Raster {
  const r = new Raster(S, S)
  const rp = ramp(rng)
  backdrop(r, rp[1])
  for (let x = 0; x < S; x += 2) r.px(x, 48, rp[1], 0.6)
  speaker(r, 6, 38, rp)
  for (let a = 0; a < 3; a++) {
    const R = 6 + a * 5
    for (let t = -0.8; t <= 0.8; t += 0.06) r.px(22 + Math.cos(t) * R, 48 + Math.sin(t) * R * 1.2, rp[3 - a > 0 ? 3 - a : 1])
  }
  // waveform
  let env = 0
  for (let i = 0; i < 18; i++) {
    const x = 40 + i * 3
    const shape = i < 3 ? (i + 1) / 3 : Math.exp(-(i - 3) / 6)
    env = Math.max(2, Math.round((10 + rng() * 26) * shape))
    for (let y = -env; y <= env; y++) {
      const t = Math.abs(y) / env
      r.rect(x, 48 + y, 2, 1, t < 0.3 ? rp[3] : t < 0.7 ? rp[2] : rp[1])
    }
  }
  for (let x = 40; x < 94; x += 6) r.rect(x, 86, 1, x % 18 === 4 ? 4 : 2, RAMPS.steel[1])
  r.text(pick(rng, ['SFX', 'BOOM', 'ZAP!', 'PEW', 'HIT!']), 8, 82, rp[3], 1)
  return r
}

function sceneMusic(rng: Rng): Raster {
  const r = new Raster(S, S)
  const rp = ramp(rng)
  backdrop(r, rp[1])
  // LED equalizer
  for (let c = 0; c < 11; c++) {
    const x = 6 + c * 8
    const level = int(rng, 3, 11)
    for (let sgm = 0; sgm < level; sgm++) {
      const y = 72 - sgm * 5
      const col = sgm > 8 ? RAMPS.rose[2] : sgm > 5 ? RAMPS.amber[2] : rp[2]
      r.rect(x, y, 6, 3, col)
      r.rect(x, y, 6, 1, mix(col, WHITE, 0.4))
    }
    r.rect(x, 72 - (level + 1) * 5, 6, 1, WHITE)
  }
  // notes
  const note = fromTemplate(NOTE, rp, {}, false)
  for (let i = 0; i < 3; i++) r.blit(note, int(rng, 6, 80), int(rng, 4, 20), 1)
  // piano keys
  r.rect(0, 80, S, 16, '#e9e6f5')
  for (let k = 0; k < S; k += 7) r.rect(k, 80, 1, 16, '#9a97b0')
  for (let k = 0; k < S; k += 7) if ([0, 1, 3, 4, 5].includes(Math.floor(k / 7) % 7)) r.rect(k + 4, 80, 4, 9, OUT)
  r.rect(0, 80, S, 1, rp[2])
  return r
}

const SCENES: Record<string, (rng: Rng) => Raster> = {
  sprites: sceneSprites,
  tilesets: sceneTileset,
  characters: sceneCharacters,
  ui: sceneUI,
  backgrounds: sceneBackground,
  vfx: sceneVfx,
  fonts: sceneFont,
  '3d': scene3d,
  sfx: sceneSfx,
  music: sceneMusic,
}

// ---------------------------------------------------------------------------
// public API
// ---------------------------------------------------------------------------

/** Category-aware thumbnail (square, ~384px). Unknown kinds fall back to sprites. */
export function generateSpriteThumb(seed: string, kind: string): string {
  return memo(`thumb:${kind}:${seed}`, () => {
    const scene = SCENES[kind] ?? sceneSprites
    const r = scene(seededRng(`thumb:${kind}:${seed}`))
    return r.url(Math.round(384 / r.w))
  })
}

/**
 * A real horizontal sprite sheet with `frames` cells (32x32 logical each):
 * a creature/character idle loop, or an expanding burst for VFX.
 */
export function generateSpriteSheet(seed: string, frames: number, kind: string): string {
  return memo(`sheet:${kind}:${frames}:${seed}`, () => {
    const rng = seededRng(`sheet:${seed}`)
    const C = 32
    const r = new Raster(C * frames, C)
    if (kind === 'vfx') {
      const cols = pick(rng, VFX_SETS)
      const k = int(rng, 5, 9)
      for (let f = 0; f < frames; f++) {
        const t = f / Math.max(1, frames - 1)
        const radius = 2 + Math.sin(t * Math.PI) * 13
        burst(r, f * C + 16, 16, radius, t > 0.75 ? cols.slice(0, -1) : cols, seededRng(`burst:${seed}:${f}`), k)
      }
    } else if (kind === 'characters') {
      const look = humanoidLook(rng)
      for (let f = 0; f < frames; f++) {
        const g = humanoid(look, f)
        r.shadow(f * C + 16, 30, 7, 1)
        r.blit(g, f * C + 16 - 9, 31 - g.h, 1)
      }
    } else {
      const base = creature(rng)
      for (let f = 0; f < frames; f++) {
        const ph = (f / frames) * Math.PI * 2
        const lift = Math.round((Math.sin(ph) + 1) * 2)
        r.shadow(f * C + 16, 29, 7 - lift / 2, 1)
        r.blit(base, f * C + 16 - 9, 28 - base.h - lift, 1)
      }
    }
    return r.url(4)
  })
}

/** Square pixel portrait: background, shoulders, head and hair. */
export function generateAvatar(seed: string): string {
  return memo(`avatar:${seed}`, () => {
    const rng = seededRng(`avatar:${seed}`)
    const r = new Raster(20, 20)
    const bg = ramp(rng)
    r.gradientV(0, 0, 20, 20, [bg[2], bg[1], bg[0]])
    const look = humanoidLook(rng)
    const { skin, hair, cloth, hairStyle } = look
    const g = new Grid(20, 20)
    g.rect(2, 16, 16, 4, cloth[2])
    g.rect(2, 16, 16, 1, cloth[3])
    g.rect(13, 17, 5, 3, cloth[1])
    g.rect(8, 14, 4, 2, skin[1])
    g.rect(5, 4, 10, 10, skin[2])
    g.rect(6, 5, 3, 2, skin[3])
    g.rect(14, 4, 1, 10, skin[1])
    g.rect(5, 13, 10, 1, skin[1])
    g.rect(7, 8, 2, 2, OUT)
    g.rect(11, 8, 2, 2, OUT)
    g.set(7, 8, WHITE)
    g.set(11, 8, WHITE)
    g.rect(9, 11, 2, 1, skin[0])
    g.set(6, 11, RAMPS.pink[2])
    g.set(13, 11, RAMPS.pink[2])
    if (hairStyle === 3) {
      g.rect(4, 2, 12, 4, cloth[2])
      g.rect(4, 6, 1, 9, cloth[2])
      g.rect(15, 6, 1, 9, cloth[1])
      g.rect(5, 2, 5, 1, cloth[3])
    } else if (hairStyle === 4) {
      g.rect(4, 2, 12, 4, RAMPS.steel[2])
      g.rect(5, 2, 4, 1, RAMPS.steel[3])
      g.rect(9, 0, 2, 2, RAMPS.rose[2])
    } else {
      g.rect(5, 2, 10, 4, hair[2])
      g.rect(6, 2, 4, 1, hair[3])
      g.rect(5, 6, 1, hairStyle === 1 ? 9 : 2, hair[1])
      g.rect(14, 6, 1, hairStyle === 1 ? 9 : 2, hair[1])
      if (hairStyle === 2) for (const x of [5, 8, 11, 14]) g.set(x, 1, hair[2])
      if (hairStyle === 1) {
        g.rect(4, 4, 1, 10, hair[2])
        g.rect(15, 4, 1, 10, hair[1])
      }
    }
    g.outline()
    r.blit(g, 0, 0)
    return r.url(6)
  })
}

/** Wide landscape banner (profile headers). */
export function generateBanner(seed: string): string {
  return memo(`banner:${seed}`, () => {
    const r = new Raster(192, 48)
    drawLandscape(r, seededRng(`banner:${seed}`), 192, 48)
    return r.url(4)
  })
}

/** Larger landscape for art panels. */
export function generateLandscape(seed: string, w = 160, h = 200): string {
  return memo(`land:${seed}:${w}x${h}`, () => {
    const r = new Raster(w, h)
    drawLandscape(r, seededRng(`land:${seed}`), w, h)
    return r.url(4)
  })
}

export type IllustrationKind = 'cart' | 'chest' | 'heart' | 'ghost' | 'search' | 'skull' | 'gem' | 'potion' | 'mushroom' | 'slime' | 'star'

/** Transparent spot illustration for empty and error states. */
export function generateIllustration(kind: IllustrationKind, seed = 'pf'): string {
  return memo(`illo:${kind}:${seed}`, () => {
    const rng = seededRng(`illo:${kind}:${seed}`)
    const r = new Raster(48, 48)
    let g: Grid
    if (kind === 'cart') g = fromTemplate(CART, RAMPS.violet, { s: RAMPS.steel[2] }, false)
    else if (kind === 'search') g = fromTemplate(MAGNIFIER, RAMPS.cyan, { g: RAMPS.cyan[1], h: RAMPS.wood[2] }, false)
    else g = templateSprite(kind as TemplateKey, rng)
    r.shadow(24, 42, 13, 2.5)
    r.blit(g, 24 - g.w, 42 - g.h * 2 + 2, 2)
    sparkle(r, 8, 10, RAMPS.violet[2])
    sparkle(r, 40, 16, RAMPS.cyan[2])
    r.px(36, 6, RAMPS.pink[3])
    r.px(10, 30, RAMPS.amber[3])
    return r.url(4)
  })
}

/** One frame of a small animated campfire (frames 0-3). */
export function generateCampfire(frame = 0): string {
  return memo(`fire:${frame}`, () => {
    const rng = seededRng(`fire:${frame}`)
    const r = new Raster(16, 16)
    const cols = [RAMPS.rose[1], RAMPS.rose[2], RAMPS.amber[2], RAMPS.amber[3], WHITE]
    for (let x = 3; x <= 12; x++) {
      const center = 1 - Math.abs(x - 7.5) / 5
      const hgt = Math.round(2 + center * 8 + (rng() - 0.5) * 3)
      for (let k = 0; k < hgt; k++) {
        const t = 1 - k / Math.max(1, hgt)
        r.px(x, 12 - k, cols[Math.min(4, Math.floor(t * center * 5.5))])
      }
    }
    for (let i = 0; i < 2; i++) r.px(int(rng, 4, 11), int(rng, 0, 3), RAMPS.amber[3])
    r.rect(2, 12, 12, 2, RAMPS.wood[1])
    r.rect(3, 12, 4, 1, RAMPS.wood[2])
    r.rect(4, 14, 8, 1, RAMPS.wood[0])
    return r.url(4)
  })
}
