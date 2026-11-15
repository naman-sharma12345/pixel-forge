import { http } from '../client'
import type { DownloadInfo, Envelope } from '@/types/api'
import type { AxiosResponse } from 'axios'

export interface DownloadsApi {
  get(assetId: string): Promise<DownloadInfo>
  /** Streams the private file through a short-lived token. Returns a blob URL. */
  file(token: string): Promise<{ blobUrl: string; fileName: string }>
}

export const downloads: DownloadsApi = {
  get: async (assetId) => {
    const res = await http.get<Envelope<DownloadInfo>>(`/downloads/${assetId}`)
    return res.data.data
  },
  file: async (token) => {
    const res: AxiosResponse<Blob> = await http.get(`/downloads/file/${token}`, { responseType: 'blob' })
    const blobUrl = URL.createObjectURL(res.data)
    const disposition = res.headers['content-disposition'] as string | undefined
    const match = disposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i)
    const fileName = match ? decodeURIComponent(match[1]) : 'download'
    return { blobUrl, fileName }
  },
}
