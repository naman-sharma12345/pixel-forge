import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { useReducedMotion } from 'framer-motion'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts'
import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { compactNumber } from '@/lib/format'
import type { Category } from '@/types/api'

export const THEME = {
  primary: '#8B5CF6',
  accent: '#22D3EE',
  success: '#A3E635',
  warning: '#FBBF24',
  pink: '#F472B6',
  danger: '#FB7185',
  grid: '#262636',
  muted: '#8B8BA3',
  subtle: '#5C5C74',
}

export const CATEGORY_COLORS: Record<Category, string> = {
  sprites: '#8B5CF6',
  tilesets: '#A3E635',
  characters: '#F472B6',
  ui: '#FBBF24',
  backgrounds: '#22D3EE',
  vfx: '#FB7185',
  fonts: '#C4B5FD',
  '3d': '#67E8F9',
  sfx: '#BEF264',
  music: '#F9A8D4',
}

export const rupees = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`
const rupeesShort = (n: number) => (n >= 1000 ? `₹${compactNumber(n)}` : `₹${n}`)

export function shortDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// ---------------------------------------------------------------------------
// count-up number
// ---------------------------------------------------------------------------

export function CountUp({ value, format = (n) => n.toLocaleString('en-IN'), decimals = 0 }: { value: number; format?: (n: number) => string; decimals?: number }) {
  const reduce = useReducedMotion()
  const [n, setN] = useState(reduce ? value : 0)
  useEffect(() => {
    if (reduce) { setN(value); return }
    let raf = 0
    const from = 0
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 900)
      const eased = 1 - Math.pow(1 - p, 4)
      const f = 10 ** decimals
      setN(Math.round((from + (value - from) * eased) * f) / f)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, reduce, decimals])
  return <>{format(n)}</>
}

// ---------------------------------------------------------------------------
// tooltip
// ---------------------------------------------------------------------------

interface TooltipRow { label: string; color: string; format: (v: number) => string; key: string }

function DarkTooltip({ active, payload, label, rows }: TooltipProps<number, string> & { rows: TooltipRow[] }) {
  if (!active || !payload?.length) return null
  const datum = payload[0].payload as Record<string, number>
  return (
    <div className="min-w-[150px] rounded-control border border-border-strong bg-surface-2/95 px-3 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur">
      <p className="mb-1.5 text-[11px] font-medium text-muted">{shortDate(String(label))}</p>
      {rows.map((r) => (
        <div key={r.key} className="flex items-center justify-between gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-muted">
            <span className="h-2 w-2 rounded-[2px]" style={{ background: r.color }} />
            {r.label}
          </span>
          <span className="font-mono font-semibold text-text">{r.format(Number(datum[r.key] ?? 0))}</span>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// sparkline + KPI card
// ---------------------------------------------------------------------------

export function Sparkline({ data, color = THEME.primary, className }: { data: number[]; color?: string; className?: string }) {
  const id = useId().replace(/:/g, '')
  const points = data.length ? data.map((v, i) => ({ i, v })) : [{ i: 0, v: 0 }, { i: 1, v: 0 }]
  const max = Math.max(...points.map((p) => p.v))
  return (
    <div className={cn('h-10 w-full', className)} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`sp-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={[0, max > 0 ? 'dataMax' : 1]} />
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#sp-${id})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function KpiCard({
  label,
  value,
  format,
  decimals,
  icon: Icon,
  color = THEME.primary,
  spark,
  hint,
  delta,
}: {
  label: string
  value: number
  format?: (n: number) => string
  decimals?: number
  icon: LucideIcon
  color?: string
  spark?: number[]
  hint?: string
  /** percentage change vs previous half of the series */
  delta?: number | null
}) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-card border border-border bg-surface p-4 transition-colors hover:border-border-strong">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted">{label}</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-[8px]" style={{ background: `${color}1f`, color }}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-mono text-2xl font-semibold tracking-tight text-text">
          <CountUp value={value} format={format} decimals={decimals} />
        </span>
        {delta !== undefined && delta !== null && Number.isFinite(delta) && (
          <span className={cn('inline-flex items-center gap-0.5 font-mono text-[11px]', delta >= 0 ? 'text-success' : 'text-danger')}>
            {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(Math.round(delta))}%
          </span>
        )}
      </div>
      {hint && <span className="mt-0.5 text-[11px] text-subtle">{hint}</span>}
      {spark && <Sparkline data={spark} color={color} className="-mx-1 mt-3" />}
    </div>
  )
}

