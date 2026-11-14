import { seededRng, pick, int } from './seeded'
import type { MediaKind } from '@/types/api'

const PALETTES: [string, string, string, string][] = [
  ['#8B5CF6', '#22D3EE', '#F472B6', '#A3E635'],
  ['#F472B6', '#FBBF24', '#22D3EE', '#8B5CF6'],
  ['#22D3EE', '#A3E635', '#8B5CF6', '#FB7185'],
  ['#FBBF24', '#FB7185', '#22D3EE', '#EDEDF5'],
  ['#A3E635', '#8B5CF6', '#F472B6', '#22D3EE'],
  ['#FB7185', '#8B5CF6', '#FBBF24', '#A3E635'],
]

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  return [c, ctx]
}

/** Deterministic pixel-art avatar (16x16 face on transparent bg). */
export function generateAvatar(seed: string): string {
  const rng = seededRng(`avatar:${seed}`)
  const [c, ctx] = canvas(64, 64)
  const bg = pick(rng, PALETTES)
  const skin = pick(rng, ['#FBBF24', '#F472B6', '#22D3EE', '#A3E635', '#EDEDF5'])
  const hair = pick(rng, ['#8B5CF6', '#FB7185', '#22D3EE', '#FBBF24', '#5C5C74'])
  // background
  ctx.fillStyle = bg[0]
  ctx.fillRect(0, 0, 64, 64)
  ctx.fillStyle = 'rgba(0,0,0,0.25)'
  ctx.fillRect(0, 48, 64, 16)
  // head
  ctx.fillStyle = skin
  ctx.fillRect(20, 16, 24, 24)
  // hair
  ctx.fillStyle = hair
  ctx.fillRect(20, 8, 24, 10)
  ctx.fillRect(16, 12, 4, 12)
  ctx.fillRect(44, 12, 4, 12)
  // eyes
  ctx.fillStyle = '#08080D'
  ctx.fillRect(27, 26, 4, 6)
  ctx.fillRect(37, 26, 4, 6)
  // mouth
  ctx.fillRect(28, 36, 8, 2)
  // shoulders
  ctx.fillStyle = bg[1]
  ctx.fillRect(12, 48, 40, 16)
  return c.toDataURL('image/png')
}

/** Wide banner for profile / hero fallback (128x40 logical). */
export function generateBanner(seed: string): string {
  const rng = seededRng(`banner:${seed}`)
  const [c, ctx] = canvas(256, 80)
  const cols = PALETTES[int(rng, 0, PALETTES.length - 1)]
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = cols[i % cols.length]
    const x = int(rng, 0, 30) * 8
    const w = int(rng, 2, 6) * 8
    const y = int(rng, 0, 5) * 16
    ctx.globalAlpha = 0.5 + rng() * 0.4
    ctx.fillRect(x, y, w, int(rng, 1, 4) * 16)
  }
  // pixel mountain silhouette
  ctx.globalAlpha = 1
  ctx.fillStyle = '#08080D'
  for (let x = 0; x < 256; x += 8) {
    const h = 10 + Math.floor(Math.abs(Math.sin(x / 22 + rng())) * 3) * 8
    ctx.fillRect(x, 80 - h, 8, h)
  }
  // stars
  ctx.fillStyle = '#EDEDF5'
  for (let i = 0; i < 30; i++) {
    ctx.globalAlpha = 0.3 + rng() * 0.7
    ctx.fillRect(int(rng, 0, 31) * 8, int(rng, 0, 6) * 8, 4, 4)
  }
  return c.toDataURL('image/png')
}

