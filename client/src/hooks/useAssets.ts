import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api'
import { keys } from './keys'
import type { AssetListParams, MyAssetsParams } from '@/types/api'

export function useAssetList(params?: AssetListParams) {
  return useQuery({
    queryKey: keys.assets.list(params),
    queryFn: () => api.assets.list(params),
    placeholderData: (prev) => prev,
  })
}

export function useAssetHome() {
  return useQuery({ queryKey: keys.assets.home, queryFn: () => api.assets.home(), staleTime: 60_000 })
}

export function useAssetCategories() {
  return useQuery({ queryKey: keys.assets.categories, queryFn: () => api.assets.categories(), staleTime: 120_000 })
}

export function useAssetTags() {
  return useQuery({ queryKey: keys.assets.tags, queryFn: () => api.assets.tags(), staleTime: 120_000 })
}

export function useMyAssets(params?: MyAssetsParams) {
  return useQuery({ queryKey: keys.assets.mine(params), queryFn: () => api.assets.mine(params) })
}

export function useAssetDetail(slug: string | undefined) {
  return useQuery({
    queryKey: keys.assets.detail(slug ?? ''),
    queryFn: () => api.assets.bySlug(slug!),
    enabled: !!slug,
  })
}

export function useRelatedAssets(slug: string | undefined) {
  return useQuery({
    queryKey: keys.assets.related(slug ?? ''),
    queryFn: () => api.assets.related(slug!),
    enabled: !!slug,
  })
}

export function useCreateAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ body, files, onProgress }: {
      body: Parameters<typeof api.assets.create>[0]
      files: Parameters<typeof api.assets.create>[1]
      onProgress?: (p: number) => void
    }) => api.assets.create(body, files, onProgress),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  })
}

export function useUpdateAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body, files, onProgress }: {
      id: string
      body: Parameters<typeof api.assets.update>[1]
      files?: Parameters<typeof api.assets.update>[2]
      onProgress?: (p: number) => void
    }) => api.assets.update(id, body, files, onProgress),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  })
}

export function useDeleteAsset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.assets.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  })
}
