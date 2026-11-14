import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
    mutationFn: (file: File) => api.users.uploadAvatar(file),
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
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: async ({ assetId, inWishlist }: { assetId: string; inWishlist: boolean }) => {
      if (inWishlist) return api.users.removeWishlist(assetId)
      return api.users.addWishlist(assetId)
    },
    onSuccess: (data) => {
      if (user) {
        useAuthStore.getState().setSession({ ...user, wishlist: data.wishlist }, useAuthStore.getState().accessToken!)
      }
      qc.invalidateQueries({ queryKey: keys.user.wishlist })
      qc.invalidateQueries({ queryKey: ['assets'] })
    },
    onError: (e) => {
      if (isApiClientError(e) && e.status === 401) {
        // handled globally
      }
    },
  })
}
