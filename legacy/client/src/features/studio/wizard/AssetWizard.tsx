import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { ArrowLeft, ArrowRight, Check, Eye, History, Info, Pencil, RotateCcw, Upload, X } from 'lucide-react'
import { AssetCard } from '@/components/asset/AssetCard'
import { Button, Input, PixelButton, Switch, Textarea } from '@/components/ui'
import { useAssetTags, useCreateAsset, useUpdateAsset } from '@/hooks/useAssets'
import { isApiClientError } from '@/api'
import { useAuthStore } from '@/stores/auth'
import { CATEGORIES, CATEGORY_MAP, LICENSES } from '@/lib/constants'
import { mediaUrl } from '@/lib/media'
import { formatBytes, formatDuration } from '@/lib/format'
import { fireConfetti } from '@/lib/confetti'
import { generateIllustration } from '@/lib/pixelArt'
import { cn } from '@/lib/cn'
import type { AssetCard as AssetCardData, AssetDetail, Category, License } from '@/types/api'
import { AUDIO_MIMES, IMAGE_MIMES, MAX_PREVIEWS, PRODUCT_EXTENSIONS, checkPreview, checkProduct, checkThumbnail, earningFor, extOf } from './rules'
import {
  FIELD_STEP, STEPS, blankState, buildCreateBody, buildUpdateBody, clearDraft, fromDetail, isBlank, loadDraft, mediaKindOf, priceOf, saveDraft,
  validateAll, validateStep, type Errors, type PreviewItem, type WizardState,
} from './state'
import { ChipsInput, DropArea, FieldError, FieldLabel, FileCard, PixelProgress, PreviewList, ThumbnailPreview } from './fields'

