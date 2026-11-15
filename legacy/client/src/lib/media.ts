const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api'
const API_ORIGIN = API_URL.replace(/\/api\/?$/, '')

/**
 * Resolve an asset/media URL. Absolute URLs (http, blob, data) pass through;
 * server-relative paths like '/uploads/...' are prefixed with the API origin.
 */
export function mediaUrl(url: string | null | undefined): string {
  if (!url) return ''
  if (/^(https?:|blob:|data:)/i.test(url)) return url
  if (url.startsWith('/')) return `${API_ORIGIN}${url}`
  return url
}

export { API_URL, API_ORIGIN }
