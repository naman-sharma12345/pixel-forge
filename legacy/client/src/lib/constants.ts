import {
  Grid3x3,
  User,
  LayoutTemplate,
  Image,
  Sparkles,
  Type,
  Box,
  AudioLines,
  Music,
  type LucideIcon,
} from 'lucide-react'
import type { Category, License, MediaKind } from '@/types/api'

export interface CategoryInfo {
  key: Category
  label: string
  icon: LucideIcon
  mediaKind: MediaKind
  blurb: string
}

export const CATEGORIES: CategoryInfo[] = [
  { key: 'sprites', label: 'Sprites', icon: Sparkles, mediaKind: 'image', blurb: 'Characters, items and effects ready for your engine.' },
  { key: 'tilesets', label: 'Tilesets', icon: Grid3x3, mediaKind: 'image', blurb: 'Seamless tiles and autotiles for every biome.' },
  { key: 'characters', label: 'Characters', icon: User, mediaKind: 'image', blurb: 'Animated rigs, portraits and NPC sheets.' },
  { key: 'ui', label: 'UI Kits', icon: LayoutTemplate, mediaKind: 'image', blurb: 'Menus, HUDs and dialog boxes with a cohesive style.' },
  { key: 'backgrounds', label: 'Backgrounds', icon: Image, mediaKind: 'image', blurb: 'Parallax scenes and painted backdrops.' },
  { key: 'vfx', label: 'VFX', icon: Sparkles, mediaKind: 'image', blurb: 'Particle sheets and shader-ready effects.' },
  { key: 'fonts', label: 'Fonts', icon: Type, mediaKind: 'other', blurb: 'Pixel and display fonts for every language.' },
  { key: '3d', label: '3D Models', icon: Box, mediaKind: 'other', blurb: 'Low-poly models with clean topology.' },
  { key: 'sfx', label: 'Sound Effects', icon: AudioLines, mediaKind: 'audio', blurb: 'UI blips, impacts and ambience loops.' },
  { key: 'music', label: 'Music', icon: Music, mediaKind: 'audio', blurb: 'Chiptune and synth loops for your soundtrack.' },
]

export const CATEGORY_MAP = new Map(CATEGORIES.map((c) => [c.key, c]))

export function categoryLabel(key: Category): string {
  return CATEGORY_MAP.get(key)?.label ?? key
}

export interface LicenseInfo {
  key: License
  label: string
  bullets: [string, string, string]
}

export const LICENSES: LicenseInfo[] = [
  {
    key: 'cc0',
    label: 'CC0 - Public domain',
    bullets: [
      'Use it in any project, commercial or not.',
      'No credit required, ever.',
      'You can modify and redistribute it freely.',
    ],
  },
  {
    key: 'standard',
    label: 'Standard - Commercial use in games, no resale',
    bullets: [
      'Use it in games and apps you sell or give away.',
      'Do not resell or redistribute the raw files.',
      'Credit is appreciated but not required.',
    ],
  },
  {
    key: 'extended',
    label: 'Extended - Commercial use plus redistribution',
    bullets: [
      'Everything in Standard, plus redistribution rights.',
      'You may share the files inside bundles or templates.',
      'Still cannot resell the assets as-is.',
    ],
  },
]

export const LICENSE_MAP = new Map(LICENSES.map((l) => [l.key, l]))

export function licenseLabel(key: License): string {
  return LICENSE_MAP.get(key)?.label ?? key
}

export const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Popular' },
  { value: 'top-rated', label: 'Top rated' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
]

export const EMPTY_SOCIALS = { website: '', twitter: '', itchio: '', github: '' }
