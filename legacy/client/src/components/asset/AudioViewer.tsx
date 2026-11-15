import { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { AudioLines, Pause, Play, Repeat, Volume1, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/cn'
import { mediaUrl } from '@/lib/media'
import { formatDuration } from '@/lib/format'
import { Slider } from '@/components/ui'
import { Equalizer } from '@/components/asset/AssetCard'
import { usePlayerStore } from '@/stores/player'
import type { AssetDetail, AssetPreview } from '@/types/api'

const TAKE_NAMES = ['Main preview', 'Alternate take', 'Stinger', 'Extended mix']

/**
 * Big WaveSurfer waveform for audio assets. Starting it pauses the global
 * player, and the global player starting pauses it, so only one sound plays.
 */
export function AudioViewer({ asset }: { asset: AssetDetail }) {
  const audioPreviews: AssetPreview[] = asset.previews.filter((p) => p.kind === 'audio')
  const previewList = audioPreviews.length ? audioPreviews : asset.previewAudioUrl ? [{ url: asset.previewAudioUrl, kind: 'audio' as const }] : []

  const [index, setIndex] = useState(0)
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [durations, setDurations] = useState<Record<number, number>>({})
  const [loop, setLoop] = useState(!!asset.meta.loopable)
  const [volume, setVolume] = useState(() => usePlayerStore.getState().volume)
  const [muted, setMuted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WaveSurfer | null>(null)
  const loopRef = useRef(loop)
  const autoplayRef = useRef(false)
  const globalPlaying = usePlayerStore((s) => s.isPlaying)
  const pauseGlobal = usePlayerStore((s) => s.pause)

  useEffect(() => { loopRef.current = loop }, [loop])
  useEffect(() => { if (globalPlaying) wsRef.current?.pause() }, [globalPlaying])

  const url = previewList[Math.min(index, Math.max(0, previewList.length - 1))]?.url ?? ''

  useEffect(() => {
    if (!containerRef.current || !url) return
    setReady(false)
    setCurrent(0)
    const ctx = document.createElement('canvas').getContext('2d')!
    const wave = ctx.createLinearGradient(0, 0, 0, 140)
    wave.addColorStop(0, 'rgba(196,181,253,0.55)')
    wave.addColorStop(0.5, 'rgba(139,92,246,0.35)')
    wave.addColorStop(1, 'rgba(34,211,238,0.25)')
    const progress = ctx.createLinearGradient(0, 0, 0, 140)
    progress.addColorStop(0, '#C4B5FD')
    progress.addColorStop(0.5, '#8B5CF6')
    progress.addColorStop(1, '#22D3EE')

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: wave,
      progressColor: progress,
      cursorColor: '#EDEDF5',
      cursorWidth: 2,
      height: 140,
      barWidth: 3,
      barGap: 2,
      barRadius: 3,
      normalize: true,
      dragToSeek: true,
    })
    wsRef.current = ws
    // destroy() aborts an in-flight load; that rejection is expected
    ws.load(mediaUrl(url)).catch(() => {})
    ws.on('ready', () => {
      const d = ws.getDuration()
      setDuration(d)
      setDurations((m) => ({ ...m, [index]: d }))
      setReady(true)
      ws.setVolume(muted ? 0 : volume)
      if (autoplayRef.current) {
        autoplayRef.current = false
        ws.play()
      }
    })
    ws.on('timeupdate', (t) => setCurrent(t))
    ws.on('play', () => { setPlaying(true); pauseGlobal() })
    ws.on('pause', () => setPlaying(false))
    ws.on('finish', () => {
      if (loopRef.current) { ws.seekTo(0); ws.play() } else setPlaying(false)
    })
    return () => {
      ws.destroy()
      wsRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  useEffect(() => { wsRef.current?.setVolume(muted ? 0 : volume) }, [volume, muted])

  const choose = (i: number) => {
    if (i === index) { wsRef.current?.playPause(); return }
    autoplayRef.current = true
    setIndex(i)
  }

  if (!previewList.length) {
    return (
      <div className="flex h-[260px] flex-col items-center justify-center gap-3 rounded-panel border border-border bg-surface text-sm text-muted">
        <AudioLines className="h-8 w-8 text-subtle" />
        No audio previews for this asset yet.
      </div>
    )
  }

  const VolIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2
  const chips = [
    asset.meta.bpm ? `${asset.meta.bpm} BPM` : null,
    asset.meta.durationSec ? formatDuration(asset.meta.durationSec) : null,
    asset.meta.loopable ? 'Seamless loop' : null,
    asset.meta.sampleRate ? `${(Number(asset.meta.sampleRate) / 1000).toFixed(1)} kHz` : null,
  ].filter(Boolean) as string[]

  return (
    <div className="overflow-hidden rounded-panel border border-border bg-surface">
      {/* header with blurred cover */}
      <div className="relative overflow-hidden border-b border-border">
        <img src={mediaUrl(asset.thumbnail.url)} alt="" className="pixelated absolute inset-0 h-full w-full scale-125 object-cover opacity-30 blur-2xl" />
        <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/80 to-surface/40" />
        <div className="relative flex items-center gap-4 p-4 sm:p-5">
          <img src={mediaUrl(asset.thumbnail.url)} alt="" className="pixelated h-16 w-16 shrink-0 rounded-[10px] object-cover ring-1 ring-white/10 sm:h-20 sm:w-20" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-pixel text-[8px] uppercase text-accent">
              {playing ? <Equalizer className="h-2.5 text-accent" /> : <AudioLines className="h-3 w-3" />}
              {playing ? 'Now playing' : 'Audio preview'}
            </p>
            <p className="mt-1.5 truncate font-display text-lg font-semibold text-text">{TAKE_NAMES[index] ?? `Preview ${index + 1}`}</p>
            {chips.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {chips.map((c) => (
                  <span key={c} className="rounded-md bg-surface-3/80 px-1.5 py-0.5 font-mono text-[10px] text-muted">{c}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* waveform */}
      <div className="relative px-4 pb-2 pt-6 sm:px-5">
        {!ready && (
          <div className="absolute inset-x-4 top-6 flex h-[140px] items-center gap-[2px] sm:inset-x-5" aria-hidden="true">
            {Array.from({ length: 80 }).map((_, i) => (
              <span key={i} className="flex-1 animate-pulse rounded-full bg-surface-3" style={{ height: `${20 + Math.abs(Math.sin(i * 0.7)) * 60}%`, animationDelay: `${(i % 10) * 60}ms` }} />
            ))}
          </div>
        )}
        <div ref={containerRef} className={cn('w-full cursor-pointer transition-opacity duration-300', ready ? 'opacity-100' : 'opacity-0')} aria-label="Waveform, click to seek" />
        <div className="mt-2 flex justify-between font-mono text-[11px] tabular-nums text-subtle">
          <span className="text-text">{formatDuration(current)}</span>
          <span>{formatDuration(duration)}</span>
        </div>
      </div>

      {/* transport */}
      <div className="flex flex-wrap items-center gap-3 px-4 pb-4 sm:px-5">
        <button
          type="button"
          onClick={() => wsRef.current?.playPause()}
          disabled={!ready}
          aria-label={playing ? 'Pause preview' : 'Play preview'}
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-full text-bg transition-all duration-150 active:scale-95 disabled:opacity-50',
            playing ? 'bg-accent shadow-[0_0_0_6px_rgba(34,211,238,0.15),0_10px_30px_rgba(34,211,238,0.3)]' : 'bg-text hover:scale-105',
          )}
        >
          {playing ? <Pause className="h-6 w-6 fill-current" /> : <Play className="ml-1 h-6 w-6 fill-current" />}
        </button>
        <button
          type="button"
          onClick={() => setLoop((v) => !v)}
          aria-pressed={loop}
          className={cn(
            'inline-flex h-9 items-center gap-1.5 rounded-control border px-3 text-xs font-medium transition-colors',
            loop ? 'border-primary/50 bg-primary-soft text-text' : 'border-border text-muted hover:text-text',
          )}
        >
          <Repeat className={cn('h-3.5 w-3.5', loop && 'text-primary')} /> Loop {loop ? 'on' : 'off'}
        </button>
        <div className="ml-auto flex min-w-[150px] items-center gap-2">
          <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Unmute' : 'Mute'} className="text-muted transition-colors hover:text-text">
            <VolIcon className="h-4 w-4" />
          </button>
          <Slider value={Math.round((muted ? 0 : volume) * 100)} min={0} max={100} onChange={(v) => { setMuted(false); setVolume(v / 100) }} label="Volume" className="w-28" />
        </div>
      </div>

      {/* track list */}
      {previewList.length > 1 && (
        <ol className="border-t border-border p-2">
          {previewList.map((_, i) => {
            const active = i === index
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => choose(i)}
                  aria-current={active}
                  className={cn('flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left text-sm transition-colors', active ? 'bg-primary-soft text-text' : 'text-muted hover:bg-surface-2 hover:text-text')}
                >
                  <span className="flex w-5 justify-center font-mono text-xs text-subtle">
                    {active && playing ? <Equalizer className="h-3 text-accent" bars={3} /> : String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="flex-1 truncate">{TAKE_NAMES[i] ?? `Preview ${i + 1}`}</span>
                  <span className="font-mono text-xs text-subtle">{durations[i] ? formatDuration(durations[i]) : '–:––'}</span>
                </button>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
