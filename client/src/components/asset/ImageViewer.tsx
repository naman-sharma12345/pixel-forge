import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Film, Maximize2, Pause, Play, ZoomIn, ZoomOut } from 'lucide-react'
import { cn } from '@/lib/cn'
import { mediaUrl } from '@/lib/media'
import { Slider } from '@/components/ui'
import type { AssetMeta } from '@/types/api'

type BgMode = 'checker' | 'dark' | 'light'

const BG: Record<BgMode, { cls: string; label: string }> = {
  checker: { cls: 'checker', label: 'Checkerboard' },
  dark: { cls: 'bg-[#05050A]', label: 'Dark' },
  light: { cls: 'checker-light', label: 'Light' },
}

const MIN_ZOOM = 1
const MAX_ZOOM = 8

function ToolButton({ label, onClick, disabled, children, active }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        'inline-flex h-8 min-w-8 items-center justify-center rounded-[8px] px-1.5 text-muted transition-colors hover:bg-surface-3 hover:text-text disabled:pointer-events-none disabled:opacity-35',
        active && 'bg-surface-3 text-text',
      )}
    >
      {children}
    </button>
  )
}

/**
 * Image preview stage: background switcher, wheel/button zoom (1x-8x,
 * nearest-neighbour) with drag-to-pan, a thumbnail strip, and real sprite
 * sheet playback using background-position with steps(frames).
 */
