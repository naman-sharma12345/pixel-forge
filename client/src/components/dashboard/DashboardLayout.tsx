import { Suspense, useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronsLeft, ExternalLink, type LucideIcon } from 'lucide-react'
import { Avatar, Spinner } from '@/components/ui'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/cn'

export interface DashNavItem {
  to: string
  label: string
  icon: LucideIcon
  /** exact match (for index routes) */
  end?: boolean
  /** visually emphasised (e.g. Upload new) */
  highlight?: boolean
}

const COLLAPSE_KEY = 'pf_dash_collapsed'

function readCollapsed() {
  try { return localStorage.getItem(COLLAPSE_KEY) === '1' } catch { return false }
}

/**
 * SaaS-style dashboard shell: collapsible icon sidebar on desktop,
 * horizontal tab bar on mobile, and an Outlet for the page.
 */
export function DashboardLayout({
  label,
  badge,
  items,
  footerLink,
}: {
  label: string
  badge: string
  items: DashNavItem[]
  footerLink?: { to: string; label: string; icon: LucideIcon }
}) {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(readCollapsed)

  useEffect(() => {
    try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0') } catch { /* private mode */ }
  }, [collapsed])

  const isActive = (it: DashNavItem) => (it.end ? location.pathname === it.to : location.pathname === it.to || location.pathname.startsWith(`${it.to}/`))

  return (
    <div className="mx-auto flex max-w-[1440px] gap-6 px-4 pb-12 pt-4 sm:px-6 lg:gap-8 lg:px-8 lg:pt-6">
      {/* desktop sidebar */}
      <aside
        className={cn(
          'sticky top-20 hidden h-[calc(100vh-6rem)] shrink-0 flex-col rounded-panel border border-border bg-surface/80 p-2.5 backdrop-blur transition-[width] duration-[250ms] ease-[cubic-bezier(0.22,1,0.36,1)] lg:flex',
          collapsed ? 'w-[68px]' : 'w-[240px]',
        )}
        aria-label={`${label} navigation`}
      >
        <div className={cn('flex items-center gap-2 px-1.5 pb-3 pt-1', collapsed && 'justify-center px-0')}>
          {user && <Avatar src={user.avatarUrl} name={user.name} username={user.username} size={32} />}
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text">{label}</p>
              <p className="font-pixel text-[7px] uppercase leading-[1.8] text-primary">{badge}</p>
            </div>
          )}
        </div>
        <div className="mb-2 h-px bg-border" />
        <nav className="flex flex-1 flex-col gap-0.5">
          {items.map((it) => {
            const active = isActive(it)
            return (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                title={collapsed ? it.label : undefined}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative flex h-10 items-center gap-3 rounded-[10px] px-3 text-sm font-medium transition-colors',
                  collapsed && 'justify-center px-0',
                  active ? 'text-text' : 'text-muted hover:bg-surface-2 hover:text-text',
                  it.highlight && !active && 'text-primary hover:text-primary',
                )}
              >
                {active && (
                  <motion.span
                    layoutId={`dash-active-${badge}`}
                    className="absolute inset-0 -z-10 rounded-[10px] bg-surface-3 ring-1 ring-border-strong"
                    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px]',
                    it.highlight ? 'bg-primary text-white shadow-[0_0_0_3px_rgba(139,92,246,0.18)]' : active ? 'text-primary' : 'text-subtle group-hover:text-muted',
                  )}
                >
                  <it.icon className="h-4 w-4" />
                </span>
                {!collapsed && <span className="truncate">{it.label}</span>}
              </NavLink>
            )
          })}
        </nav>
        <div className="mt-2 flex flex-col gap-0.5 border-t border-border pt-2">
          {footerLink && (
            <Link
              to={footerLink.to}
              title={collapsed ? footerLink.label : undefined}
              className={cn('flex h-10 items-center gap-3 rounded-[10px] px-3 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-text', collapsed && 'justify-center px-0')}
            >
              <footerLink.icon className="h-4 w-4 shrink-0 text-subtle" />
              {!collapsed && <span className="flex-1 truncate">{footerLink.label}</span>}
              {!collapsed && <ExternalLink className="h-3.5 w-3.5 text-subtle" />}
            </Link>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            className={cn('flex h-10 items-center gap-3 rounded-[10px] px-3 text-sm text-subtle transition-colors hover:bg-surface-2 hover:text-text', collapsed && 'justify-center px-0')}
          >
            <ChevronsLeft className={cn('h-4 w-4 shrink-0 transition-transform duration-200', collapsed && 'rotate-180')} />
            {!collapsed && 'Collapse'}
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* mobile tab bar */}
        <nav className="-mx-4 mb-5 flex gap-1 overflow-x-auto border-b border-border px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:hidden" aria-label={`${label} navigation`}>
          {[...items, ...(footerLink ? [{ ...footerLink, end: true } as DashNavItem] : [])].map((it) => {
            const active = isActive(it)
            return (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                className={cn(
                  'flex shrink-0 items-center gap-2 whitespace-nowrap rounded-control px-3 py-2 text-sm font-medium transition-colors',
                  active ? 'bg-surface-3 text-text' : 'text-muted hover:text-text',
                  it.highlight && !active && 'text-primary',
                )}
              >
                <it.icon className="h-4 w-4" />
                {it.label}
              </NavLink>
            )
          })}
        </nav>
        <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center"><Spinner /></div>}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  )
}

/** Page header used by every dashboard page. */
export function DashHeader({ title, subtitle, actions, eyebrow }: { title: string; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1.5 font-pixel text-[8px] uppercase text-accent">{eyebrow}</p>}
        <h1 className="font-display text-2xl font-bold tracking-tight text-text sm:text-[1.75rem]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

/** Bordered surface section with optional title row. */
export function Panel({ title, action, children, className, bodyClassName }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn('rounded-panel border border-border bg-surface', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          {title && <h2 className="font-display text-[15px] font-semibold text-text">{title}</h2>}
          {action}
        </div>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </section>
  )
}
