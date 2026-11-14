import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Horizontal snap carousel: header with title, arrows and "See all",
 * drag-to-scroll with the mouse (clicks are suppressed only after a real drag),
 * native swipe on touch, and edge fades that appear only when there is more.
 */
export function AssetRail({
  title,
  subtitle,
  icon,
  seeAll,
  children,
  className,
  itemClassName = 'w-[46%] sm:w-[31%] md:w-[23.5%] lg:w-[18.8%]',
}: {
  title: string
  subtitle?: string
  icon?: ReactNode
  seeAll?: string
  children: ReactNode
  className?: string
  itemClassName?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef({ down: false, startX: 0, scrollLeft: 0, moved: false })
  const [edges, setEdges] = useState({ start: true, end: false })
  const [dragging, setDragging] = useState(false)

  const update = useCallback(() => {
    const el = ref.current
    if (!el) return
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 })
  }, [])

  useEffect(() => {
    update()
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [update, children])

  const scrollBy = (dir: 1 | -1) => {
    const el = ref.current
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: 'smooth' })
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || !ref.current) return
    drag.current = { down: true, startX: e.clientX, scrollLeft: ref.current.scrollLeft, moved: false }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const el = ref.current
    if (!drag.current.down || !el) return
    const dx = e.clientX - drag.current.startX
    if (!drag.current.moved && Math.abs(dx) > 6) {
      drag.current.moved = true
      setDragging(true)
    }
    if (drag.current.moved) el.scrollLeft = drag.current.scrollLeft - dx
  }
  const endDrag = () => {
    drag.current.down = false
    if (dragging) setTimeout(() => setDragging(false), 0)
  }

  return (
    <section className={cn('relative', className)} aria-label={title}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-text sm:text-2xl">
            {icon}
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {seeAll && (
            <Link
              to={seeAll}
              className="group mr-1 inline-flex items-center gap-1 whitespace-nowrap rounded-control px-2 py-1.5 text-sm font-medium text-muted transition-colors hover:text-text"
            >
              See all <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
          {[
            { dir: -1 as const, Icon: ChevronLeft, label: `Scroll ${title} left`, disabled: edges.start },
            { dir: 1 as const, Icon: ChevronRight, label: `Scroll ${title} right`, disabled: edges.end },
          ].map(({ dir, Icon, label, disabled }) => (
            <button
              key={dir}
              type="button"
              aria-label={label}
              disabled={disabled}
              onClick={() => scrollBy(dir)}
              className="hidden h-8 w-8 items-center justify-center rounded-control border border-border bg-surface text-muted transition-colors hover:border-border-strong hover:text-text disabled:opacity-30 sm:inline-flex"
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <div
          ref={ref}
          onScroll={update}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          onClickCapture={(e) => {
            if (drag.current.moved) {
              e.preventDefault()
              e.stopPropagation()
              drag.current.moved = false
            }
          }}
          onDragStart={(e) => e.preventDefault()}
          className={cn(
            '-mx-4 flex gap-3 overflow-x-auto overscroll-x-contain px-4 pb-3 pt-1 [scrollbar-width:none] sm:-mx-1 sm:gap-4 sm:px-1 [&::-webkit-scrollbar]:hidden',
            dragging ? 'cursor-grabbing select-none' : 'snap-x snap-mandatory scroll-smooth',
          )}
        >
          {Children.toArray(children).map((child, i) => (
            <div key={i} className={cn('shrink-0 snap-start', itemClassName)}>
              {child}
            </div>
          ))}
        </div>
        <div className={cn('pointer-events-none absolute inset-y-0 -left-1 w-10 bg-gradient-to-r from-bg to-transparent transition-opacity duration-200', edges.start ? 'opacity-0' : 'opacity-100')} />
        <div className={cn('pointer-events-none absolute inset-y-0 -right-1 w-10 bg-gradient-to-l from-bg to-transparent transition-opacity duration-200', edges.end ? 'opacity-0' : 'opacity-100')} />
      </div>
    </section>
  )
}