/** % change of the second half of a series vs the first half (null when no baseline). */
export function halfDelta(values: number[]): number | null {
  if (values.length < 2) return null
  const mid = Math.floor(values.length / 2)
  const a = values.slice(0, mid).reduce((s, v) => s + v, 0)
  const b = values.slice(mid).reduce((s, v) => s + v, 0)
  if (a === 0) return null
  return ((b - a) / a) * 100
}

// ---------------------------------------------------------------------------
// area chart (earnings, revenue)
// ---------------------------------------------------------------------------

const axisProps = {
  tick: { fill: THEME.muted, fontSize: 11, fontFamily: 'JetBrains Mono, monospace' },
  axisLine: false,
  tickLine: false,
} as const

export function TrendAreaChart({
  data,
  dataKey,
  color = THEME.primary,
  height = 280,
  valueFormat = rupees,
  rows,
}: {
  data: object[]
  dataKey: string
  color?: string
  height?: number
  valueFormat?: (n: number) => string
  rows: TooltipRow[]
}) {
  const id = useId().replace(/:/g, '')
  const max = Math.max(0, ...data.map((d) => Number((d as Record<string, unknown>)[dataKey]) || 0))
  const tickEvery = Math.max(1, Math.ceil(data.length / 7))
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`area-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={THEME.grid} strokeDasharray="4 6" />
          <XAxis dataKey="date" {...axisProps} tickFormatter={shortDate} interval={tickEvery - 1} minTickGap={12} dy={6} />
          <YAxis {...axisProps} width={56} tickFormatter={(v: number) => (valueFormat === rupees ? rupeesShort(v) : compactNumber(v))} domain={[0, max > 0 ? 'auto' : 10]} allowDecimals={false} />
          <Tooltip cursor={{ stroke: THEME.subtle, strokeDasharray: '3 3' }} content={<DarkTooltip rows={rows} />} />
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#area-${id})`} activeDot={{ r: 4, stroke: '#08080D', strokeWidth: 2, fill: color }} animationDuration={700} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function TrendBarChart({ data, dataKey, color = THEME.accent, height = 260, rows }: { data: object[]; dataKey: string; color?: string; height?: number; rows: TooltipRow[] }) {
  const max = Math.max(0, ...data.map((d) => Number((d as Record<string, unknown>)[dataKey]) || 0))
  const tickEvery = Math.max(1, Math.ceil(data.length / 7))
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={THEME.grid} strokeDasharray="4 6" />
          <XAxis dataKey="date" {...axisProps} tickFormatter={shortDate} interval={tickEvery - 1} minTickGap={12} dy={6} />
          <YAxis {...axisProps} width={36} allowDecimals={false} domain={[0, max > 0 ? 'auto' : 4]} />
          <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} content={<DarkTooltip rows={rows} />} />
          <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={18} animationDuration={700} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---------------------------------------------------------------------------
// donut
// ---------------------------------------------------------------------------

export function Donut({
  data,
  centerLabel,
  centerValue,
  empty = 'No sales yet',
  legendValue,
}: {
  data: { key: string; name: string; value: number; color: string }[]
  centerLabel: string
  centerValue: ReactNode
  empty?: string
  legendValue: (d: { value: number }) => string
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const slices = useMemo(() => (total > 0 ? data.filter((d) => d.value > 0) : [{ key: 'empty', name: empty, value: 1, color: THEME.grid }]), [data, total, empty])
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slices} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="100%" paddingAngle={total > 0 && slices.length > 1 ? 2 : 0} stroke="none" animationDuration={700} isAnimationActive={total > 0}>
              {slices.map((s) => <Cell key={s.key} fill={s.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-mono text-xl font-semibold text-text">{centerValue}</span>
          <span className="text-[11px] text-muted">{centerLabel}</span>
        </div>
      </div>
      {total > 0 ? (
        <ul className="w-full min-w-0 flex-1 space-y-2">
          {[...data].filter((d) => d.value > 0).sort((a, b) => b.value - a.value).map((d) => (
            <li key={d.key} className="flex items-center gap-2.5 text-sm">
              <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: d.color }} />
              <span className="min-w-0 flex-1 truncate text-muted">{d.name}</span>
              <span className="font-mono text-xs text-text">{legendValue(d)}</span>
              <span className="w-10 text-right font-mono text-[11px] text-subtle">{Math.round((d.value / total) * 100)}%</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="flex-1 text-sm text-muted">{empty}. Once buyers pick up your assets, you&apos;ll see which categories earn the most.</p>
      )}
    </div>
  )
}
