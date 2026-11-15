import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn'

const EASE = [0.22, 1, 0.36, 1] as const
const DUR = { fast: 0.15, med: 0.25, slow: 0.4 }

// ---------- scroll lock ----------
let lockCount = 0
function lockScroll() {
  lockCount += 1
  document.body.style.overflow = 'hidden'
}
function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount === 0) document.body.style.overflow = ''
}

function useEscape(onClose: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [active, onClose])
}

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

function trapTab(e: React.KeyboardEvent, container: HTMLElement | null) {
  if (e.key !== 'Tab' || !container) return
  const els = [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null)
  if (!els.length) return
  const first = els[0]
  const last = els[els.length - 1]
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
}

// ---------- Modal ----------
export function Modal({
  open,
  onClose,
  title,
  children,
  className,
  wide,
  contentClassName,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
  wide?: boolean
  contentClassName?: string
}) {
  const reduce = useReducedMotion()
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useEscape(onClose, open)
  useEffect(() => {
    if (!open) return
    lockScroll()
    const t = setTimeout(() => panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus(), 50)
    return () => { unlockScroll(); clearTimeout(t) }
  }, [open])
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DUR.fast }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            onKeyDown={(e) => trapTab(e, panelRef.current)}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: DUR.med, ease: EASE }}
            className={cn(
              'relative max-h-[85vh] w-full overflow-y-auto rounded-panel border border-border bg-surface shadow-card',
              wide ? 'max-w-2xl' : 'max-w-md',
              className,
            )}
          >
            {title && (
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 id={titleId} className="font-display text-base font-semibold text-text">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="rounded-control p-1.5 text-muted hover:bg-surface-2 hover:text-text"
                >
                  <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </button>
              </div>
            )}
            <div className={contentClassName ?? 'p-5'}>{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

// ---------- Drawer ----------
export function Drawer({
  open,
  onClose,
  title,
  children,
  className,
  peek = false,
  headerExtra,
}: {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  className?: string
  /** Non-modal preview: no backdrop, no scroll lock, no focus steal. */
  peek?: boolean
  headerExtra?: ReactNode
}) {
  const reduce = useReducedMotion()
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useEscape(onClose, open)
  useEffect(() => {
    if (!open || peek) return
    lockScroll()
    const t = setTimeout(() => panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus(), 50)
    return () => { unlockScroll(); clearTimeout(t) }
  }, [open])
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className={cn('fixed inset-0 z-50', peek && 'pointer-events-none')}>
          {!peek && (
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DUR.fast }}
              onClick={onClose}
            />
          )}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal={peek ? undefined : 'true'}
            aria-labelledby={title ? titleId : undefined}
            onKeyDown={(e) => !peek && trapTab(e, panelRef.current)}
            initial={reduce ? { opacity: 0 } : { x: '100%' }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: '100%' }}
            transition={{ duration: DUR.med, ease: EASE }}
            className={cn(
              'pointer-events-auto absolute right-0 top-0 flex h-full w-full max-w-[400px] flex-col border-l border-border-strong bg-surface shadow-[-24px_0_60px_rgba(0,0,0,0.5)]',
              className,
            )}
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <h2 id={titleId} className="flex items-center gap-2 font-display text-base font-semibold text-text">{title}</h2>
              {headerExtra}
              <button type="button" onClick={onClose} aria-label="Close" className="rounded-control p-1.5 text-muted hover:bg-surface-2 hover:text-text">
                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

