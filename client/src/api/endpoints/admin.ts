import { apiGetList, apiPatch, apiGet, type ListResult } from '../client'
import type {
  AdminAssetParams,
  AdminAssetUpdateBody,
  AdminStats,
  AdminUser,
  AdminUserParams,
  AdminUserUpdateBody,
  MyAsset,
} from '@/types/api'

export interface AdminApi {
  stats(): Promise<AdminStats>
  users(params?: AdminUserParams): Promise<ListResult<AdminUser>>
  updateUser(id: string, body: AdminUserUpdateBody): Promise<AdminUser>
  assets(params?: AdminAssetParams): Promise<ListResult<MyAsset>>
  updateAsset(id: string, body: AdminAssetUpdateBody): Promise<MyAsset>
}

export const admin: AdminApi = {
  stats: () => apiGet('/admin/stats'),
  users: (params) => apiGetList('/admin/users', params as Record<string, unknown>),
  updateUser: (id, body) => apiPatch(`/admin/users/${id}`, body),
  assets: (params) => apiGetList('/admin/assets', params as Record<string, unknown>),
  updateAsset: (id, body) => apiPatch(`/admin/assets/${id}`, body),
}
