/** Tiny procedural WAV generator — square/saw/noise chiptune blips as Blob URLs. */

export type AudioKind = 'coin' | 'laser' | 'jump' | 'explosion' | 'loop'

const CACHE = new Map<AudioKind, string>()

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buf = new ArrayBuffer(44 + samples.length * 2)
  const v = new DataView(buf)
  const ws = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)) }
  ws(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); ws(8, 'WAVE')
  ws(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  ws(36, 'data'); v.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Blob([buf], { type: 'audio/wav' })
}

const SR = 22050

function tone(freq: number, dur: number, type: 'square' | 'saw' | 'sine', vol = 0.4, slideTo?: number): Float32Array {
  const n = Math.floor(SR * dur)
  const out = new Float32Array(n)
  let phase = 0
  for (let i = 0; i < n; i++) {
    const t = i / n
    const f = slideTo ? freq + (slideTo - freq) * t : freq
    phase += (2 * Math.PI * f) / SR
    const p = phase % (2 * Math.PI)
    let s = 0
    if (type === 'square') s = p < Math.PI ? 1 : -1
    else if (type === 'saw') s = (p / Math.PI) * 2 - 1
    else s = Math.sin(p)
    // envelope
    const env = Math.min(1, i / (SR * 0.005)) * Math.min(1, (n - i) / (SR * 0.03))
    out[i] = s * vol * env
  }
  return out
}

function noise(dur: number, vol = 0.35): Float32Array {
  const n = Math.floor(SR * dur)
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const env = Math.min(1, i / (SR * 0.002)) * Math.pow(1 - i / n, 2)
    out[i] = (Math.random() * 2 - 1) * vol * env
  }
  return out
}

function concat(parts: Float32Array[]): Float32Array {
  const total = parts.reduce((a, p) => a + p.length, 0)
  const out = new Float32Array(total)
  let off = 0
  for (const p of parts) { out.set(p, off); off += p.length }
  return out
}

function render(kind: AudioKind): string {
  let samples: Float32Array
  switch (kind) {
    case 'coin':
      samples = concat([tone(988, 0.08, 'square', 0.35), tone(1319, 0.35, 'square', 0.35)])
      break
    case 'laser':
      samples = tone(1400, 0.22, 'saw', 0.35, 180)
      break
    case 'jump':
      samples = tone(280, 0.18, 'square', 0.35, 720)
      break
    case 'explosion':
      samples = concat([noise(0.5, 0.5), tone(90, 0.45, 'sine', 0.5, 40)])
      break
    case 'loop': {
      // short chiptune loop: bass + arpeggio, ~2s, loopable
      const bass = tone(110, 2.0, 'square', 0.22)
      const arp = concat([
        tone(440, 0.24, 'square', 0.18), tone(523, 0.24, 'square', 0.18),
        tone(659, 0.24, 'square', 0.18), tone(523, 0.24, 'square', 0.18),
        tone(440, 0.24, 'square', 0.18), tone(392, 0.24, 'square', 0.18),
        tone(523, 0.4, 'square', 0.18),
      ])
      const out = new Float32Array(Math.max(bass.length, arp.length))
      for (let i = 0; i < out.length; i++) {
        out[i] = (i < bass.length ? bass[i] : 0) * 0.7 + (i < arp.length ? arp[i] : 0) * 0.5
      }
      samples = out
      break
    }
  }
  return URL.createObjectURL(encodeWav(samples, SR))
}

export function audioPreviewUrl(kind: AudioKind | string): string {
  const k = (['coin', 'laser', 'jump', 'explosion', 'loop'] as const).includes(kind as AudioKind)
    ? (kind as AudioKind)
    : 'loop'
  if (!CACHE.has(k)) CACHE.set(k, render(k))
  return CACHE.get(k)!
}
