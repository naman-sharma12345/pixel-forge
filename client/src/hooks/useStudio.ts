import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api'
import { keys } from './keys'
import type { AdminAssetParams, AdminAssetUpdateBody, AdminUserParams, AdminUserUpdateBody, CreatorRange } from '@/types/api'

export function useCreatorStats(range: CreatorRange = '30d') {
  return useQuery({ queryKey: keys.creator.stats(range), queryFn: () => api.creator.stats(range) })
}

export function useCreatorSales(page = 1) {
  return useQuery({ queryKey: keys.creator.sales(page), queryFn: () => api.creator.sales({ page, limit: 20 }) })
}

export function useAdminStats() {
  return useQuery({ queryKey: keys.admin.stats, queryFn: () => api.admin.stats() })
}

export function useAdminUsers(params?: AdminUserParams) {
  return useQuery({ queryKey: keys.admin.users(params), queryFn: () => api.admin.users(params) })
}

export function useAdminAssets(params?: AdminAssetParams) {
  return useQuery({ queryKey: keys.admin.assets(params), queryFn: () => api.admin.assets(params) })
}

export function useAdminUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminUserUpdateBody }) => api.admin.updateUser(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useAdminUpdateAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: AdminAssetUpdateBody }) => api.admin.updateAsset(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'assets'] })
      qc.invalidateQueries({ queryKey: ['assets'] })
    },
  })
}