// ---------- Sheet (bottom, mobile) ----------
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  const reduce = useReducedMotion()
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useEscape(onClose, open)
  useEffect(() => {
    if (!open) return
    lockScroll()
    const t = setTimeout(() => panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus(), 80)
    return () => { unlockScroll(); clearTimeout(t) }
  }, [open])
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DUR.fast }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onKeyDown={(e) => trapTab(e, panelRef.current)}
            initial={reduce ? { opacity: 0 } : { y: '100%' }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: '100%' }}
            transition={{ duration: DUR.med, ease: EASE }}
            drag={reduce ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => { if (info.offset.y > 120 || info.velocity.y > 600) onClose() }}
            className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-[20px] border-t border-border-strong bg-surface shadow-[0_-20px_60px_rgba(0,0,0,0.6)]"
          >
            <div className="flex cursor-grab justify-center pb-1 pt-3 active:cursor-grabbing">
              <span className="h-1 w-10 rounded-full bg-border-strong" />
            </div>
            <div className="flex items-center justify-between px-5 pb-3">
              <h2 id={titleId} className="font-display text-lg font-semibold text-text">{title}</h2>
              <button type="button" onClick={onClose} aria-label="Close" className="rounded-control p-1.5 text-muted hover:bg-surface-2 hover:text-text">
                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-6">{children}</div>
            {footer && <div className="border-t border-border bg-surface px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

// ---------- Tabs ----------
interface TabItem { key: string; label: ReactNode }

export function Tabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: TabItem[]
  active: string
  onChange: (key: string) => void
  className?: string
}) {
  const reduce = useReducedMotion()
  const listRef = useRef<HTMLDivElement>(null)
  const onKeyDown = (e: React.KeyboardEvent) => {
    const idx = tabs.findIndex((t) => t.key === active)
    let next = idx
    if (e.key === 'ArrowRight') next = (idx + 1) % tabs.length
    else if (e.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = tabs.length - 1
    else return
    e.preventDefault()
    onChange(tabs[next].key)
    listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
  }
  return (
    <div ref={listRef} role="tablist" onKeyDown={onKeyDown} className={cn('relative flex gap-1 border-b border-border', className)}>
      {tabs.map((t) => {
        const isActive = t.key === active
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(t.key)}
            className={cn(
              'relative px-4 py-2.5 text-sm font-medium transition-colors',
              isActive ? 'text-text' : 'text-muted hover:text-text',
            )}
          >
            {t.label}
            {isActive && (
              <motion.span
                layoutId="tab-underline"
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-primary to-accent"
                transition={reduce ? { duration: 0 } : { duration: DUR.med, ease: EASE }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

// ---------- Tooltip ----------
export function Tooltip({ label, children, side = 'top' }: { label: string; children: ReactNode; side?: 'top' | 'bottom' }) {
  const long = label.length > 40
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 rounded-md border border-border-strong bg-surface-3 px-2.5 py-1.5 text-xs leading-snug text-text opacity-0 shadow-card transition-opacity duration-150 group-hover/tt:opacity-100 group-focus-within/tt:opacity-100',
          long ? 'w-64 whitespace-normal' : 'whitespace-nowrap',
          side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
        )}
      >
        {label}
      </span>
    </span>
  )
}

// ---------- DropdownMenu ----------
interface MenuItem {
  key: string
  label: ReactNode
  icon?: ReactNode
  danger?: boolean
  onSelect?: () => void
}

export function DropdownMenu({
  trigger,
  items,
  align = 'right',
  header,
}: {
  trigger: ReactNode
  items: MenuItem[]
  align?: 'left' | 'right'
  header?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        ref.current?.querySelector<HTMLElement>('[data-menu-trigger] button, [data-menu-trigger] [tabindex]')?.focus()
      }
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    const t = setTimeout(() => menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus(), 30)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
      clearTimeout(t)
    }
  }, [open])

  const onMenuKey = (e: React.KeyboardEvent) => {
    const els = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])]
    const idx = els.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'ArrowDown') { e.preventDefault(); els[(idx + 1) % els.length]?.focus() }
    else if (e.key === 'ArrowUp') { e.preventDefault(); els[(idx - 1 + els.length) % els.length]?.focus() }
    else if (e.key === 'Home') { e.preventDefault(); els[0]?.focus() }
    else if (e.key === 'End') { e.preventDefault(); els[els.length - 1]?.focus() }
    else if (e.key === 'Tab') setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <div data-menu-trigger onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined}>
        {trigger}
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            id={menuId}
            role="menu"
            onKeyDown={onMenuKey}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: DUR.fast, ease: EASE }}
            className={cn(
              'absolute z-50 mt-2 w-60 overflow-hidden rounded-card border border-border-strong bg-surface-2/95 p-1 shadow-[0_16px_48px_rgba(0,0,0,0.55)] backdrop-blur-xl',
              align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left',
            )}
          >
            {header && <div className="mb-1 border-b border-border">{header}</div>}
            {items.map((item) => (
              <div key={item.key}>
                {item.danger && <div className="my-1 h-px bg-border" />}
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  onClick={() => { setOpen(false); item.onSelect?.() }}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-sm outline-none transition-colors',
                    item.danger ? 'text-danger hover:bg-danger/10 focus:bg-danger/10' : 'text-text/90 hover:bg-surface-3 hover:text-text focus:bg-surface-3',
                    '[&>svg]:text-subtle',
                  )}
                >
                  {item.icon}
                  {item.label}
                </button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
