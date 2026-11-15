import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'

interface P { x: number; y: number; vx: number; vy: number; s: number; hue: number; phase: number }

/** Drifting pixel-field canvas — squares brighten near the mouse. */
export function PixelField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduce = useReducedMotion()
  const mouse = useRef({ x: -9999, y: -9999 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let running = false
    let w = 0
    let h = 0
    let pixels: P[] = []
    const dpr = Math.min(2, window.devicePixelRatio || 1)

    const seed = () => {
      const count = Math.min(140, Math.floor((w * h) / 14000))
      pixels = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        s: Math.random() < 0.8 ? 2 : 3,
        hue: Math.random(),
        phase: Math.random() * Math.PI * 2,
      }))
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      w = rect.width
      h = rect.height
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed()
    }

    const COLORS = ['139,92,246', '34,211,238', '244,114,182', '163,230,53', '251,191,36']

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h)
      const mx = mouse.current.x
      const my = mouse.current.y
      for (const p of pixels) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < -4) p.x = w + 4
        if (p.x > w + 4) p.x = -4
        if (p.y < -4) p.y = h + 4
        if (p.y > h + 4) p.y = -4

        const dx = p.x - mx
        const dy = p.y - my
        const dist = Math.hypot(dx, dy)
        const glow = Math.max(0, 1 - dist / 140)
        const twinkle = 0.35 + 0.3 * Math.sin(t / 900 + p.phase)
        const alpha = Math.min(1, twinkle + glow * 0.9)
        const col = COLORS[Math.floor(p.hue * COLORS.length) % COLORS.length]
        ctx.fillStyle = `rgba(${col},${alpha.toFixed(3)})`
        const size = p.s + glow * 1.5
        ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size)
      }
      raf = requestAnimationFrame(draw)
    }

    const start = () => {
      if (running || reduce) return
      running = true
      raf = requestAnimationFrame(draw)
    }
    const stop = () => {
      running = false
      cancelAnimationFrame(raf)
    }

    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) start()
      else stop()
    })
    io.observe(canvas)

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    const onLeave = () => { mouse.current = { x: -9999, y: -9999 } }
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerleave', onLeave)

    resize()
    window.addEventListener('resize', resize)
    // draw one static frame for reduced motion / SSR safety
    if (reduce) {
      ctx.clearRect(0, 0, w, h)
      for (const p of pixels) {
        ctx.fillStyle = 'rgba(139,92,246,0.35)'
        ctx.fillRect(p.x, p.y, p.s, p.s)
      }
    } else {
      start()
    }

    return () => {
      stop()
      io.disconnect()
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerleave', onLeave)
    }
  }, [reduce])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
