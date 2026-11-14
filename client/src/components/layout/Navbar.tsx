import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import {
  AudioLines,
  Grid3x3,
  Heart,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  Music,
  Search,
  Settings,
  Shield,
  ShoppingCart,
  Sparkles,
  Store,
  X,
} from 'lucide-react'
import { Logo } from './Logo'
import { SearchTrigger, CommandPalette } from './CommandPalette'
import { Avatar, Button, DropdownMenu, IconButton, PixelButton } from '@/components/ui'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useCartCount } from '@/hooks/useCommerce'
import { useLogout, useBecomeCreator } from '@/hooks/useAuth'
import { cn } from '@/lib/cn'

const NAV_LINKS = [
  { to: '/explore', label: 'Explore', icon: Sparkles },
  { to: '/explore?category=sfx', label: 'Sound Effects', icon: AudioLines },
  { to: '/explore?category=music', label: 'Music', icon: Music },
  { to: '/explore?free=true', label: 'Freebies', icon: Grid3x3 },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const user = useAuthStore((s) => s.user)
  const status = useAuthStore((s) => s.status)
  const cartCount = useCartCount()
  const setCartOpen = useUiStore((s) => s.setCartDrawerOpen)
  const mobileOpen = useUiStore((s) => s.mobileNavOpen)
  const setMobileOpen = useUiStore((s) => s.setMobileNavOpen)
  const setPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen)
  const setBecomeCreatorOpen = useUiStore((s) => s.setBecomeCreatorOpen)
  const logout = useLogout()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8)
    fn()
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => { setMobileOpen(false) }, [location.pathname, location.search, setMobileOpen])

  const isCreator = user?.role === 'creator' || user?.role === 'admin'

  const sellClick = () => {
    if (status === 'guest' || status === 'idle' || status === 'loading') {
      navigate('/register')
    } else if (isCreator) {
      navigate('/studio')
    } else {
      setBecomeCreatorOpen(true)
    }
  }

  const menuItems = user
    ? [
        { key: 'library', label: 'My Library', icon: <Library className="h-4 w-4" />, onSelect: () => navigate('/library') },
        { key: 'wishlist', label: 'Wishlist', icon: <Heart className="h-4 w-4" />, onSelect: () => navigate('/wishlist') },
        ...(isCreator ? [{ key: 'studio', label: 'Creator Studio', icon: <Store className="h-4 w-4" />, onSelect: () => navigate('/studio') }] : []),
        ...(user.role === 'admin' ? [{ key: 'admin', label: 'Admin', icon: <Shield className="h-4 w-4" />, onSelect: () => navigate('/admin') }] : []),
        { key: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" />, onSelect: () => navigate('/settings') },
        {
          key: 'logout',
          label: 'Log out',
          icon: <LogOut className="h-4 w-4" />,
          danger: true,
          onSelect: () => logout.mutate(),
        },
      ]
    : []

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-40 border-b transition-all duration-200',
          scrolled ? 'border-border bg-bg/80 backdrop-blur-xl' : 'border-transparent bg-bg/60 backdrop-blur-md',
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label="Pixel Forge home" className="shrink-0">
            <Logo />
          </Link>

          <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Primary">
            {NAV_LINKS.map((l) => (
              <NavLink
                key={l.label}
                to={l.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-control px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-surface-2 hover:text-text',
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <SearchTrigger />
            <IconButton label="Search" className="sm:hidden" onClick={() => setPaletteOpen(true)}>
              <Search className="h-5 w-5" />
            </IconButton>

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label={`Cart, ${cartCount} items`}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-control text-muted transition-colors hover:bg-surface-2 hover:text-text"
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] font-bold text-white shadow-glow">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>

            {status === 'authed' && user ? (
              <DropdownMenu
                align="right"
                trigger={
                  <button
                    type="button"
                    aria-label="Account menu"
                    className="rounded-full transition-shadow hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <Avatar src={user.avatarUrl} name={user.name} username={user.username} size={34} />
                  </button>
                }
                items={menuItems}
              />
            ) : (
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => navigate('/login')}>
                Log in
              </Button>
            )}

            <PixelButton size="sm" className="hidden !px-4 !py-2 md:inline-flex" onClick={sellClick}>
              Sell assets
            </PixelButton>

            <IconButton label="Menu" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </IconButton>
          </div>
        </div>
      </header>

      {/* mobile nav */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <nav className="absolute left-0 top-16 flex max-h-[calc(100vh-4rem)] w-72 flex-col gap-1 overflow-y-auto border-r border-border bg-surface p-4" aria-label="Mobile">
            {NAV_LINKS.map((l) => (
              <NavLink
                key={l.label}
                to={l.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-control px-3 py-3 text-sm font-medium',
                    isActive ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-surface-2 hover:text-text',
                  )
                }
              >
                <l.icon className="h-4 w-4" />
                {l.label}
              </NavLink>
            ))}
            <div className="my-2 border-t border-border" />
            {status === 'authed' && user ? (
              <>
                <MobileLink to="/library" icon={Library} label="My Library" />
                <MobileLink to="/wishlist" icon={Heart} label="Wishlist" />
                {isCreator && <MobileLink to="/studio" icon={LayoutDashboard} label="Creator Studio" />}
                {user.role === 'admin' && <MobileLink to="/admin" icon={Shield} label="Admin" />}
                <MobileLink to="/settings" icon={Settings} label="Settings" />
                <button
                  type="button"
                  onClick={() => { setMobileOpen(false); logout.mutate() }}
                  className="flex items-center gap-3 rounded-control px-3 py-3 text-sm font-medium text-danger hover:bg-danger/10"
                >
                  <LogOut className="h-4 w-4" /> Log out
                </button>
              </>
            ) : (
              <>
                <MobileLink to="/login" icon={Settings} label="Log in" />
                <MobileLink to="/register" icon={Sparkles} label="Create account" />
              </>
            )}
            <div className="mt-3 px-3">
              <PixelButton size="sm" className="w-full justify-center !px-4 !py-2" onClick={() => { setMobileOpen(false); sellClick() }}>
                Sell assets
              </PixelButton>
            </div>
          </nav>
        </div>
      )}

      <CommandPalette />
      <BecomeCreatorModal />
    </>
  )
}

