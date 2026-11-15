import { CATEGORY_MAP } from '@/lib/constants'
import type { AssetDetail, Category, CreateAssetBody, License, MediaKind, UpdateAssetBody } from '@/types/api'
import { checkPreview, checkProduct, checkThumbnail, MAX_PREVIEWS } from './rules'

export interface PreviewItem {
  id: string
  file: File
  url: string
  kind: 'image' | 'audio'
}

export interface MetaFields {
  resolution: string
  frames: string
  durationSec: string
  bpm: string
  loopable: boolean
  sampleRate: string
}

export interface WizardState {
  title: string
  description: string
  category: Category | ''
  tags: string[]
  fileFormats: string[]
  meta: MetaFields
  isFree: boolean
  price: string
  license: License
  thumbnail: File | null
  previews: PreviewItem[]
  file: File | null
}

export const STEPS = [
  { key: 'basics', label: 'Basics' },
  { key: 'media', label: 'Media' },
  { key: 'details', label: 'Details' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'review', label: 'Review' },
] as const

export type Errors = Partial<Record<string, string>>

export const EMPTY_META: MetaFields = { resolution: '', frames: '', durationSec: '', bpm: '', loopable: false, sampleRate: '' }

export function blankState(): WizardState {
  return {
    title: '',
    description: '',
    category: '',
    tags: [],
    fileFormats: [],
    meta: { ...EMPTY_META },
    isFree: false,
    price: '',
    license: 'standard',
    thumbnail: null,
    previews: [],
    file: null,
  }
}

export function mediaKindOf(category: Category | ''): MediaKind {
  return category ? CATEGORY_MAP.get(category)?.mediaKind ?? 'image' : 'image'
}

export function fromDetail(a: AssetDetail): WizardState {
  const m = a.meta ?? {}
  return {
    title: a.title,
    description: a.description,
    category: a.category,
    tags: [...a.tags],
    fileFormats: [...a.fileFormats],
    meta: {
      resolution: m.resolution ?? '',
      frames: m.frames !== undefined && m.frames !== null ? String(m.frames) : '',
      durationSec: m.durationSec !== undefined && m.durationSec !== null ? String(m.durationSec) : '',
      bpm: m.bpm !== undefined && m.bpm !== null ? String(m.bpm) : '',
      loopable: !!m.loopable,
      sampleRate: m.sampleRate !== undefined && m.sampleRate !== null ? String(m.sampleRate) : '',
    },
    isFree: a.price === 0,
    price: a.price === 0 ? '' : String(a.price),
    license: a.license,
    thumbnail: null,
    previews: [],
    file: null,
  }
}

// ---------------------------------------------------------------------------
// validation (mirrors the contract: title 3-80, description 20-5000, tags <=10 x 24,
// price integer 0-50000)
// ---------------------------------------------------------------------------

export function validateStep(step: number, s: WizardState, mode: 'create' | 'edit'): Errors {
  const e: Errors = {}
  if (step === 0) {
    const t = s.title.trim()
    if (t.length < 3) e.title = 'Give it a title of at least 3 characters'
    else if (t.length > 80) e.title = 'Keep the title to 80 characters or fewer'
    if (!s.category) e.category = 'Pick the category buyers will find it in'
    const d = s.description.trim()
    if (d.length < 20) e.description = `Describe what’s included (${Math.max(0, 20 - d.length)} more characters needed)`
    else if (d.length > 5000) e.description = 'Keep the description to 5,000 characters or fewer'
  }
  if (step === 1) {
    if (mode === 'create' && !s.thumbnail) e.thumbnail = 'Add a thumbnail. It’s the first thing buyers see.'
    else if (s.thumbnail) {
      const msg = checkThumbnail(s.thumbnail)
      if (msg) e.thumbnail = msg
    }
    if (mode === 'create' && !s.file) e.file = 'Add the file buyers will download'
    else if (s.file) {
      const msg = checkProduct(s.file)
      if (msg) e.file = msg
    }
    if (s.previews.length > MAX_PREVIEWS) e.previews = `Up to ${MAX_PREVIEWS} previews`
    const bad = s.previews.map((p) => checkPreview(p.file)).find(Boolean)
    if (bad) e.previews = bad
  }
  if (step === 2) {
    if (s.tags.length > 10) e.tags = 'Use at most 10 tags'
    if (s.tags.some((t) => t.length > 24)) e.tags = 'Each tag must be 24 characters or fewer'
    const intField = (k: 'frames' | 'bpm' | 'sampleRate', label: string, min: number) => {
      const v = s.meta[k].trim()
      if (v && (!/^\d+$/.test(v) || Number(v) < min)) e[`meta.${k}`] = `${label} must be a whole number${min ? ` of at least ${min}` : ''}`
    }
    intField('frames', 'Frames', 1)
    intField('bpm', 'BPM', 1)
    intField('sampleRate', 'Sample rate', 1)
    const dur = s.meta.durationSec.trim()
    if (dur && (Number.isNaN(Number(dur)) || Number(dur) < 0)) e['meta.durationSec'] = 'Duration must be a positive number of seconds'
    if (s.meta.resolution && !/^\d{1,5}\s*[x×]\s*\d{1,5}$/i.test(s.meta.resolution.trim())) e['meta.resolution'] = 'Use the form 32x32'
  }
  if (step === 3 && !s.isFree) {
    const p = s.price.trim()
    if (!p) e.price = 'Set a price, or switch on Free'
    else if (!/^\d+$/.test(p)) e.price = 'Use whole rupees, no decimals'
    else if (Number(p) < 1 || Number(p) > 50000) e.price = 'Price must be between ₹1 and ₹50,000'
  }
  return e
}

