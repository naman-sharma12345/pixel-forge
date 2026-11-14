import { api, isApiClientError } from '@/api'
import { toast } from 'react-hot-toast'

/**
 * Fetches a short-lived signed URL for an owned asset and triggers a
 * browser download through a temporary anchor. Returns true on success.
 */
export async function downloadAsset(assetId: string): Promise<boolean> {
  try {
    const info = await api.downloads.get(assetId)
    const token = info.url.includes('/file/') ? info.url.split('/file/').pop()! : info.url
    const { blobUrl, fileName } = await api.downloads.file(token)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000)
    return true
  } catch (err) {
    toast.error(isApiClientError(err) ? err.message : 'Download failed')
    return false
  }
}