export function ImageViewer({ images, meta, title }: { images: string[]; meta: AssetMeta; title: string }) {
  const reduce = useReducedMotion()
  const frames = meta.frames && meta.frames > 1 ? meta.frames : 0
  const [bg, setBg] = useState<BgMode>('checker')
  const [index, setIndex] = useState(0)
  const [scale, setScale] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  // the first preview of an animated asset is its sheet
  const isSheet = frames > 0 && index === 0
  const [sheetMode, setSheetMode] = useState<'animate' | 'sheet'>('animate')
  const [playing, setPlaying] = useState(!reduce)
  const [fps, setFps] = useState(12)
  const [frame, setFrame] = useState(0)
  const [startFrame, setStartFrame] = useState(0)
  const frameRef = useRef(0)
  frameRef.current = frame
  useEffect(() => { if (playing) setStartFrame(frameRef.current) }, [playing, fps])
  const stageRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null)

  const current = images[Math.min(index, images.length - 1)] ?? ''
  const showAnim = isSheet && sheetMode === 'animate'

  useEffect(() => { setScale(1); setPos({ x: 0, y: 0 }) }, [index, sheetMode])

  // keep the displayed frame in sync while playing so pausing freezes on it
  useEffect(() => {
    if (!showAnim || !playing) return
    const id = window.setInterval(() => setFrame((f) => (f + 1) % frames), 1000 / fps)
    return () => window.clearInterval(id)
  }, [showAnim, playing, frames, fps])

  const zoomAt = (cx: number, cy: number, next: number) => {
    const el = stageRef.current
    if (!el) return
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next))
    const ratio = clamped / scale
    const dx = cx - el.clientWidth / 2
    const dy = cy - el.clientHeight / 2
    setPos(clamped === 1 ? { x: 0, y: 0 } : { x: dx - (dx - pos.x) * ratio, y: dy - (dy - pos.y) * ratio })
    setScale(clamped)
  }
  const zoomCenter = (factor: number) => {
    const el = stageRef.current
    if (el) zoomAt(el.clientWidth / 2, el.clientHeight / 2, scale * factor)
  }

  // non-passive wheel so the page doesn't scroll while zooming
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      zoomAt(e.clientX - r.left, e.clientY - r.top, scale * (e.deltaY < 0 ? 1.2 : 1 / 1.2))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  })

  const onPointerDown = (e: React.PointerEvent) => {
    if (scale === 1) return
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    setPos({ x: drag.current.ox + (e.clientX - drag.current.sx), y: drag.current.oy + (e.clientY - drag.current.sy) })
  }
  const onPointerUp = () => { drag.current = null }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === '+' || e.key === '=') zoomCenter(1.25)
    else if (e.key === '-') zoomCenter(0.8)
    else if (e.key === '0') zoomAt(0, 0, 1)
    else if (showAnim && e.key === ' ') { e.preventDefault(); setPlaying((p) => !p) }
    else if (showAnim && e.key === 'ArrowRight') { setPlaying(false); setFrame((f) => (f + 1) % frames) }
    else if (showAnim && e.key === 'ArrowLeft') { setPlaying(false); setFrame((f) => (f - 1 + frames) % frames) }
  }

  return (
    <div className="overflow-hidden rounded-panel border border-border bg-surface">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-2.5 py-2">
        <div className="flex items-center gap-0.5 rounded-control border border-border bg-surface-2 p-0.5" role="radiogroup" aria-label="Stage background">
          {(Object.keys(BG) as BgMode[]).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={bg === m}
              aria-label={`${BG[m].label} background`}
              title={BG[m].label}
              onClick={() => setBg(m)}
              className={cn('h-6 w-7 rounded-[6px] ring-1 ring-inset transition-all', BG[m].cls, bg === m ? 'ring-2 ring-primary' : 'ring-white/10 opacity-70 hover:opacity-100')}
            />
          ))}
        </div>
        {isSheet && (
          <div className="flex items-center gap-0.5 rounded-control border border-border bg-surface-2 p-0.5" role="radiogroup" aria-label="Sprite sheet view">
            {(['animate', 'sheet'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={sheetMode === m}
                onClick={() => setSheetMode(m)}
                className={cn('h-6 rounded-[6px] px-2.5 text-xs font-medium transition-colors', sheetMode === m ? 'bg-surface-3 text-text' : 'text-muted hover:text-text')}
              >
                {m === 'animate' ? 'Animate' : 'Full sheet'}
              </button>
            ))}
          </div>
        )}
        <div className="ml-auto flex items-center gap-0.5">
          <ToolButton label="Zoom out (-)" onClick={() => zoomCenter(0.8)} disabled={scale <= MIN_ZOOM}>
            <ZoomOut className="h-4 w-4" />
          </ToolButton>
          <span className="w-12 text-center font-mono text-xs tabular-nums text-muted">{Math.round(scale * 100)}%</span>
          <ToolButton label="Zoom in (+)" onClick={() => zoomCenter(1.25)} disabled={scale >= MAX_ZOOM}>
            <ZoomIn className="h-4 w-4" />
          </ToolButton>
          <ToolButton label="Fit (0)" onClick={() => zoomAt(0, 0, 1)} disabled={scale === 1}>
            <Maximize2 className="h-4 w-4" />
          </ToolButton>
        </div>
      </div>

      {/* stage */}
      <div
        ref={stageRef}
        tabIndex={0}
        onKeyDown={onKey}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={(e) => {
          const r = stageRef.current!.getBoundingClientRect()
          zoomAt(e.clientX - r.left, e.clientY - r.top, scale > 1 ? 1 : 3)
        }}
        className={cn(
          'relative h-[340px] w-full touch-none select-none overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent sm:h-[460px]',
          BG[bg].cls,
          scale > 1 ? (drag.current ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in',
        )}
        role="img"
        aria-label={`${title} preview. Scroll or press plus and minus to zoom.`}
      >
        <div
          className="absolute inset-0 flex items-center justify-center p-6 will-change-transform"
          style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`, transition: drag.current ? 'none' : 'transform 150ms cubic-bezier(0.22,1,0.36,1)' }}
        >
          {showAnim ? (
            <div
              className="pixelated aspect-square h-[78%] max-w-full"
              style={{
                backgroundImage: `url(${mediaUrl(current)})`,
                backgroundSize: `${frames * 100}% 100%`,
                backgroundRepeat: 'no-repeat',
                imageRendering: 'pixelated',
                ...(playing
                  ? {
                      // CSS sprite playback: background-position stepped across the sheet
                      animation: `pf-sheet ${frames / fps}s steps(${frames}, jump-none) infinite`,
                      animationDelay: `-${startFrame / fps}s`,
                    }
                  : { backgroundPositionX: `${(frame / (frames - 1)) * 100}%` }),
              }}
            />
          ) : (
            <img src={mediaUrl(current)} alt={title} className="pixelated max-h-full max-w-full object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.45)]" draggable={false} />
          )}
        </div>
        {scale === 1 && (
          <span className="pointer-events-none absolute bottom-3 right-3 hidden rounded-md bg-bg/70 px-2 py-1 text-[11px] text-muted backdrop-blur sm:block">
            Scroll to zoom · double-click to inspect
          </span>
        )}
      </div>

      {/* animation controls */}
      {showAnim && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border px-3 py-2.5">
          <div className="flex items-center gap-1">
            <ToolButton label="Previous frame" onClick={() => { setPlaying(false); setFrame((f) => (f - 1 + frames) % frames) }}>
              <ChevronLeft className="h-4 w-4" />
            </ToolButton>
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? 'Pause animation' : 'Play animation'}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary-hover"
            >
              {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
            </button>
            <ToolButton label="Next frame" onClick={() => { setPlaying(false); setFrame((f) => (f + 1) % frames) }}>
              <ChevronRight className="h-4 w-4" />
            </ToolButton>
          </div>
          <span className="font-mono text-xs tabular-nums text-muted">
            Frame <span className="text-text">{String(frame + 1).padStart(2, '0')}</span>/{String(frames).padStart(2, '0')}
          </span>
          <div className="flex min-w-[180px] flex-1 items-center gap-3">
            <span className="text-xs text-subtle">FPS</span>
            <Slider value={fps} min={4} max={24} step={1} onChange={setFps} label="Frames per second" className="flex-1" />
            <span className="w-6 text-right font-mono text-xs tabular-nums text-text">{fps}</span>
          </div>
        </div>
      )}

      {/* thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto border-t border-border p-2.5">
          {images.map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={i === 0 && frames ? 'Sprite sheet' : `Preview ${i + 1}`}
              aria-pressed={index === i}
              className={cn(
                'relative h-16 w-16 shrink-0 overflow-hidden rounded-control bg-surface-2 ring-2 ring-offset-2 ring-offset-surface transition-all',
                index === i ? 'ring-primary' : 'ring-transparent opacity-60 hover:opacity-100',
              )}
            >
              <img src={mediaUrl(url)} alt="" className={cn('pixelated h-full w-full', i === 0 && frames ? 'object-cover object-left' : 'object-cover')} />
              {i === 0 && frames > 0 && (
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-0.5 bg-bg/80 py-0.5 text-[9px] font-medium text-text">
                  <Film className="h-2.5 w-2.5" /> {frames}f
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
