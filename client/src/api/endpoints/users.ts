import { apiDelete, apiGet, apiPatch, apiPost, apiUpload } from '../client'
import type { AssetCard, PublicUserStats, UpdateMeBody, UpdatePasswordBody, UserMe, UserPublic } from '@/types/api'

export interface UsersApi {
  me(): Promise<UserMe>
  updateMe(body: UpdateMeBody): Promise<UserMe>
  uploadAvatar(file: File): Promise<UserMe>
  updatePassword(body: UpdatePasswordBody): Promise<null>
  becomeCreator(): Promise<UserMe>
  wishlist(): Promise<AssetCard[]>
  addWishlist(assetId: string): Promise<{ wishlist: string[] }>
  removeWishlist(assetId: string): Promise<{ wishlist: string[] }>
  byUsername(username: string): Promise<{ user: UserPublic; stats: PublicUserStats }>
}

export const users: UsersApi = {
  me: () => apiGet('/users/me'),
  updateMe: (body) => apiPatch('/users/me', body),
  uploadAvatar: (file) => {
    const fd = new FormData()
    fd.append('avatar', file)
    return apiUpload('/users/me/avatar', fd)
  },
  updatePassword: (body) => apiPatch('/users/me/password', body),
  becomeCreator: () => apiPost('/users/me/become-creator'),
  wishlist: () => apiGet('/users/me/wishlist'),
  addWishlist: (assetId) => apiPost(`/users/me/wishlist/${assetId}`),
  removeWishlist: (assetId) => apiDelete(`/users/me/wishlist/${assetId}`),
  byUsername: (username) => apiGet(`/users/${encodeURIComponent(username)}`),
}