const PRICE_PRESETS = [49, 99, 199, 499, 999]
const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`
let previewSeq = 0

// ---------------------------------------------------------------------------
// stepper
// ---------------------------------------------------------------------------

function Stepper({ step, maxStep, onGo }: { step: number; maxStep: number; onGo: (i: number) => void }) {
  return (
    <ol className="flex items-center" aria-label="Upload steps">
      {STEPS.map((s, i) => {
        const done = i < maxStep || (i < step)
        const current = i === step
        const reachable = i <= maxStep
        return (
          <li key={s.key} className={cn('flex items-center', i < STEPS.length - 1 && 'flex-1')}>
            <button
              type="button"
              onClick={() => reachable && onGo(i)}
              disabled={!reachable}
              aria-current={current ? 'step' : undefined}
              className={cn('group flex items-center gap-2.5 rounded-control py-1 pr-2 text-left transition-colors disabled:cursor-not-allowed', reachable && !current && 'hover:text-text')}
            >
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] font-mono text-xs font-semibold transition-all duration-200',
                  current ? 'bg-primary text-white shadow-[0_0_0_4px_rgba(139,92,246,0.2)]' : done ? 'bg-success text-bg' : 'border border-border-strong bg-surface text-subtle',
                )}
              >
                {done && !current ? <Check className="h-4 w-4" strokeWidth={3} /> : i + 1}
              </span>
              <span className={cn('hidden text-sm font-medium md:inline', current ? 'text-text' : done ? 'text-muted' : 'text-subtle')}>{s.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <span className="mx-1.5 h-0.5 flex-1 overflow-hidden rounded-full bg-border sm:mx-3">
                <motion.span className="block h-full bg-gradient-to-r from-success to-primary" initial={false} animate={{ width: i < maxStep ? '100%' : '0%' }} transition={{ duration: 0.35 }} />
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <h3 className="font-display text-base font-semibold text-text">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  )
}

// ---------------------------------------------------------------------------
// overlays
// ---------------------------------------------------------------------------

function UploadOverlay({ progress, mode }: { progress: number; mode: 'create' | 'edit' }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-bg/90 px-6 backdrop-blur-md" role="alertdialog" aria-modal="true" aria-label="Uploading">
      <div className="w-full max-w-md text-center">
        <img src={generateIllustration('gem', 'forge')} alt="" className="pixelated mx-auto h-24 w-24 animate-float" />
        <p className="mt-4 font-pixel text-[10px] uppercase text-primary">{progress >= 100 ? 'Finishing up' : mode === 'create' ? 'Forging your asset' : 'Saving changes'}</p>
        <p className="mt-4 font-mono text-5xl font-semibold tabular-nums text-text">{Math.round(progress)}%</p>
        <div className="mt-6"><PixelProgress value={progress} /></div>
        <p className="mt-4 text-xs text-subtle">Keep this tab open while your files upload.</p>
      </div>
    </div>
  )
}

function SuccessScreen({ asset, mode, onAnother }: { asset: AssetDetail; mode: 'create' | 'edit'; onAnother: () => void }) {
  const navigate = useNavigate()
  const art = useMemo(() => generateIllustration('chest', 'publish'), [])
  useEffect(() => { fireConfetti({ y: 0.4 }) }, [])
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center py-12 text-center">
      <img src={art} alt="" className="pixelated h-32 w-32" />
      <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 font-pixel text-[8px] uppercase text-success">
        <Check className="h-3 w-3" strokeWidth={3} /> {mode === 'create' ? 'Published' : 'Saved'}
      </span>
      <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-text">{mode === 'create' ? 'Your asset is live!' : 'Changes saved'}</h2>
      <p className="mt-2 text-sm text-muted">“{asset.title}” is {asset.status === 'published' ? 'now on the marketplace' : `saved with status ${asset.status}`}.</p>
      <div className="mt-8 w-56">
        <AssetCard asset={asset} isMine />
      </div>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <PixelButton onClick={() => navigate(`/asset/${asset.slug}`)}>
          <Eye className="h-4 w-4" /> View asset
        </PixelButton>
        {mode === 'create' ? (
          <Button variant="secondary" size="lg" leftIcon={<Upload className="h-4 w-4" />} onClick={onAnother}>Upload another</Button>
        ) : (
          <Button variant="secondary" size="lg" onClick={() => navigate('/studio/assets')}>Back to my assets</Button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// wizard
// ---------------------------------------------------------------------------

export function AssetWizard({ mode, asset }: { mode: 'create' | 'edit'; asset?: AssetDetail }) {
  const reduce = useReducedMotion()
  const user = useAuthStore((s) => s.user)
  const original = useMemo(() => (asset ? fromDetail(asset) : blankState()), [asset])
  const [s, setS] = useState<WizardState>(original)
  const [step, setStep] = useState(0)
  const [maxStep, setMaxStep] = useState(mode === 'edit' ? STEPS.length - 1 : 0)
  const [dir, setDir] = useState(1)
  const [errors, setErrors] = useState<Errors>({})
  const [progress, setProgress] = useState<number | null>(null)
  const [done, setDone] = useState<AssetDetail | null>(null)
  const [draft, setDraft] = useState(() => (mode === 'create' ? loadDraft() : null))
  const [detectingDuration, setDetectingDuration] = useState(false)
  const tagsQ = useAssetTags()
  const create = useCreateAsset()
  const update = useUpdateAsset()
  const topRef = useRef<HTMLDivElement>(null)

  const patch = (p: Partial<WizardState>) => {
    setS((cur) => ({ ...cur, ...p }))
    // clear errors for edited fields as the user fixes them
    setErrors((e) => {
      const next = { ...e }
      for (const k of Object.keys(p)) delete next[k]
      return next
    })
  }
  const patchMeta = (p: Partial<WizardState['meta']>) => {
    setS((cur) => ({ ...cur, meta: { ...cur.meta, ...p } }))
    setErrors((e) => {
      const next = { ...e }
      for (const k of Object.keys(p)) delete next[`meta.${k}`]
      return next
    })
  }

  // ----- draft autosave (text fields only) -----
  useEffect(() => {
    if (mode !== 'create' || done || isBlank(s) || draft) return
    const t = window.setTimeout(() => saveDraft(s), 500)
    return () => window.clearTimeout(t)
  }, [s, mode, done, draft])

  // ----- object urls -----
  const thumbUrl = useMemo(() => (s.thumbnail ? URL.createObjectURL(s.thumbnail) : ''), [s.thumbnail])
  useEffect(() => () => { if (thumbUrl) URL.revokeObjectURL(thumbUrl) }, [thumbUrl])
  const previewsRef = useRef<PreviewItem[]>([])
  previewsRef.current = s.previews
  useEffect(() => () => previewsRef.current.forEach((p) => URL.revokeObjectURL(p.url)), [])
  const fileAudioUrl = useMemo(() => (s.file && AUDIO_MIMES.includes(s.file.type) ? URL.createObjectURL(s.file) : ''), [s.file])
  useEffect(() => () => { if (fileAudioUrl) URL.revokeObjectURL(fileAudioUrl) }, [fileAudioUrl])

  const setPreviews = (next: PreviewItem[]) => {
    const keep = new Set(next.map((p) => p.id))
    s.previews.filter((p) => !keep.has(p.id)).forEach((p) => URL.revokeObjectURL(p.url))
    patch({ previews: next })
  }

  // ----- audio duration auto-detect -----
  const kind = mediaKindOf(s.category)
  const audioSource = s.previews.find((p) => p.kind === 'audio')?.url || fileAudioUrl
  useEffect(() => {
    if (kind !== 'audio' || !audioSource) return
    setDetectingDuration(true)
    const a = new Audio()
    a.preload = 'metadata'
    const done = () => setDetectingDuration(false)
    a.onloadedmetadata = () => {
      if (Number.isFinite(a.duration) && a.duration > 0) {
        setS((cur) => ({ ...cur, meta: { ...cur.meta, durationSec: String(Math.round(a.duration * 10) / 10) } }))
      }
      done()
    }
    a.onerror = done
    a.src = audioSource
    return () => { a.onloadedmetadata = null; a.onerror = null; a.src = '' }
  }, [kind, audioSource])

  // ----- navigation -----
  const go = (i: number) => {
    setDir(i > step ? 1 : -1)
    setStep(i)
    setErrors({})
    topRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }
  const next = () => {
    const e = validateStep(step, s, mode)
    if (Object.keys(e).length) {
      setErrors(e)
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    const n = Math.min(STEPS.length - 1, step + 1)
    setMaxStep((m) => Math.max(m, n))
    go(n)
  }

  // ----- publish -----
  const busy = progress !== null
  const publish = async () => {
    const invalid = validateAll(s, mode)
    if (invalid) {
      go(invalid.step)
      setErrors(invalid.errors)
      toast.error('A few fields need attention before publishing')
      return
    }
    const files = {
      thumbnail: s.thumbnail ?? undefined,
      previews: s.previews.length ? s.previews.map((p) => p.file) : undefined,
      file: s.file ?? undefined,
    }
    try {
      setProgress(0)
      let result: AssetDetail
      if (mode === 'create') {
        result = await create.mutateAsync({ body: buildCreateBody(s), files: files as { thumbnail: File; previews?: File[]; file: File }, onProgress: setProgress })
        clearDraft()
      } else {
        const body = buildUpdateBody(s, original)
        const hasFiles = !!(files.thumbnail || files.file || files.previews)
        if (!Object.keys(body).length && !hasFiles) {
          setProgress(null)
          toast('Nothing changed yet')
          return
        }
        result = await update.mutateAsync({ id: asset!._id, body, files: hasFiles ? files : undefined, onProgress: setProgress })
      }
      setProgress(100)
      await new Promise((r) => setTimeout(r, 350))
      setProgress(null)
      setDone(result)
    } catch (err) {
      setProgress(null)
      if (isApiClientError(err)) {
        if (err.code === 'FILE_TOO_LARGE' || err.code === 'UNSUPPORTED_FILE') {
          go(1)
          setErrors({ file: err.message })
          return
        }
        const fieldErrs: Errors = {}
        let first: number = STEPS.length
        for (const d of err.details ?? []) {
          const path = d.path.replace(/^body\.?/, '')
          const field = path.split('.')[0]
          const key = field === 'meta' && path.includes('.') ? path : field
          fieldErrs[key] = d.message
          if (FIELD_STEP[field] !== undefined) first = Math.min(first, FIELD_STEP[field])
        }
        if (Object.keys(fieldErrs).length) {
          go(first < STEPS.length ? first : 0)
          setErrors(fieldErrs)
          toast.error('The server flagged a few fields')
          return
        }
        toast.error(err.message)
      } else toast.error('Upload failed. Check your connection and try again.')
    }
  }

  const resetForAnother = () => {
    s.previews.forEach((p) => URL.revokeObjectURL(p.url))
    setS(blankState())
    setStep(0)
    setMaxStep(0)
    setErrors({})
    setDone(null)
  }

  // ----- live preview card -----
  const previewCard: AssetCardData = {
    _id: 'preview',
    slug: 'preview',
    title: s.title.trim() || 'Untitled asset',
    category: (s.category || 'sprites') as Category,
    mediaKind: kind,
    thumbnail: { url: thumbUrl || (asset ? asset.thumbnail.url : generateIllustration('ghost', 'preview-card')) },
    previewAudioUrl: s.previews.find((p) => p.kind === 'audio')?.url ?? (fileAudioUrl || asset?.previewAudioUrl || null),
    price: priceOf(s),
    isFree: priceOf(s) === 0,
    license: s.license,
    tags: s.tags,
    isFeatured: false,
    stats: { sales: asset?.stats.sales ?? 0, downloads: asset?.stats.downloads ?? 0, ratingAvg: asset?.stats.ratingAvg ?? 0, ratingCount: asset?.stats.ratingCount ?? 0 },
    creator: { _id: user?._id ?? '', username: user?.username ?? 'you', name: user?.name ?? 'You', avatarUrl: user?.avatarUrl ?? '' },
    createdAt: new Date().toISOString(),
  }

  if (done) return <SuccessScreen asset={done} mode={mode} onAnother={resetForAnother} />

  const price = priceOf(s)
  const cat = s.category ? CATEGORY_MAP.get(s.category) : undefined

  // ----- step bodies -----
  const stepBody = [
    // 0 basics
    <div key="basics" className="space-y-7">
      <div>
        <Input
          label="Title"
          value={s.title}
          onChange={(e) => patch({ title: e.target.value })}
          maxLength={80}
          counter
          error={errors.title}
          placeholder="e.g. Pixel Dungeon Tileset 16×16"
          aria-invalid={!!errors.title}
          autoFocus={mode === 'create'}
        />
      </div>
      <div>
        <FieldLabel required>Category</FieldLabel>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5" role="radiogroup" aria-label="Category" aria-invalid={!!errors.category}>
          {CATEGORIES.map((c) => {
            const active = s.category === c.key
            return (
              <button
                key={c.key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => patch({ category: c.key })}
                className={cn(
                  'group flex flex-col items-start gap-2 rounded-card border p-3 text-left transition-all duration-150',
                  active ? 'border-primary bg-primary-soft shadow-[0_0_0_1px_rgba(139,92,246,0.5)]' : 'border-border bg-surface-2/40 hover:border-border-strong hover:bg-surface-2',
                )}
              >
                <span className={cn('flex h-8 w-8 items-center justify-center rounded-[8px] transition-colors', active ? 'bg-primary text-white' : 'bg-surface-3 text-muted group-hover:text-text')}>
                  <c.icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-semibold text-text">{c.label}</span>
                <span className="text-[11px] capitalize text-subtle">{c.mediaKind}</span>
              </button>
            )
          })}
        </div>
        <FieldError>{errors.category}</FieldError>
        {cat && <p className="mt-2 text-xs text-muted">{cat.blurb}</p>}
      </div>
      <div>
        <Textarea
          label="Description"
          value={s.description}
          onChange={(e) => patch({ description: e.target.value })}
          maxLength={5000}
          counter
          rows={7}
          error={errors.description}
          hint={errors.description ? undefined : 'What’s in the pack, sizes, engine notes. Line breaks and links are kept. 20 characters minimum.'}
          placeholder={'48 hand-drawn dungeon tiles at 16×16 with autotile rules.\n\nIncludes: walls, floors, doors, props.\nWorks great with Godot and Tiled.'}
          aria-invalid={!!errors.description}
        />
      </div>
    </div>,

    // 1 media
    <div key="media" className="space-y-8">
      <Section title="Thumbnail" aside={<span className="text-xs text-subtle">PNG, JPG, WebP or GIF · square works best</span>}>
        {s.thumbnail ? (
          <ThumbnailPreview src={thumbUrl} name={s.thumbnail.name} onRemove={() => patch({ thumbnail: null })} />
        ) : asset ? (
          <div className="space-y-3">
            <ThumbnailPreview src={mediaUrl(asset.thumbnail.url)} name="Current thumbnail" />
          </div>
        ) : null}
        {!s.thumbnail && (
          <DropArea
            compact={!!asset}
            title={asset ? 'Drop a new image to replace it' : 'Drop your thumbnail here, or click to browse'}
            hint="This is the image on every card. Up to 25 MB."
            accept={{ 'image/*': IMAGE_MIMES.map((m) => `.${m.split('/')[1].replace('jpeg', 'jpg')}`).concat(['.jpeg']) }}
            error={errors.thumbnail}
            onFiles={([f]) => {
              const msg = checkThumbnail(f)
              if (msg) setErrors((e) => ({ ...e, thumbnail: msg }))
              else patch({ thumbnail: f })
            }}
          />
        )}
        <FieldError>{errors.thumbnail}</FieldError>
      </Section>

      <Section title="Previews" aside={<span className="font-mono text-xs text-subtle">{s.previews.length}/{MAX_PREVIEWS}</span>}>
        <p className="-mt-2 text-sm text-muted">
          Extra screenshots, animation frames or audio demos. Drag to reorder; the first audio preview plays on cards.
        </p>
        {kind === 'audio' && !s.previews.some((p) => p.kind === 'audio') && (
          <p className="flex items-start gap-2 rounded-control border border-accent/30 bg-accent/10 px-3 py-2.5 text-xs leading-relaxed text-text/90">
            <Info className="mt-px h-3.5 w-3.5 shrink-0 text-accent" />
            No audio preview yet. If you don’t add one, your main file will be used as the preview, so buyers can still listen before buying.
          </p>
        )}
        {asset && asset.previews.length > 0 && !s.previews.length && (
          <div>
            <p className="mb-2 text-xs text-subtle">Current previews (adding new ones replaces all of these):</p>
            <div className="flex gap-2 overflow-x-auto">
              {asset.previews.map((p, i) =>
                p.kind === 'image'
                  ? <img key={i} src={mediaUrl(p.url)} alt="" className="pixelated checker h-20 w-20 shrink-0 rounded-[10px] object-cover ring-1 ring-border" />
                  : <span key={i} className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[10px] bg-surface-3 font-mono text-[10px] text-muted ring-1 ring-border">audio {i + 1}</span>,
              )}
            </div>
          </div>
        )}
        {s.previews.length > 0 && <PreviewList items={s.previews} onChange={setPreviews} />}
        {s.previews.length < MAX_PREVIEWS && (
          <DropArea
            compact
            multiple
            title="Add images or audio"
            hint={`${MAX_PREVIEWS - s.previews.length} slot${MAX_PREVIEWS - s.previews.length === 1 ? '' : 's'} left · PNG, JPG, WebP, GIF, MP3, WAV, OGG, WebM`}
            error={errors.previews}
            onFiles={(files) => {
              const room = MAX_PREVIEWS - s.previews.length
              const accepted: PreviewItem[] = []
              let firstError = ''
              for (const f of files.slice(0, room)) {
                const msg = checkPreview(f)
                if (msg) { firstError ||= msg; continue }
                accepted.push({ id: `pv-${++previewSeq}`, file: f, url: URL.createObjectURL(f), kind: f.type.startsWith('audio/') ? 'audio' : 'image' })
              }
              if (files.length > room) firstError ||= `Only ${MAX_PREVIEWS} previews are allowed, so the extra files were skipped.`
              if (accepted.length) patch({ previews: [...s.previews, ...accepted] })
              setErrors((e) => ({ ...e, previews: firstError || undefined }))
            }}
          />
        )}
        <FieldError>{errors.previews}</FieldError>
      </Section>

      <Section title="Main file" aside={<span className="text-xs text-subtle">The download buyers get · up to 25 MB</span>}>
        {s.file ? (
          <FileCard name={s.file.name} bytes={s.file.size} onRemove={() => patch({ file: null })} />
        ) : asset ? (
          <FileCard name={asset.fileInfo.originalName} bytes={asset.fileInfo.bytes} note="Current file. Drop a new one below to replace it." />
        ) : null}
        {!s.file && (
          <DropArea
            compact={!!asset}
            title={asset ? 'Drop a new file to replace it' : 'Drop the file buyers will download'}
            hint={`Allowed: ${PRODUCT_EXTENSIONS.slice(0, 14).map((e) => `.${e}`).join(' ')} and more. Bundle multiple files in a .zip.`}
            error={errors.file}
            onFiles={([f]) => {
              const msg = checkProduct(f)
              if (msg) { setErrors((e) => ({ ...e, file: msg })); return }
              const ext = extOf(f.name)
              patch({ file: f, fileFormats: s.fileFormats.includes(ext) ? s.fileFormats : [...s.fileFormats, ext].slice(0, 10) })
            }}
          />
        )}
        <FieldError>{errors.file}</FieldError>
      </Section>
    </div>,

    // 2 details
    <div key="details" className="space-y-7">
      <ChipsInput
        label="Tags"
        values={s.tags}
        onChange={(tags) => patch({ tags })}
        max={10}
        maxLen={24}
        prefix="#"
        suggestions={(tagsQ.data ?? []).map((t) => t.tag)}
        placeholder="Type a tag and press Enter, e.g. pixel-art"
        hint="Up to 10 tags, 24 characters each. Buyers filter by these."
        error={errors.tags}
      />
      <ChipsInput
        label="File formats"
        values={s.fileFormats}
        onChange={(fileFormats) => patch({ fileFormats })}
        max={10}
        maxLen={12}
        prefix="."
        suggestions={['png', 'aseprite', 'psd', 'gif', 'wav', 'ogg', 'mp3', 'ttf', 'otf', 'glb', 'fbx', 'tmx', 'json', 'zip']}
        placeholder="png, aseprite, wav…"
        hint="Formats included in the download. Pre-filled from your main file."
        error={errors.fileFormats}
      />
      {kind === 'image' && (
        <Section title="Image details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Resolution" value={s.meta.resolution} onChange={(e) => patchMeta({ resolution: e.target.value })} placeholder="16x16" hint={errors['meta.resolution'] ? undefined : 'Size of one sprite or tile'} error={errors['meta.resolution']} aria-invalid={!!errors['meta.resolution']} />
            <Input label="Animation frames" type="number" inputMode="numeric" min={1} value={s.meta.frames} onChange={(e) => patchMeta({ frames: e.target.value })} placeholder="8" hint={errors['meta.frames'] ? undefined : 'Above 1 unlocks the Animate player'} error={errors['meta.frames']} aria-invalid={!!errors['meta.frames']} />
          </div>
        </Section>
      )}
      {kind === 'audio' && (
        <Section title="Audio details" aside={detectingDuration ? <span className="text-xs text-accent">Reading duration…</span> : undefined}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Duration (seconds)"
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              value={s.meta.durationSec}
              onChange={(e) => patchMeta({ durationSec: e.target.value })}
              hint={errors['meta.durationSec'] ? undefined : s.meta.durationSec ? `≈ ${formatDuration(Number(s.meta.durationSec))}, detected from your audio` : 'Detected automatically from your audio'}
              error={errors['meta.durationSec']}
              aria-invalid={!!errors['meta.durationSec']}
            />
            <Input label="BPM" type="number" inputMode="numeric" min={1} value={s.meta.bpm} onChange={(e) => patchMeta({ bpm: e.target.value })} placeholder="120" error={errors['meta.bpm']} aria-invalid={!!errors['meta.bpm']} />
            <Input label="Sample rate (Hz)" type="number" inputMode="numeric" min={1} value={s.meta.sampleRate} onChange={(e) => patchMeta({ sampleRate: e.target.value })} placeholder="44100" error={errors['meta.sampleRate']} aria-invalid={!!errors['meta.sampleRate']} />
          </div>
          <div className="rounded-control border border-border bg-surface-2/50 px-3 py-3">
            <Switch checked={s.meta.loopable} onChange={(v) => patchMeta({ loopable: v })} label="Loops seamlessly (the player turns on Loop by default)" />
          </div>
        </Section>
      )}
      {kind === 'other' && s.category && (
        <p className="rounded-control border border-border bg-surface-2/50 px-3 py-3 text-sm text-muted">{cat?.label} don’t need extra technical details. Mention sizes and compatibility in the description.</p>
      )}
    </div>,

    // 3 pricing
    <div key="pricing" className="space-y-8">
      <Section title="Price">
        <div className="rounded-card border border-border bg-surface-2/50 p-4">
          <Switch checked={s.isFree} onChange={(v) => patch({ isFree: v })} label="Free asset: buyers claim it at no cost" />
        </div>
        {!s.isFree && (
          <div className="space-y-3">
            <div className="max-w-xs">
              <Input
                label="Price in rupees"
                type="number"
                inputMode="numeric"
                min={1}
                max={50000}
                value={s.price}
                onChange={(e) => patch({ price: e.target.value.replace(/[^\d]/g, '') })}
                leftIcon={<span className="font-mono text-sm">₹</span>}
                error={errors.price}
                aria-invalid={!!errors.price}
                placeholder="199"
              />
            </div>
            <div className="flex flex-wrap gap-2" aria-label="Price presets">
              {PRICE_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => patch({ price: String(p) })}
                  aria-pressed={s.price === String(p)}
                  className={cn('rounded-control border px-3 py-1.5 font-mono text-sm transition-colors', s.price === String(p) ? 'border-primary bg-primary-soft text-text' : 'border-border text-muted hover:border-border-strong hover:text-text')}
                >
                  ₹{p}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center gap-4 rounded-card border border-success/25 bg-success/5 p-4">
          <span className="font-mono text-2xl font-semibold text-success">{rupees(earningFor(price))}</span>
          <p className="text-sm text-muted">
            {price > 0 ? <>You earn <span className="text-text">{rupees(earningFor(price))}</span> per sale after the 10% platform fee ({rupees(price - earningFor(price))}).</> : 'Free assets earn followers, reviews and visibility instead of rupees.'}
          </p>
        </div>
      </Section>

      <Section title="License">
        <div className="grid gap-3 lg:grid-cols-3" role="radiogroup" aria-label="License">
          {LICENSES.map((l) => {
            const active = s.license === l.key
            const [name, detail] = l.label.split(' - ')
            return (
              <button
                key={l.key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => patch({ license: l.key as License })}
                className={cn('flex flex-col rounded-card border p-4 text-left transition-all duration-150', active ? 'border-primary bg-primary-soft shadow-[0_0_0_1px_rgba(139,92,246,0.5)]' : 'border-border bg-surface-2/40 hover:border-border-strong')}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-display text-sm font-semibold text-text">{name}</span>
                  <span className={cn('flex h-4 w-4 items-center justify-center rounded-full border', active ? 'border-primary' : 'border-border-strong')}>{active && <span className="h-2 w-2 rounded-full bg-primary" />}</span>
                </span>
                <span className="mt-0.5 text-xs text-subtle">{detail}</span>
                <ul className="mt-3 space-y-1.5">
                  {l.bullets.map((b) => (
                    <li key={b} className="flex gap-2 text-xs leading-snug text-muted"><Check className="mt-px h-3 w-3 shrink-0 text-success" />{b}</li>
                  ))}
                </ul>
              </button>
            )
          })}
        </div>
      </Section>
    </div>,

    // 4 review
    <div key="review" className="space-y-5">
      {([
        { step: 0, title: 'Basics', rows: [['Title', s.title], ['Category', cat?.label ?? '–'], ['Description', `${s.description.trim().slice(0, 140)}${s.description.trim().length > 140 ? '…' : ''}`]] },
        {
          step: 1,
          title: 'Media',
          rows: [
            ['Thumbnail', s.thumbnail ? `${s.thumbnail.name} · ${formatBytes(s.thumbnail.size)}` : asset ? 'Keeping current' : '–'],
            ['Previews', s.previews.length ? `${s.previews.length} new (${s.previews.filter((p) => p.kind === 'audio').length} audio)` : asset ? 'Keeping current' : kind === 'audio' ? 'None, main file used as preview' : 'None'],
            ['Main file', s.file ? `${s.file.name} · ${formatBytes(s.file.size)}` : asset ? `Keeping ${asset.fileInfo.originalName}` : '–'],
          ],
        },
        {
          step: 2,
          title: 'Details',
          rows: [
            ['Tags', s.tags.length ? s.tags.map((t) => `#${t}`).join(' ') : 'None'],
            ['Formats', s.fileFormats.length ? s.fileFormats.map((f) => `.${f}`).join(' ') : 'None'],
            ...(kind === 'image' ? [['Resolution', s.meta.resolution || '–'], ['Frames', s.meta.frames || '–']] : []),
            ...(kind === 'audio' ? [['Duration', s.meta.durationSec ? formatDuration(Number(s.meta.durationSec)) : '–'], ['BPM', s.meta.bpm || '–'], ['Loopable', s.meta.loopable ? 'Yes' : 'No']] : []),
          ],
        },
        { step: 3, title: 'Pricing', rows: [['Price', price ? rupees(price) : 'Free'], ['You earn', rupees(earningFor(price))], ['License', LICENSES.find((l) => l.key === s.license)?.label ?? s.license]] },
      ] as { step: number; title: string; rows: string[][] }[]).map((sec) => (
        <div key={sec.title} className="rounded-card border border-border">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <h3 className="text-sm font-semibold text-text">{sec.title}</h3>
            <button type="button" onClick={() => go(sec.step)} className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-text">
              <Pencil className="h-3 w-3" /> Edit
            </button>
          </div>
          <dl className="divide-y divide-border/60">
            {sec.rows.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[110px_1fr] gap-3 px-4 py-2.5 text-sm">
                <dt className="text-muted">{k}</dt>
                <dd className="min-w-0 break-words text-text">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
      <div className="lg:hidden">
        <p className="mb-2 text-xs font-medium text-muted">Card preview</p>
        <div className="pointer-events-none w-56"><AssetCard asset={previewCard} isMine /></div>
      </div>
    </div>,
  ]

  return (
    <div ref={topRef} className="scroll-mt-24">
      {draft && mode === 'create' && (
        <div className="mb-5 flex flex-col gap-3 rounded-card border border-accent/30 bg-accent/10 p-4 sm:flex-row sm:items-center">
          <History className="h-5 w-5 shrink-0 text-accent" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-text">Resume your draft?</p>
            <p className="text-muted">
              “{draft.title || 'Untitled'}” from {new Date(draft.savedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}. Files aren’t saved, so you’ll add them again.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" leftIcon={<X className="h-3.5 w-3.5" />} onClick={() => { clearDraft(); setDraft(null) }}>Discard</Button>
            <Button
              size="sm"
              leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              onClick={() => {
                const { savedAt: _savedAt, ...fields } = draft
                void _savedAt
                setS((cur) => ({ ...cur, ...fields }))
                setDraft(null)
              }}
            >
              Resume
            </Button>
          </div>
        </div>
      )}

      <div className="mb-6 rounded-panel border border-border bg-surface px-4 py-3 sm:px-5">
        <Stepper step={step} maxStep={maxStep} onGo={go} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px] xl:grid-cols-[1fr_300px]">
        <div className="min-w-0 overflow-hidden rounded-panel border border-border bg-surface">
          <div className="border-b border-border px-5 py-4 sm:px-6">
            <p className="font-pixel text-[8px] uppercase text-subtle">Step {step + 1} of {STEPS.length}</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-text">
              {['What are you selling?', 'Show it off', 'Help buyers find it', 'Set your price', 'Review and publish'][step]}
            </h2>
          </div>
          <div className="relative px-5 py-6 sm:px-6">
            <AnimatePresence mode="wait" custom={dir} initial={false}>
              <motion.div
                key={step}
                custom={dir}
                initial={reduce ? { opacity: 0 } : { opacity: 0, x: dir * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, x: dir * -40 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                {stepBody[step]}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-border bg-surface-2/40 px-5 py-4 sm:px-6">
            <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => go(step - 1)} disabled={step === 0 || busy}>
              Back
            </Button>
            {mode === 'create' && !isBlank(s) && <span className="hidden text-[11px] text-subtle sm:inline">Draft autosaved</span>}
            {step < STEPS.length - 1 ? (
              <Button rightIcon={<ArrowRight className="h-4 w-4" />} onClick={next}>Next: {STEPS[step + 1].label}</Button>
            ) : (
              <PixelButton onClick={publish} loading={busy}>
                <Upload className="h-4 w-4" /> {mode === 'create' ? 'Publish' : 'Save changes'}
              </PixelButton>
            )}
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-3">
            <p className="flex items-center gap-2 text-xs font-medium text-muted">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> Live preview
            </p>
            <div className="pointer-events-none select-none"><AssetCard asset={previewCard} isMine /></div>
            <div className="rounded-card border border-border bg-surface p-3 text-xs text-muted">
              <p className="flex justify-between"><span>Price</span><span className="font-mono text-text">{price ? rupees(price) : 'Free'}</span></p>
              <p className="mt-1.5 flex justify-between"><span>You earn / sale</span><span className="font-mono text-success">{rupees(earningFor(price))}</span></p>
            </div>
          </div>
        </aside>
      </div>

      {busy && <UploadOverlay progress={progress ?? 0} mode={mode} />}
    </div>
  )
}
