import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  AudioLines,
  Compass,
  Gift,
  Heart,
  Library,
  LogIn,
  LogOut,
  Menu,
  Music,
  Search,
  Settings,
  Shield,
  ShoppingCart,
  Store,
  UserPlus,
  Check,
  type LucideIcon,
} from 'lucide-react'
import { Logo } from './Logo'
import { SearchTrigger, CommandPalette } from './CommandPalette'
import { Avatar, Button, Drawer, DropdownMenu, IconButton, Kbd, Modal, PixelButton } from '@/components/ui'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useCartCount } from '@/hooks/useCommerce'
import { useLogout, useBecomeCreator } from '@/hooks/useAuth'
import { fireConfetti } from '@/lib/confetti'
import { cn } from '@/lib/cn'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Returns true when this link is the current page. */
  match: (path: string, params: URLSearchParams) => boolean
}

const NAV: NavItem[] = [
  {
    to: '/explore',
    label: 'Explore',
    icon: Compass,
    match: (p, q) => p === '/explore' && !['sfx', 'music'].includes(q.get('category') ?? '') && q.get('free') !== 'true',
  },
  { to: '/explore?category=sfx', label: 'Sound Effects', icon: AudioLines, match: (p, q) => p === '/explore' && q.get('category') === 'sfx' },
  { to: '/explore?category=music', label: 'Music', icon: Music, match: (p, q) => p === '/explore' && q.get('category') === 'music' },
  { to: '/explore?free=true', label: 'Freebies', icon: Gift, match: (p, q) => p === '/explore' && q.get('free') === 'true' },
]

function useLogoutFlow() {
  const logout = useLogout()
  const navigate = useNavigate()
  return () =>
    logout.mutate(undefined, {
      onSettled: () => {
        toast.success('Signed out. See you next level.')
        navigate('/')
      },
    })
}

