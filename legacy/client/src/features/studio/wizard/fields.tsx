import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { useDropzone, type Accept } from 'react-dropzone'
import { Reorder } from 'framer-motion'
import {
  AlertTriangle, Archive, ChevronLeft, ChevronRight, FileText, Image as ImageIcon, Music2, Pause, Play, Box, Type, UploadCloud, X,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatBytes } from '@/lib/format'
import { usePlayerStore } from '@/stores/player'
import { extOf, fileKind, type FileKind } from './rules'
import type { PreviewItem } from './state'

// ---------------------------------------------------------------------------
// drop zone
// ---------------------------------------------------------------------------

export function DropArea({
  onFiles,
  accept,
  multiple,
  disabled,
  title,
  hint,
  error,
  compact,
}: {
  onFiles: (files: File[]) => void
  accept?: Accept
  multiple?: boolean
  disabled?: boolean
  title: string
  hint: string
  error?: string
  compact?: boolean
}) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => files.length && onFiles(files),
    accept,
    multiple,
    disabled,
  })
  return (
    <div
      {...getRootProps()}
      className={cn(
        'group relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed text-center transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        compact ? 'px-4 py-5' : 'px-6 py-9',
        isDragActive ? 'scale-[1.01] border-primary bg-primary-soft' : error ? 'border-danger/50 bg-danger/5 hover:border-danger' : 'border-border-strong bg-surface-2/40 hover:border-primary/60 hover:bg-surface-2',
        disabled && 'pointer-events-none opacity-50',
      )}
      aria-invalid={!!error}
    >
      <input {...getInputProps()} />
      <span className={cn('flex h-10 w-10 items-center justify-center rounded-control transition-colors', isDragActive ? 'bg-primary text-white' : 'bg-surface-3 text-muted group-hover:text-primary')}>
        <UploadCloud className="h-5 w-5" />
      </span>
      <p className="text-sm font-medium text-text">{isDragActive ? 'Drop to add' : title}</p>
      <p className="max-w-sm text-xs text-subtle">{hint}</p>
    </div>
  )
}

export function FieldError({ children, id }: { children?: ReactNode; id?: string }) {
  if (!children) return null
  return (
    <p id={id} role="alert" className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-danger">
      <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" /> <span>{children}</span>
    </p>
  )
}

export function FieldLabel({ children, required, aside }: { children: ReactNode; required?: boolean; aside?: ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <span className="text-sm font-medium text-text">
        {children}
        {required && <span className="ml-0.5 text-danger" aria-hidden="true">*</span>}
      </span>
      {aside}
    </div>
  )
}

// ---------------------------------------------------------------------------
// thumbnail
// ---------------------------------------------------------------------------