const SPRITE_MOTIFS: Record<string, (ctx: CanvasRenderingContext2D, rng: () => number, cols: string[]) => void> = {
  sprites: (ctx, _rng, cols) => {
    // little character
    ctx.fillStyle = cols[0]
    ctx.fillRect(24, 12, 16, 16)
    ctx.fillStyle = cols[1]
    ctx.fillRect(20, 28, 24, 18)
    ctx.fillStyle = '#08080D'
    ctx.fillRect(28, 20, 3, 4)
    ctx.fillRect(37, 20, 3, 4)
    ctx.fillStyle = cols[2]
    ctx.fillRect(12, 40, 8, 8)
    ctx.fillRect(44, 40, 8, 8)
  },
  tilesets: (ctx, _rng, cols) => {
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        ctx.fillStyle = cols[(x + y) % cols.length]
        ctx.fillRect(x * 16 + 4, y * 16 + 4, 12, 12)
        ctx.fillStyle = 'rgba(0,0,0,0.3)'
        ctx.fillRect(x * 16 + 4, y * 16 + 13, 12, 3)
      }
  },
  characters: (ctx, _rng, cols) => {
    ctx.fillStyle = cols[0]
    ctx.fillRect(28, 10, 8, 8)
    ctx.fillStyle = cols[1]
    ctx.fillRect(24, 18, 16, 12)
    ctx.fillStyle = cols[2]
    ctx.fillRect(18, 30, 28, 22)
    ctx.fillStyle = cols[3]
    ctx.fillRect(8, 26, 10, 26)
    ctx.fillRect(46, 26, 10, 26)
    ctx.fillStyle = '#08080D'
    ctx.fillRect(29, 22, 3, 4)
    ctx.fillRect(38, 22, 3, 4)
  },
  ui: (ctx, _rng, cols) => {
    ctx.fillStyle = '#161622'
    ctx.fillRect(8, 8, 48, 48)
    ctx.fillStyle = cols[0]
    ctx.fillRect(14, 14, 36, 10)
    ctx.fillStyle = cols[1]
    ctx.fillRect(14, 28, 36, 10)
    ctx.fillStyle = cols[2]
    ctx.fillRect(14, 42, 22, 10)
    ctx.fillStyle = '#EDEDF5'
    ctx.fillRect(40, 44, 10, 6)
  },
  backgrounds: (ctx, rng, cols) => {
    ctx.fillStyle = cols[0]
    ctx.fillRect(0, 0, 64, 64)
    ctx.fillStyle = cols[1]
    for (let i = 0; i < 8; i++) ctx.fillRect(int(rng, 0, 7) * 8, int(rng, 0, 7) * 8, 8, 8)
    ctx.fillStyle = '#08080D'
    ctx.fillRect(0, 48, 64, 16)
    ctx.fillStyle = cols[2]
    ctx.fillRect(8, 40, 48, 8)
    ctx.fillStyle = cols[3]
    ctx.fillRect(24, 24, 16, 16)
  },
  vfx: (ctx, _rng, cols) => {
    const cx = 32
    const cy = 32
    for (let r = 4; r < 30; r += 6) {
      ctx.fillStyle = cols[Math.floor(r / 6) % cols.length]
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2 + r
        ctx.fillRect(Math.round(cx + Math.cos(ang) * r), Math.round(cy + Math.sin(ang) * r), 6, 6)
      }
    }
    ctx.fillStyle = '#EDEDF5'
    ctx.fillRect(cx - 4, cy - 4, 8, 8)
  },
  fonts: (ctx, _rng, cols) => {
    ctx.fillStyle = '#161622'
    ctx.fillRect(0, 0, 64, 64)
    ctx.fillStyle = cols[0]
    ctx.font = 'bold 34px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('Aa', 32, 34)
    ctx.fillStyle = cols[1]
    ctx.fillRect(10, 54, 44, 3)
  },
  '3d': (ctx, _rng, cols) => {
    ctx.fillStyle = cols[0]
    ctx.beginPath()
    ctx.moveTo(32, 8)
    ctx.lineTo(56, 24)
    ctx.lineTo(32, 56)
    ctx.lineTo(8, 24)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = cols[1]
    ctx.beginPath()
    ctx.moveTo(32, 8)
    ctx.lineTo(56, 24)
    ctx.lineTo(32, 40)
    ctx.lineTo(8, 24)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.fillRect(26, 16, 12, 12)
  },
  sfx: (ctx, _rng, cols) => {
    ctx.fillStyle = '#161622'
    ctx.fillRect(0, 0, 64, 64)
    ctx.strokeStyle = cols[0]
    ctx.lineWidth = 3
    ctx.beginPath()
    for (let x = 0; x < 64; x += 2) {
      const y = 32 + Math.sin(x / 5) * (8 + (x % 17))
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.fillStyle = cols[1]
    ctx.fillRect(6, 14, 4, 36)
    ctx.fillRect(54, 14, 4, 36)
  },
  music: (ctx, _rng, cols) => {
    ctx.fillStyle = '#161622'
    ctx.fillRect(0, 0, 64, 64)
    const notes = [0, 1, 2, 3, 4, 5, 6, 7]
    notes.forEach((n, i) => {
      const h = 8 + ((n * 7 + i * 5) % 5) * 6
      ctx.fillStyle = cols[i % cols.length]
      ctx.fillRect(6 + i * 7, 56 - h, 5, h)
    })
    ctx.fillStyle = '#EDEDF5'
    ctx.fillRect(4, 54, 56, 3)
  },
}

/** Deterministic pixel-art thumbnail for mock assets / fallbacks. */
export function generateSpriteThumb(seed: string, kind: MediaKind | string): string {
  const rng = seededRng(`thumb:${seed}`)
  const [c, ctx] = canvas(128, 128)
  const key = kind in SPRITE_MOTIFS ? kind : 'sprites'
  const motif = SPRITE_MOTIFS[key] ?? SPRITE_MOTIFS.sprites

  // backdrop
  const bgCols = PALETTES[int(rng, 0, PALETTES.length - 1)]
  ctx.fillStyle = '#0F0F17'
  ctx.fillRect(0, 0, 128, 128)
  // dithered gradient blocks
  for (let y = 0; y < 128; y += 8) {
    for (let x = 0; x < 128; x += 8) {
      const t = (x + y) / 256
      ctx.fillStyle = bgCols[Math.floor(t * bgCols.length) % bgCols.length]
      ctx.globalAlpha = 0.12 + rng() * 0.2
      ctx.fillRect(x, y, 8, 8)
    }
  }
  ctx.globalAlpha = 1

  // draw motif scaled 2x into center
  const [mc, mctx] = canvas(64, 64)
  motif(mctx, rng, bgCols)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(mc, 32, 32, 64, 64)

  // frame
  ctx.strokeStyle = 'rgba(139,92,246,0.5)'
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, 126, 126)
  return c.toDataURL('image/png')
}

/** Tiny pixel campfire for the footer. */
export function generateCampfire(): string {
  const [c, ctx] = canvas(32, 32)
  ctx.clearRect(0, 0, 32, 32)
  const frames: [number, number, string][] = [
    [12, 18, '#FBBF24'],
    [10, 22, '#F97316'],
    [14, 26, '#FB7185'],
    [12, 14, '#FDE68A'],
  ]
  for (const [x, y, col] of frames) {
    ctx.fillStyle = col
    ctx.fillRect(x * 2, y * 2 - 8, 8, 8)
    ctx.fillRect((x - 1) * 2, y * 2, 8, 8)
    ctx.fillRect((x + 1) * 2, y * 2, 8, 8)
  }
  ctx.fillStyle = '#78350F'
  ctx.fillRect(8, 52, 16, 4)
  return c.toDataURL('image/png')
}
