import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Pause, Play, Volume2, VolumeX, X } from 'lucide-react'
import { usePlayerStore } from '@/stores/player'
import { IconButton, ProgressBar } from '@/components/ui'
import { mediaUrl } from '@/lib/media'
import { formatDuration } from '@/lib/format'
import { cn } from '@/lib/cn'

/** Global audio player — one HTMLAudioElement for the whole app. */
export function GlobalPlayer() {
  const { track, isPlaying, progress, duration, volume, toggle, setProgress, setDuration, setVolume, close } = usePlayerStore()
  const audioRef = useRef<HTMLAudioElement>(null)
  const location = useLocation()
  const hidden = location.pathname.startsWith('/studio/new') || location.pathname.startsWith('/studio/edit')

  // sync element with store
  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    if (track) {
      if (el.dataset.trackId !== track.assetId) {
        el.dataset.trackId = track.assetId
        el.src = mediaUrl(track.url)
        el.load()
      }
      if (isPlaying) el.play().catch(() => usePlayerStore.getState().pause())
      else el.pause()
    } else {
      el.pause()
      el.removeAttribute('src')
      el.load()
    }
  }, [track, isPlaying])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume, track])

  if (hidden || !track) return <audio ref={audioRef} className="hidden" preload="none" />

  return (
    <>
      <audio
        ref={audioRef}
        className="hidden"
        preload="none"
        onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onEnded={() => usePlayerStore.getState().pause()}
      />
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/90 backdrop-blur-xl transition-transform duration-300',
        )}
        role="region"
        aria-label="Now playing"
      >
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
          <img
            src={mediaUrl(track.thumbnailUrl)}
            alt=""
            className="pixelated h-10 w-10 shrink-0 rounded-control border border-border object-cover"
          />
          <div className="min-w-0 flex-1 sm:flex-none sm:w-56">
            <p className="truncate text-sm font-medium text-text">{track.title}</p>
            <p className="truncate text-xs text-muted">{track.creatorName}</p>
          </div>

          <div className="flex items-center gap-2">
            <IconButton label={isPlaying ? 'Pause' : 'Play'} onClick={toggle} className="!h-9 !w-9 text-text">
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-[1px]" />}
            </IconButton>
            <span className="hidden font-mono text-xs text-muted sm:inline">{formatDuration(progress)}</span>
          </div>

          <div className="hidden min-w-0 flex-1 px-2 sm:block">
            <ProgressBar value={progress} max={duration || 1} label="Seek" />
          </div>
          <span className="hidden font-mono text-xs text-subtle md:inline">{formatDuration(duration)}</span>

          <div className="hidden items-center gap-2 md:flex">
            <button
              type="button"
              onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
              aria-label={volume === 0 ? 'Unmute' : 'Mute'}
              className="text-muted hover:text-text"
            >
              {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label="Volume"
              className="slider h-1 w-20 cursor-pointer appearance-none rounded-full bg-surface-3 accent-primary"
            />
          </div>

          <IconButton label="Stop" onClick={close} className="!h-8 !w-8">
            <X className="h-4 w-4" />
          </IconButton>
        </div>
        {/* mobile seek */}
        <div className="px-4 pb-2 sm:hidden">
          <ProgressBar value={progress} max={duration || 1} label="Seek" />
        </div>
      </div>
      {/* spacer so content isn't hidden behind the bar */}
      <div className="h-16" />
    </>
  )
}