export function ThumbnailPreview({ src, onRemove, name }: { src: string; onRemove?: () => void; name?: string }) {
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null)
  useEffect(() => {
    setDims(null)
    const img = new Image()
    img.onload = () => setDims({ w: img.naturalWidth, h: img.naturalHeight })
    img.src = src
  }, [src])
  const square = dims ? dims.w === dims.h : true
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <div className="checker relative aspect-square w-40 shrink-0 overflow-hidden rounded-card ring-1 ring-border">
        <img src={src} alt="Thumbnail preview" className="pixelated h-full w-full object-cover" />
        {onRemove && (
          <button type="button" onClick={onRemove} aria-label="Remove thumbnail" className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-bg/80 text-muted backdrop-blur hover:text-danger">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="min-w-0 text-sm">
        {name && <p className="truncate font-medium text-text">{name}</p>}
        {dims && <p className="mt-0.5 font-mono text-xs text-muted">{dims.w} × {dims.h}px</p>}
        {!square && (
          <p className="mt-3 flex items-start gap-1.5 rounded-control border border-warning/30 bg-warning/10 px-2.5 py-2 text-xs leading-relaxed text-warning">
            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
            This image isn’t square, so cards will crop it to the centre (as shown). A square image looks best.
          </p>
        )}
        <p className="mt-3 text-xs text-subtle">Shown with nearest-neighbour scaling, exactly as on the store.</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// previews (reorderable)
// ---------------------------------------------------------------------------

function MiniAudio({ url, label }: { url: string; label: string }) {
  const ref = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const pauseGlobal = usePlayerStore((s) => s.pause)
  const toggle = () => {
    const a = ref.current
    if (!a) return
    if (a.paused) { pauseGlobal(); void a.play() } else a.pause()
  }
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/25 via-surface-3 to-accent/15 p-2">
      <audio ref={ref} src={url} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} preload="metadata" />
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); toggle() }}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label={playing ? `Pause ${label}` : `Play ${label}`}
        className={cn('flex h-10 w-10 items-center justify-center rounded-full text-bg transition-colors', playing ? 'bg-accent' : 'bg-text')}
      >
        {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="ml-0.5 h-4 w-4 fill-current" />}
      </button>
      <span className="flex items-end gap-[2px]" aria-hidden="true">
        {[5, 9, 6, 11, 7, 10, 4].map((h, i) => <span key={i} className={cn('w-[3px] rounded-full bg-text/50', playing && 'animate-equalizer bg-accent')} style={{ height: h, animationDelay: `${i * -0.13}s` }} />)}
      </span>
    </div>
  )
}