export function validateAll(s: WizardState, mode: 'create' | 'edit') {
  for (let i = 0; i < 4; i++) {
    const e = validateStep(i, s, mode)
    if (Object.keys(e).length) return { step: i, errors: e }
  }
  return null
}

// ---------------------------------------------------------------------------
// body building
// ---------------------------------------------------------------------------

export function metaObject(s: WizardState): Record<string, string | number | boolean> {
  const kind = mediaKindOf(s.category)
  const m = s.meta
  const out: Record<string, string | number | boolean> = {}
  if (kind === 'image') {
    if (m.resolution.trim()) out.resolution = m.resolution.trim().replace(/\s*[x×]\s*/i, 'x')
    if (m.frames.trim()) out.frames = Number(m.frames)
  }
  if (kind === 'audio') {
    if (m.durationSec.trim()) out.durationSec = Math.round(Number(m.durationSec) * 10) / 10
    if (m.bpm.trim()) out.bpm = Number(m.bpm)
    out.loopable = m.loopable
    if (m.sampleRate.trim()) out.sampleRate = Number(m.sampleRate)
  }
  return out
}

export function priceOf(s: WizardState) {
  return s.isFree ? 0 : Number(s.price || 0)
}

/** Create body in exact contract key order. */
export function buildCreateBody(s: WizardState): CreateAssetBody {
  return {
    title: s.title.trim(),
    description: s.description.trim(),
    category: s.category as Category,
    tags: s.tags.join(','),
    price: priceOf(s),
    license: s.license,
    fileFormats: s.fileFormats.join(','),
    meta: JSON.stringify(metaObject(s)),
  }
}

/** Only the fields that differ from the original asset. */
export function buildUpdateBody(s: WizardState, original: WizardState): UpdateAssetBody {
  const body: UpdateAssetBody = {}
  const next = buildCreateBody(s)
  const prev = buildCreateBody(original)
  ;(Object.keys(next) as (keyof CreateAssetBody)[]).forEach((k) => {
    if (String(next[k]) !== String(prev[k])) (body as Record<string, unknown>)[k] = next[k]
  })
  return body
}

/** Which step a server field error belongs to. */
export const FIELD_STEP: Record<string, number> = {
  title: 0, description: 0, category: 0,
  thumbnail: 1, previews: 1, file: 1,
  tags: 2, fileFormats: 2, meta: 2,
  price: 3, license: 3,
}

// ---------------------------------------------------------------------------
// draft persistence (text fields only, never files)
// ---------------------------------------------------------------------------

const DRAFT_KEY = 'pf_upload_draft_v1'

type DraftFields = Pick<WizardState, 'title' | 'description' | 'category' | 'tags' | 'fileFormats' | 'meta' | 'isFree' | 'price' | 'license'>

export function saveDraft(s: WizardState) {
  const d: DraftFields & { savedAt: string } = {
    title: s.title, description: s.description, category: s.category, tags: s.tags, fileFormats: s.fileFormats,
    meta: s.meta, isFree: s.isFree, price: s.price, license: s.license, savedAt: new Date().toISOString(),
  }
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)) } catch { /* storage unavailable */ }
}

export function loadDraft(): (DraftFields & { savedAt: string }) | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const d = JSON.parse(raw) as DraftFields & { savedAt: string }
    if (!d.title && !d.description) return null
    return { ...d, meta: { ...EMPTY_META, ...d.meta } }
  } catch {
    return null
  }
}

export function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY) } catch { /* storage unavailable */ }
}

export function isBlank(s: WizardState) {
  return !s.title && !s.description && !s.category && !s.tags.length
}
