import { useEffect, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ArrowDown, ArrowUp, ArrowUpDown, Search, X } from 'lucide-react'
import { Button, Modal } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { AssetStatus } from '@/types/api'

// ---------- status tabs ----------
export function StatusTabs<K extends string>({
  tabs,
  value,
  onChange,
  layoutId,
}: {
  tabs: { key: K; label: string; count?: number }[]
  value: K
  onChange: (k: K) => void
  layoutId: string
}) {
  return (
    <div className="flex gap-1 overflow-x-auto [scrollbar-width:none]" role="tablist">
      {tabs.map((t) => {
        const active = t.key === value
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.key)}
            className={cn('relative flex shrink-0 items-center gap-2 rounded-control px-3 py-2 text-sm font-medium transition-colors', active ? 'text-text' : 'text-muted hover:text-text')}
          >
            {active && <motion.span layoutId={layoutId} className="absolute inset-0 -z-10 rounded-control bg-surface-3 ring-1 ring-border-strong" transition={{ duration: 0.2 }} />}
            {t.label}
            {t.count !== undefined && (
              <span className={cn('rounded-full px-1.5 py-px font-mono text-[10px]', active ? 'bg-primary text-white' : 'bg-surface-2 text-subtle')}>{t.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ---------- search ----------
export function SearchBox({ value, onChange, placeholder, delay = 300, className }: { value: string; onChange: (v: string) => void; placeholder: string; delay?: number; className?: string }) {
  const [v, setV] = useState(value)
  useEffect(() => setV(value), [value])
  useEffect(() => {
    const t = window.setTimeout(() => { if (v !== value) onChange(v) }, delay)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v])
  return (
    <label className={cn('relative flex h-10 items-center', className)}>
      <span className="sr-only">{placeholder}</span>
      <Search className="pointer-events-none absolute left-3 h-4 w-4 text-subtle" />
      <input
        type="search"
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder={placeholder}
        className="h-full w-full rounded-control border border-border bg-surface pl-9 pr-8 text-sm text-text placeholder:text-subtle focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 [&::-webkit-search-cancel-button]:hidden"
      />
      {v && (
        <button type="button" aria-label="Clear search" onClick={() => { setV(''); onChange('') }} className="absolute right-2 rounded p-1 text-subtle hover:text-text">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </label>
  )
}

// ---------- sortable header ----------
export type SortDir = 'asc' | 'desc'

export function SortHeader<K extends string>({ label, k, sort, onSort, align = 'left', className }: { label: string; k: K; sort: { key: K; dir: SortDir }; onSort: (k: K) => void; align?: 'left' | 'right'; className?: string }) {
  const active = sort.key === k
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <th scope="col" aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'} className={cn('px-3 py-3 font-medium', align === 'right' && 'text-right', className)}>
      <button type="button" onClick={() => onSort(k)} className={cn('inline-flex items-center gap-1 transition-colors hover:text-text', active && 'text-text', align === 'right' && 'flex-row-reverse')}>
        {label}
        <Icon className={cn('h-3 w-3', !active && 'opacity-40')} />
      </button>
    </th>
  )
}

export function useSort<K extends string>(initial: K, dir: SortDir = 'desc') {
  const [sort, setSort] = useState<{ key: K; dir: SortDir }>({ key: initial, dir })
  const onSort = (k: K) => setSort((s) => (s.key === k ? { key: k, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'desc' }))
  return { sort, onSort }
}

export const TH = 'px-3 py-3 text-left font-medium'

/** Table frame with the house header style. */
export function TableFrame({ head, children, minWidth = 760 }: { head: ReactNode; children: ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-hidden rounded-panel border border-border bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth }}>
          <thead>
            <tr className="border-b border-border bg-surface-2/50 text-left text-[11px] uppercase tracking-wider text-subtle">{head}</tr>
          </thead>
          <tbody className="divide-y divide-border/70">{children}</tbody>
        </table>
      </div>
    </div>
  )
}

// ---------- status badge ----------
const STATUS_STYLE: Record<AssetStatus, string> = {
  published: 'bg-success/12 text-success ring-success/25',
  rejected: 'bg-danger/12 text-danger ring-danger/25',
  archived: 'bg-surface-3 text-muted ring-border-strong',
}

export function StatusBadge({ status }: { status: AssetStatus }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ring-1 ring-inset', STATUS_STYLE[status])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  )
}

// ---------- confirm dialog ----------
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  tone = 'danger',
  pending,
  onConfirm,
  onClose,
  children,
  confirmDisabled,
}: {
  open: boolean
  title: string
  body: ReactNode
  confirmLabel: string
  tone?: 'danger' | 'primary'
  pending?: boolean
  onConfirm: () => void
  onClose: () => void
  children?: ReactNode
  confirmDisabled?: boolean
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="text-sm leading-relaxed text-muted">{body}</div>
      {children && <div className="mt-4">{children}</div>}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={pending} disabled={confirmDisabled} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

// ---------- csv ----------
export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = rows.map((r) => r.map(esc).join(',')).join('\n')
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
