/**
 * Upload rules mirrored from server/src/middleware/upload.js so the wizard
 * rejects the same files the server would, with a clear inline explanation.
 */
export const MAX_FILE_BYTES = 25 * 1024 * 1024
export const MAX_PREVIEWS = 6
export const PLATFORM_FEE_PERCENT = 10

export const IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
export const AUDIO_MIMES = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm']
export const PREVIEW_MIMES = [...IMAGE_MIMES, ...AUDIO_MIMES]

export const PRODUCT_EXTENSIONS = [
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'psd', 'aseprite', 'ase',
  'zip', '7z', 'rar', 'wav', 'mp3', 'ogg', 'flac', 'ttf', 'otf', 'woff',
  'woff2', 'glb', 'gltf', 'fbx', 'obj', 'blend', 'tmx', 'tsx', 'json',
  'txt', 'pdf',
]

export function extOf(name: string) {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}

export function checkSize(file: File): string | null {
  return file.size > MAX_FILE_BYTES ? `“${file.name}” is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 25 MB per file.` : null
}

export function checkThumbnail(file: File): string | null {
  if (!IMAGE_MIMES.includes(file.type)) return `“${file.name}” isn’t a PNG, JPG, WebP or GIF image.`
  return checkSize(file)
}

export function checkPreview(file: File): string | null {
  if (!PREVIEW_MIMES.includes(file.type)) return `“${file.name}” isn’t supported. Previews can be PNG, JPG, WebP, GIF, MP3, WAV, OGG or WebM.`
  return checkSize(file)
}

export function checkProduct(file: File): string | null {
  const ext = extOf(file.name)
  if (!PRODUCT_EXTENSIONS.includes(ext)) {
    return `.${ext || '?'} files can’t be sold here. Allowed: ${PRODUCT_EXTENSIONS.map((e) => `.${e}`).join(' ')}. Tip: put anything else inside a .zip.`
  }
  return checkSize(file)
}

export function earningFor(price: number) {
  return price - Math.round((price * PLATFORM_FEE_PERCENT) / 100)
}

export type FileKind = 'archive' | 'image' | 'audio' | 'font' | 'model' | 'doc'

export function fileKind(name: string): FileKind {
  const e = extOf(name)
  if (['zip', '7z', 'rar'].includes(e)) return 'archive'
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'psd', 'aseprite', 'ase'].includes(e)) return 'image'
  if (['wav', 'mp3', 'ogg', 'flac'].includes(e)) return 'audio'
  if (['ttf', 'otf', 'woff', 'woff2'].includes(e)) return 'font'
  if (['glb', 'gltf', 'fbx', 'obj', 'blend'].includes(e)) return 'model'
  return 'doc'
}
