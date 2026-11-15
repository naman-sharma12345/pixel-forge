import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useUiStore } from '@/stores/ui'
import { Kbd } from '@/components/ui'
import { cn } from '@/lib/cn'

export function CommandPalette() {
  const open = useUiStore((s) => s.commandPaletteOpen)
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen)
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (open) {
      setQ('')
      setTimeout(() => inputRef.current?.focus(), 60)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [open, setOpen])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(!useUiStore.getState().commandPaletteOpen)
      }
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [setOpen])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const query = q.trim()
    setOpen(false)
    navigate(query ? `/explore?q=${encodeURIComponent(query)}` : '/explore')
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[15vh]">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-panel border border-border bg-surface shadow-card">
        <form onSubmit={submit} className="flex items-center gap-3 border-b border-border px-4">
          <Search className="h-4 w-4 text-subtle" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search sprites, sfx, music, packs…"
            className="h-14 w-full bg-transparent text-sm text-text placeholder:text-subtle focus:outline-none"
            aria-label="Search assets"
          />
          <Kbd>ESC</Kbd>
        </form>
        <div className="px-4 py-3 text-xs text-muted">
          Press <Kbd className="mx-1">Enter</Kbd> to search the marketplace. Press <Kbd className="mx-1">Esc</Kbd> to close.
        </div>
      </div>
    </div>
  )
}

export function SearchTrigger() {
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen)
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={cn(
        'hidden h-9 w-56 items-center gap-2 rounded-control border border-border bg-surface-2 px-3 text-sm text-subtle transition-colors',
        'hover:border-border-strong hover:text-muted sm:flex lg:w-64',
      )}
      aria-label="Search (Ctrl+K)"
    >
      <Search className="h-4 w-4" />
      <span className="flex-1 text-left">Search assets…</span>
      <Kbd>Ctrl K</Kbd>
    </button>
  )
}
