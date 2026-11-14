import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { Logo } from './Logo'
import { Button, Input } from '@/components/ui'
import { generateCampfire } from '@/lib/pixelArt'

const COLS: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: 'Marketplace',
    links: [
      { label: 'Explore', to: '/explore' },
      { label: 'Sound Effects', to: '/explore?category=sfx' },
      { label: 'Music', to: '/explore?category=music' },
      { label: 'Freebies', to: '/explore?free=true' },
    ],
  },
  {
    title: 'Creators',
    links: [
      { label: 'Sell assets', to: '/register' },
      { label: 'Creator Studio', to: '/studio' },
      { label: 'Payouts', to: '/studio/sales' },
      { label: 'Guidelines', to: '/explore' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'My Library', to: '/library' },
      { label: 'Wishlist', to: '/wishlist' },
      { label: 'Orders', to: '/settings' },
      { label: 'Settings', to: '/settings' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', to: '/' },
      { label: 'Blog', to: '/' },
      { label: 'Support', to: '/' },
      { label: 'Contact', to: '/' },
    ],
  },
]

export function Footer() {
  const [email, setEmail] = useState('')
  const fire = useMemo(() => generateCampfire(), [])

  const subscribe = (e: FormEvent) => {
    e.preventDefault()
    if (!email.includes('@')) {
      toast.error('Enter a valid email')
      return
    }
    toast.success("You're on the list — pixel drops incoming")
    setEmail('')
  }

  return (
    <footer className="mt-20 border-t border-border bg-surface/60">
      <div className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="flex flex-col gap-4">
            <Logo />
            <p className="max-w-xs text-sm text-muted">
              The marketplace for indie game assets. Sprites, sfx, music and UI — forged by creators, shipped by devs.
            </p>
            <form onSubmit={subscribe} className="flex max-w-xs gap-2">
              <Input
                type="email"
                placeholder="you@studio.dev"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Email for newsletter"
                className="h-9"
              />
              <Button type="submit" size="sm">Join</Button>
            </form>
          </div>
          {COLS.map((col) => (
            <div key={col.title} className="flex flex-col gap-3">
              <h3 className="font-pixel text-[9px] uppercase text-subtle">{col.title}</h3>
              {col.links.map((l) => (
                <Link key={l.label} to={l.to} className="text-sm text-muted transition-colors hover:text-text">
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-subtle">© {new Date().getFullYear()} Pixel Forge. A student-built demo — payments are simulated.</p>
          <div className="flex items-center gap-2 text-xs text-subtle">
            <img src={fire} alt="" className="pixelated h-6 w-6 animate-float" />
            made with pixels &amp; caffeine
          </div>
        </div>
      </div>
    </footer>
  )
}