function CartButton() {
  const count = useCartCount()
  const setCartOpen = useUiStore((s) => s.setCartDrawerOpen)
  const reduce = useReducedMotion()
  return (
    <button
      type="button"
      onClick={() => setCartOpen(true)}
      aria-label={`Open cart, ${count} item${count === 1 ? '' : 's'}`}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-control text-muted transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <ShoppingCart className="h-[18px] w-[18px]" />
      <AnimatePresence>
        {count > 0 && (
          <motion.span
            key={count}
            initial={reduce ? false : { scale: 0.4, y: -4, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 520, damping: 18 }}
            className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] font-bold leading-none text-white ring-2 ring-bg"
          >
            {count > 99 ? '99+' : count}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const user = useAuthStore((s) => s.user)
  const status = useAuthStore((s) => s.status)
  const mobileOpen = useUiStore((s) => s.mobileNavOpen)
  const setMobileOpen = useUiStore((s) => s.setMobileNavOpen)
  const setPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen)
  const setBecomeCreatorOpen = useUiStore((s) => s.setBecomeCreatorOpen)
  const doLogout = useLogoutFlow()
  const navigate = useNavigate()
  const location = useLocation()
  const params = new URLSearchParams(location.search)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8)
    fn()
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => { setMobileOpen(false) }, [location.pathname, location.search, setMobileOpen])

  const authed = status === 'authed' && !!user
  const isCreator = user?.role === 'creator' || user?.role === 'admin'

  const sellClick = () => {
    if (!authed) navigate('/register?intent=sell')
    else if (isCreator) navigate('/studio')
    else setBecomeCreatorOpen(true)
  }

  const menuItems = user
    ? [
        { key: 'library', label: 'Library', icon: <Library className="h-4 w-4" />, onSelect: () => navigate('/library') },
        { key: 'wishlist', label: 'Wishlist', icon: <Heart className="h-4 w-4" />, onSelect: () => navigate('/wishlist') },
        ...(isCreator ? [{ key: 'studio', label: 'Creator Studio', icon: <Store className="h-4 w-4" />, onSelect: () => navigate('/studio') }] : []),
        ...(user.role === 'admin' ? [{ key: 'admin', label: 'Admin', icon: <Shield className="h-4 w-4" />, onSelect: () => navigate('/admin') }] : []),
        { key: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" />, onSelect: () => navigate('/settings') },
        { key: 'logout', label: 'Log out', icon: <LogOut className="h-4 w-4" />, danger: true, onSelect: doLogout },
      ]
    : []

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-40 border-b transition-[background-color,border-color,backdrop-filter] duration-200',
          scrolled ? 'border-border bg-bg/75 backdrop-blur-xl backdrop-saturate-150' : 'border-transparent bg-transparent',
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-2 px-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label="Pixel Forge home" className="-ml-1 shrink-0 rounded-control p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <Logo />
          </Link>

          <nav className="ml-5 hidden items-center gap-0.5 lg:flex" aria-label="Primary">
            {NAV.map((l) => {
              const active = l.match(location.pathname, params)
              return (
                <Link
                  key={l.label}
                  to={l.to}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative whitespace-nowrap rounded-control px-3 py-2 text-sm font-medium transition-colors',
                    active ? 'text-text' : 'text-muted hover:text-text',
                  )}
                >
                  {active && (
                    <motion.span layoutId="nav-active" className="absolute inset-0 -z-10 rounded-control bg-surface-2 ring-1 ring-border" transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }} />
                  )}
                  {l.label}
                </Link>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
            <SearchTrigger />
            <IconButton label="Search" className="sm:hidden" onClick={() => setPaletteOpen(true)}>
              <Search className="h-[18px] w-[18px]" />
            </IconButton>

            <CartButton />

            {authed ? (
              <DropdownMenu
                align="right"
                trigger={
                  <button
                    type="button"
                    aria-label="Account menu"
                    className="ml-1 rounded-full ring-2 ring-transparent transition-shadow hover:ring-primary/50 focus-visible:outline-none focus-visible:ring-accent"
                  >
                    <Avatar src={user.avatarUrl} name={user.name} username={user.username} size={32} />
                  </button>
                }
                header={
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <Avatar src={user.avatarUrl} name={user.name} username={user.username} size={36} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text">{user.name}</p>
                      <p className="truncate font-mono text-xs text-subtle">@{user.username}</p>
                    </div>
                  </div>
                }
                items={menuItems}
              />
            ) : (
              <Link
                to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}
                className="hidden whitespace-nowrap rounded-control px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-text sm:inline-flex"
              >
                Log in
              </Link>
            )}

            {(!authed || !isCreator) && (
              <PixelButton size="sm" className="ml-1.5 hidden sm:inline-flex" onClick={sellClick}>
                Sell assets
              </PixelButton>
            )}
            {authed && isCreator && (
              <Button variant="secondary" size="sm" className="ml-1 hidden md:inline-flex" leftIcon={<Store className="h-3.5 w-3.5" />} onClick={() => navigate('/studio')}>
                Studio
              </Button>
            )}

            <IconButton label="Open menu" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-expanded={mobileOpen}>
              <Menu className="h-5 w-5" />
            </IconButton>
          </div>
        </div>
      </header>

      <MobileNav sellClick={sellClick} onLogout={doLogout} />
      <CommandPalette />
      <BecomeCreatorModal />
    </>
  )
}

