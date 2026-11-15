import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Download, Headphones, ShieldCheck } from 'lucide-react'
import { Logo } from '@/components/layout'
import { generateLandscape, generateSpriteSheet } from '@/lib/pixelArt'

const QUOTES = [
  { text: 'Ship the game. Polish the pixels later.', author: 'every jam winner, ever' },
  { text: 'Good assets are bought, not born at 3 AM.', author: 'the Pixel Forge manifesto' },
  { text: 'Your hero deserves better than a stretched square.', author: 'a very tired dev' },
  { text: 'Indie games are built on other indies’ work.', author: 'the forge keeps turning' },
  { text: 'A great sound effect is half the game feel.', author: 'someone who added screen shake' },
]

const FRAMES = 8

/** Slowly panning generated landscape with a little walking hero. */
function ArtPanel() {
  const reduce = useReducedMotion()
  const [quoteIdx, setQuoteIdx] = useState(0)
  const land = useMemo(() => generateLandscape('auth-night-4', 320, 200), [])
  const hero = useMemo(() => generateSpriteSheet('auth-hero', FRAMES, 'characters'), [])

  useEffect(() => {
    if (reduce) return
    const id = window.setInterval(() => setQuoteIdx((i) => (i + 1) % QUOTES.length), 6500)
    return () => window.clearInterval(id)
  }, [reduce])

  return (
    <div className="noise relative hidden overflow-hidden border-l border-border lg:block" aria-hidden="true">
      <div
        className="pixelated absolute inset-0"
        style={{
          backgroundImage: `url(${land})`,
          backgroundSize: 'auto 100%',
          backgroundRepeat: 'repeat-x',
          backgroundPosition: '0% 50%',
          imageRendering: 'pixelated',
          animation: reduce ? undefined : 'auth-pan 90s linear infinite alternate',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-bg/30 via-transparent to-bg" />
      <div className="dot-grid absolute inset-0 opacity-20" />

      {/* walking hero */}
      <div className="absolute bottom-[23%] left-1/2 -translate-x-1/2">
        <div
          className="pixelated h-32 w-32"
          style={{
            backgroundImage: `url(${hero})`,
            backgroundSize: `${FRAMES * 100}% 100%`,
            imageRendering: 'pixelated',
            animation: reduce ? undefined : `pf-sheet 0.9s steps(${FRAMES}, jump-none) infinite`,
          }}
        />
      </div>

      <div className="absolute left-8 top-8 flex items-center gap-2 rounded-full border border-white/10 bg-bg/50 px-3 py-1.5 text-xs text-text/90 backdrop-blur">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> PF·OS v1.0 · online
      </div>

      <div className="absolute inset-x-8 bottom-8">
        <div className="rounded-panel border border-white/10 bg-bg/60 p-6 backdrop-blur-xl">
          <AnimatePresence mode="wait">
            <motion.figure
              key={quoteIdx}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <blockquote className="font-display text-xl font-medium leading-snug text-text">“{QUOTES[quoteIdx].text}”</blockquote>
              <figcaption className="mt-3 font-mono text-xs text-accent">— {QUOTES[quoteIdx].author}</figcaption>
            </motion.figure>
          </AnimatePresence>
          <div className="mt-5 flex gap-1.5">
            {QUOTES.map((_, i) => (
              <span key={i} className={`h-1 rounded-full transition-all duration-300 ${i === quoteIdx ? 'w-6 bg-primary' : 'w-1.5 bg-white/20'}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function AuthLayout({ children, title, subtitle, footer }: { children: ReactNode; title: string; subtitle: string; footer?: ReactNode }) {
  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[1fr_1.05fr]">
      <div className="relative flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="pointer-events-none absolute left-1/2 top-24 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/15 blur-[100px]" />
        <div className="relative w-full max-w-[420px]">
          <Link to="/" className="mb-10 inline-flex" aria-label="Pixel Forge home">
            <Logo />
          </Link>
          <h1 className="font-display text-3xl font-bold tracking-tight text-text">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
          <ul className="mt-10 grid grid-cols-3 gap-2 border-t border-border pt-6 text-[11px] text-subtle">
            <li className="flex flex-col items-center gap-1.5 text-center"><Download className="h-4 w-4 text-muted" />Instant downloads</li>
            <li className="flex flex-col items-center gap-1.5 text-center"><Headphones className="h-4 w-4 text-muted" />Preview everything</li>
            <li className="flex flex-col items-center gap-1.5 text-center"><ShieldCheck className="h-4 w-4 text-muted" />Clear licenses</li>
          </ul>
        </div>
      </div>
      <ArtPanel />
    </div>
  )
}