export function PreviewList({ items, onChange }: { items: PreviewItem[]; onChange: (items: PreviewItem[]) => void }) {
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= items.length) return
    const next = [...items]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  return (
    <Reorder.Group axis="x" values={items} onReorder={onChange} className="flex gap-3 overflow-x-auto pb-2 pt-1" aria-label="Previews, drag to reorder">
      {items.map((p, i) => (
        <Reorder.Item key={p.id} value={p} className="group relative h-32 w-32 shrink-0 cursor-grab touch-pan-y overflow-hidden rounded-card ring-1 ring-border active:cursor-grabbing" whileDrag={{ scale: 1.05, zIndex: 10, boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
          {p.kind === 'image' ? <img src={p.url} alt="" draggable={false} className="pixelated checker h-full w-full object-cover" /> : <MiniAudio url={p.url} label={p.file.name} />}
          <span className="absolute left-1.5 top-1.5 rounded-md bg-bg/80 px-1.5 py-0.5 font-mono text-[10px] text-text backdrop-blur">{i + 1}</span>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onChange(items.filter((x) => x.id !== p.id))}
            aria-label={`Remove preview ${i + 1}`}
            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-bg/80 text-muted backdrop-blur transition-colors hover:text-danger"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100">
            <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move preview ${i + 1} earlier`} className="flex h-6 w-6 items-center justify-center rounded-full bg-bg/80 text-text backdrop-blur disabled:opacity-30">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label={`Move preview ${i + 1} later`} className="flex h-6 w-6 items-center justify-center rounded-full bg-bg/80 text-text backdrop-blur disabled:opacity-30">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </Reorder.Item>
      ))}
    </Reorder.Group>
  )
}

// ---------------------------------------------------------------------------
// main file card
// ---------------------------------------------------------------------------

const KIND_ICON: Record<FileKind, typeof Archive> = { archive: Archive, image: ImageIcon, audio: Music2, font: Type, model: Box, doc: FileText }

export function FileCard({ name, bytes, onRemove, note }: { name: string; bytes: number; onRemove?: () => void; note?: string }) {
  const kind = fileKind(name)
  const Icon = KIND_ICON[kind]
  return (
    <div className="flex items-center gap-4 rounded-card border border-border bg-surface-2/60 p-4">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control bg-primary-soft text-primary">
        <Icon className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text" title={name}>{name}</p>
        <p className="mt-0.5 font-mono text-xs text-muted">
          .{extOf(name)} · {formatBytes(bytes)} · {kind}
        </p>
        {note && <p className="mt-1 text-xs text-subtle">{note}</p>}
      </div>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label="Remove file" className="rounded-control p-2 text-subtle transition-colors hover:bg-danger/10 hover:text-danger">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// chips input (tags, file formats)
// ---------------------------------------------------------------------------

export function ChipsInput({
  label,
  values,
  onChange,
  max,
  maxLen,
  suggestions = [],
  placeholder,
  error,
  hint,
  prefix = '',
}: {
  label: string
  values: string[]
  onChange: (v: string[]) => void
  max: number
  maxLen: number
  suggestions?: string[]
  placeholder: string
  error?: string
  hint?: string
  prefix?: string
}) {
  const [text, setText] = useState('')
  const [focus, setFocus] = useState(false)
  const inputId = useId()
  const errId = useId()
  const full = values.length >= max
  const add = (raw: string) => {
    const parts = raw.split(',').map((t) => t.trim().toLowerCase().replace(/^[#.]/, '')).filter(Boolean)
    const next = [...values]
    for (const p of parts) if (p.length <= maxLen && !next.includes(p) && next.length < max) next.push(p)
    onChange(next)
    setText('')
  }
  const matches = useMemo(() => {
    const n = text.trim().toLowerCase()
    return suggestions.filter((s) => !values.includes(s) && (!n || s.startsWith(n))).slice(0, 8)
  }, [suggestions, values, text])

  return (
    <div>
      <FieldLabel aside={<span className="font-mono text-xs text-subtle">{values.length}/{max}</span>}>
        <label htmlFor={inputId}>{label}</label>
      </FieldLabel>
      <div
        className={cn(
          'flex min-h-11 flex-wrap items-center gap-1.5 rounded-control border bg-surface-2 px-2 py-1.5 transition-colors focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20',
          error ? 'border-danger/60' : 'border-border',
        )}
      >
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-md bg-primary-soft py-0.5 pl-2 pr-1 text-xs text-text">
            {prefix}{v}
            <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} aria-label={`Remove ${v}`} className="rounded p-0.5 text-muted hover:text-danger">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          id={inputId}
          value={text}
          disabled={full}
          onFocus={() => setFocus(true)}
          onBlur={() => { setFocus(false); if (text.trim()) add(text) }}
          onChange={(e) => (e.target.value.includes(',') ? add(e.target.value) : setText(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); if (text.trim()) add(text) }
            else if (e.key === 'Backspace' && !text && values.length) onChange(values.slice(0, -1))
          }}
          maxLength={maxLen}
          placeholder={full ? `Maximum of ${max} reached` : values.length ? '' : placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? errId : undefined}
          className="h-7 min-w-[120px] flex-1 bg-transparent px-1 text-sm text-text placeholder:text-subtle focus:outline-none disabled:cursor-not-allowed"
        />
      </div>
      {hint && !error && <p className="mt-1.5 text-xs text-subtle">{hint}</p>}
      <FieldError id={errId}>{error}</FieldError>
      {focus && !full && matches.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Suggestions">
          {matches.map((m) => (
            <button
              key={m}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => add(m)}
              className="rounded-full border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-primary/50 hover:text-text"
            >
              + {prefix}{m}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// pixel progress bar
// ---------------------------------------------------------------------------

export function PixelProgress({ value, segments = 24 }: { value: number; segments?: number }) {
  const filled = Math.round((Math.min(100, Math.max(0, value)) / 100) * segments)
  return (
    <div className="flex gap-1 rounded-[6px] border-2 border-border-strong bg-bg p-1.5" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
      {Array.from({ length: segments }).map((_, i) => (
        <span
          key={i}
          className={cn('h-6 flex-1 transition-colors duration-100', i < filled ? 'bg-gradient-to-b from-[#c4b5fd] to-primary shadow-[inset_0_-3px_0_rgba(0,0,0,0.25)]' : 'bg-surface-3')}
          style={i < filled ? { filter: `hue-rotate(${(i / segments) * -60}deg)` } : undefined}
        />
      ))}
    </div>
  )
}

