import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { api, isApiClientError } from '@/api'
import { keys } from './keys'
import { useAuthStore } from '@/stores/auth'
import type { LoginBody, RegisterBody, UpdateMeBody, UpdatePasswordBody } from '@/types/api'

export function useMe() {
  const status = useAuthStore((s) => s.status)
  return useQuery({
    queryKey: keys.auth.me,
    queryFn: () => api.users.me(),
    enabled: status === 'authed',
    staleTime: 30_000,
  })
}

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: LoginBody) => api.auth.login(body),
    onSuccess: (data) => {
      useAuthStore.getState().setSession(data.user, data.accessToken)
      qc.setQueryData(keys.auth.me, data.user)
      qc.invalidateQueries()
    },
  })
}

export function useRegister() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: RegisterBody) => api.auth.register(body),
    onSuccess: (data) => {
      useAuthStore.getState().setSession(data.user, data.accessToken)
      qc.setQueryData(keys.auth.me, data.user)
      qc.invalidateQueries()
    },
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.auth.logout(),
    onSettled: () => {
      useAuthStore.getState().clear()
      qc.clear()
    },
  })
}

export function useUpdateMe() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateMeBody) => api.users.updateMe(body),
    onSuccess: (user) => {
      useAuthStore.getState().setSession(user, useAuthStore.getState().accessToken!)
      qc.setQueryData(keys.auth.me, user)
    },
  })
}

export function useUploadAvatar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, onProgress }: { file: File; onProgress?: (p: number) => void }) => api.users.uploadAvatar(file, onProgress),
    onSuccess: (user) => {
      useAuthStore.getState().setSession(user, useAuthStore.getState().accessToken!)
      qc.setQueryData(keys.auth.me, user)
    },
  })
}

export function useUpdatePassword() {
  return useMutation({
    mutationFn: (body: UpdatePasswordBody) => api.users.updatePassword(body),
  })
}

export function useBecomeCreator() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.users.becomeCreator(),
    onSuccess: (user) => {
      useAuthStore.getState().setSession(user, useAuthStore.getState().accessToken!)
      qc.setQueryData(keys.auth.me, user)
    },
  })
}

export function useWishlist() {
  const status = useAuthStore((s) => s.status)
  return useQuery({
    queryKey: keys.user.wishlist,
    queryFn: () => api.users.wishlist(),
    enabled: status === 'authed',
  })
}

export function useToggleWishlist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ assetId, inWishlist }: { assetId: string; inWishlist: boolean }) => {
      if (inWishlist) return api.users.removeWishlist(assetId)
      return api.users.addWishlist(assetId)
    },
    onMutate: ({ assetId, inWishlist }) => {
      const prev = useAuthStore.getState().user
      if (prev) {
        const wishlist = inWishlist
          ? prev.wishlist.filter((id) => id !== assetId)
          : prev.wishlist.includes(assetId) ? prev.wishlist : [...prev.wishlist, assetId]
        useAuthStore.getState().setSession({ ...prev, wishlist }, useAuthStore.getState().accessToken!)
      }
      return { prev }
    },
    onSuccess: (data) => {
      const current = useAuthStore.getState().user
      if (current) {
        useAuthStore.getState().setSession({ ...current, wishlist: data.wishlist }, useAuthStore.getState().accessToken!)
      }
      qc.invalidateQueries({ queryKey: keys.user.wishlist })
      qc.invalidateQueries({ queryKey: ['assets'] })
    },
    onError: (e, _v, ctx) => {
      const token = useAuthStore.getState().accessToken
      if (ctx?.prev && token) {
        useAuthStore.getState().setSession(ctx.prev, token)
      }
      if (isApiClientError(e)) toast.error(e.message)
    },
  })
}