function MobileLink({ to, icon: Icon, label }: { to: string; icon: typeof Library; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn('flex items-center gap-3 rounded-control px-3 py-3 text-sm font-medium', isActive ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-surface-2 hover:text-text')
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </NavLink>
  )
}

function BecomeCreatorModal() {
  const open = useUiStore((s) => s.becomeCreatorOpen)
  const setOpen = useUiStore((s) => s.setBecomeCreatorOpen)
  const becomeCreator = useBecomeCreator()
  const navigate = useNavigate()
  return (
    <div data-become-creator-modal>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md rounded-panel border border-border bg-surface p-6 shadow-card">
            <h2 className="font-display text-lg font-semibold text-text">Become a creator</h2>
            <p className="mt-2 text-sm text-muted">
              Unlock the studio: upload sprites, sfx, music and more, set your own prices, and keep 90% of every sale.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted">
              <li className="flex gap-2"><span className="text-primary">▸</span> Upload up to 8 files per asset</li>
              <li className="flex gap-2"><span className="text-primary">▸</span> Real-time sales analytics</li>
              <li className="flex gap-2"><span className="text-primary">▸</span> Payouts simulated in this demo</li>
            </ul>
            <div className="mt-6 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>Maybe later</Button>
              <Button
                className="flex-1"
                loading={becomeCreator.isPending}
                onClick={() =>
                  becomeCreator.mutate(undefined, {
                    onSuccess: () => { setOpen(false); toast.success('Welcome to the forge — you can now sell assets'); navigate('/studio') },
                    onError: (e) => toast.error(e instanceof Error ? e.message : 'Could not upgrade'),
                  })
                }
              >
                Start selling
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
