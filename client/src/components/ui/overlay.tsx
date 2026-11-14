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
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
  wide?: boolean
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
            <div className="p-5">{children}</div>
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
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
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
            aria-labelledby={title ? titleId : undefined}
            onKeyDown={(e) => trapTab(e, panelRef.current)}
            initial={reduce ? { x: '100%' } : { x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: DUR.med, ease: EASE }}
            className={cn('absolute right-0 top-0 flex h-full w-full max-w-sm flex-col border-l border-border bg-surface', className)}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 id={titleId} className="font-display text-base font-semibold text-text">{title}</h2>
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
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-surface-3 px-2 py-1 text-xs text-text opacity-0 shadow-card transition-opacity duration-150 group-hover/tt:opacity-100',
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

export function DropdownMenu({ trigger, items, align = 'right' }: { trigger: ReactNode; items: MenuItem[]; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('mousedown', fn)
    return () => window.removeEventListener('mousedown', fn)
  }, [open])
  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: DUR.fast }}
            className={cn(
              'absolute z-50 mt-2 min-w-48 overflow-hidden rounded-control border border-border bg-surface-2 py-1 shadow-card',
              align === 'right' ? 'right-0' : 'left-0',
            )}
          >
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => { setOpen(false); item.onSelect?.() }}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors',
                  item.danger ? 'text-danger hover:bg-danger/10' : 'text-text hover:bg-surface-3',
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