function MobileNav({ sellClick, onLogout }: { sellClick: () => void; onLogout: () => void }) {
  const open = useUiStore((s) => s.mobileNavOpen)
  const setOpen = useUiStore((s) => s.setMobileNavOpen)
  const setPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen)
  const user = useAuthStore((s) => s.user)
  const status = useAuthStore((s) => s.status)
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const authed = status === 'authed' && !!user
  const isCreator = user?.role === 'creator' || user?.role === 'admin'

  const row = (to: string, Icon: LucideIcon, label: string, active = location.pathname === to) => (
    <Link
      key={label}
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-control px-3 py-3 text-[15px] font-medium transition-colors',
        active ? 'bg-primary-soft text-text' : 'text-muted hover:bg-surface-2 hover:text-text',
      )}
    >
      <Icon className={cn('h-[18px] w-[18px]', active ? 'text-primary' : 'text-subtle')} />
      {label}
    </Link>
  )

  return (
    <Drawer open={open} onClose={() => setOpen(false)} title="Menu">
      <div className="flex min-h-full flex-col p-5">
      <div className="flex flex-1 flex-col gap-6">
        {authed ? (
          <div className="flex items-center gap-3 rounded-card border border-border bg-surface-2/60 p-3">
            <Avatar src={user.avatarUrl} name={user.name} username={user.username} size={44} />
            <div className="min-w-0">
              <p className="truncate font-display font-semibold text-text">{user.name}</p>
              <p className="truncate font-mono text-xs text-subtle">@{user.username} · {user.role}</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Link to="/login" className="flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface-2 text-sm font-medium text-text">
              <LogIn className="h-4 w-4" /> Log in
            </Link>
            <Link to="/register" className="flex h-11 items-center justify-center gap-2 rounded-control bg-primary text-sm font-semibold text-white">
              <UserPlus className="h-4 w-4" /> Sign up
            </Link>
          </div>
        )}

        <button
          type="button"
          onClick={() => { setOpen(false); setPaletteOpen(true) }}
          className="flex h-11 items-center gap-3 rounded-control border border-border bg-surface-2 px-3 text-sm text-subtle"
        >
          <Search className="h-4 w-4" /> <span className="flex-1 text-left">Search assets…</span> <Kbd>Ctrl K</Kbd>
        </button>

        <div>
          <p className="mb-2 px-3 font-pixel text-[8px] uppercase text-subtle">Browse</p>
          <nav className="flex flex-col gap-0.5" aria-label="Browse">
            {NAV.map((l) => row(l.to, l.icon, l.label, l.match(location.pathname, params)))}
          </nav>
        </div>

        {authed && (
          <div>
            <p className="mb-2 px-3 font-pixel text-[8px] uppercase text-subtle">You</p>
            <nav className="flex flex-col gap-0.5" aria-label="Account">
              {row('/library', Library, 'Library')}
              {row('/wishlist', Heart, 'Wishlist')}
              {isCreator && row('/studio', Store, 'Creator Studio')}
              {user.role === 'admin' && row('/admin', Shield, 'Admin')}
              {row('/settings', Settings, 'Settings')}
              <button
                type="button"
                onClick={() => { setOpen(false); onLogout() }}
                className="flex items-center gap-3 rounded-control px-3 py-3 text-[15px] font-medium text-danger transition-colors hover:bg-danger/10"
              >
                <LogOut className="h-[18px] w-[18px]" /> Log out
              </button>
            </nav>
          </div>
        )}
      </div>

      {!isCreator && (
        <div className="mt-6 rounded-card border border-primary/30 bg-gradient-to-br from-primary/15 to-accent/5 p-4">
          <p className="font-display text-sm font-semibold text-text">Sell your assets</p>
          <p className="mt-1 text-xs text-muted">Keep 90% of every sale. Publishing takes minutes.</p>
          <PixelButton size="sm" className="mt-3 w-full" onClick={() => { setOpen(false); sellClick() }}>
            Start selling
          </PixelButton>
        </div>
      )}
      </div>
    </Drawer>
  )
}

function BecomeCreatorModal() {
  const open = useUiStore((s) => s.becomeCreatorOpen)
  const setOpen = useUiStore((s) => s.setBecomeCreatorOpen)
  const becomeCreator = useBecomeCreator()
  const navigate = useNavigate()
  const perks = [
    'Publish sprites, tilesets, audio and more',
    'Keep 90% of every sale, paid in rupees',
    'Live sales and download analytics',
    'Your own public storefront at /u/you',
  ]
  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Become a creator">
      <p className="text-sm text-muted">Unlock the Creator Studio and start selling to indie developers today.</p>
      <ul className="mt-5 space-y-2.5">
        {perks.map((p) => (
          <li key={p} className="flex items-start gap-2.5 text-sm text-text">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] bg-success/15 text-success">
              <Check className="h-3 w-3" />
            </span>
            {p}
          </li>
        ))}
      </ul>
      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button variant="ghost" onClick={() => setOpen(false)}>Maybe later</Button>
        <PixelButton
          loading={becomeCreator.isPending}
          onClick={() =>
            becomeCreator.mutate(undefined, {
              onSuccess: () => {
                setOpen(false)
                fireConfetti()
                toast.success('Welcome to the forge — your studio is ready')
                navigate('/studio')
              },
              onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not upgrade your account'),
            })
          }
        >
          Open my studio
        </PixelButton>
      </div>
    </Modal>
  )
}
