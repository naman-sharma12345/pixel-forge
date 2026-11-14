import { apiDelete, apiGet, apiGetList, apiUpload, type ListResult } from '../client'
import type {
  AssetCard,
  AssetDetail,
  AssetHome,
  AssetListParams,
  CategoryCount,
  CreateAssetBody,
  MyAsset,
  MyAssetsParams,
  TagCount,
  UpdateAssetBody,
} from '@/types/api'

export interface AssetsApi {
  list(params?: AssetListParams): Promise<ListResult<AssetCard>>
  home(): Promise<AssetHome>
  categories(): Promise<CategoryCount[]>
  tags(): Promise<TagCount[]>
  mine(params?: MyAssetsParams): Promise<ListResult<MyAsset>>
  bySlug(slug: string): Promise<AssetDetail>
  related(slug: string): Promise<AssetCard[]>
  create(body: CreateAssetBody, files: { thumbnail: File; previews?: File[]; file: File }, onProgress?: (p: number) => void): Promise<AssetDetail>
  update(id: string, body: UpdateAssetBody, files?: { thumbnail?: File; previews?: File[]; file?: File }, onProgress?: (p: number) => void): Promise<AssetDetail>
  remove(id: string): Promise<null>
}

function appendAssetFields(fd: FormData, body: CreateAssetBody | UpdateAssetBody, files?: { thumbnail?: File; previews?: File[]; file?: File }) {
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined || value === null || value === '') continue
    fd.append(key, String(value))
  }
  if (files?.thumbnail) fd.append('thumbnail', files.thumbnail)
  files?.previews?.forEach((f) => fd.append('previews', f))
  if (files?.file) fd.append('file', files.file)
  return fd
}

export const assets: AssetsApi = {
  list: (params) => apiGetList('/assets', params as Record<string, unknown>),
  home: () => apiGet('/assets/home'),
  categories: () => apiGet('/assets/categories'),
  tags: () => apiGet('/assets/tags'),
  mine: (params) => apiGetList('/assets/mine', params as Record<string, unknown>),
  bySlug: (slug) => apiGet(`/assets/${encodeURIComponent(slug)}`),
  related: (slug) => apiGet(`/assets/${encodeURIComponent(slug)}/related`),
  create: (body, files, onProgress) => apiUpload('/assets', appendAssetFields(new FormData(), body, files), onProgress, 'post'),
  update: (id, body, files, onProgress) => apiUpload(`/assets/${id}`, appendAssetFields(new FormData(), body, files), onProgress, 'patch'),
  remove: (id) => apiDelete(`/assets/${id}`),
}
