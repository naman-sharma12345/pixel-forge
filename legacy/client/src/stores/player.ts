import { create } from 'zustand'

export interface PlayerTrack {
  assetId: string
  slug: string
  title: string
  creatorName: string
  thumbnailUrl: string
  url: string
}

interface PlayerState {
  track: PlayerTrack | null
  isPlaying: boolean
  progress: number
  duration: number
  volume: number
  play: (track: PlayerTrack) => void
  toggle: () => void
  pause: () => void
  seek: (seconds: number) => void
  setProgress: (seconds: number) => void
  setDuration: (seconds: number) => void
  setVolume: (v: number) => void
  close: () => void
}

const VOLUME_KEY = 'pf_player_volume'
const savedVolume = (() => {
  try {
    const v = Number(localStorage.getItem(VOLUME_KEY))
    return Number.isFinite(v) && v >= 0 && v <= 1 ? v : 0.8
  } catch { return 0.8 }
})()

export const usePlayerStore = create<PlayerState>((set, get) => ({
  track: null,
  isPlaying: false,
  progress: 0,
  duration: 0,
  volume: savedVolume,
  play: (track) => {
    const cur = get()
    if (cur.track?.assetId === track.assetId) {
      set({ isPlaying: !cur.isPlaying })
    } else {
      set({ track, isPlaying: true, progress: 0, duration: 0 })
    }
  },
  toggle: () => set((s) => ({ isPlaying: s.track ? !s.isPlaying : false })),
  pause: () => set({ isPlaying: false }),
  seek: (seconds) => set({ progress: Math.max(0, seconds) }),
  setProgress: (seconds) => set({ progress: seconds }),
  setDuration: (seconds) => set({ duration: seconds }),
  setVolume: (v) => {
    const volume = Math.min(1, Math.max(0, v))
    try { localStorage.setItem(VOLUME_KEY, String(volume)) } catch { /* noop */ }
    set({ volume })
  },
  close: () => set({ track: null, isPlaying: false, progress: 0, duration: 0 }),
}))
