import confetti from 'canvas-confetti'

const COLORS = ['#8B5CF6', '#22D3EE', '#A3E635', '#F472B6', '#FBBF24']

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/** Brand-coloured confetti burst with square "pixel" particles; no-op for reduced motion. */
export function fireConfetti(origin: { x?: number; y?: number } = { y: 0.6 }) {
  if (reducedMotion()) return
  const base = { colors: COLORS, shapes: ['square' as const], ticks: 220, disableForReducedMotion: true }
  confetti({ ...base, particleCount: 90, spread: 70, startVelocity: 42, origin })
  setTimeout(() => confetti({ ...base, particleCount: 50, angle: 60, spread: 55, origin: { x: 0, y: 0.7 } }), 160)
  setTimeout(() => confetti({ ...base, particleCount: 50, angle: 120, spread: 55, origin: { x: 1, y: 0.7 } }), 160)
}
