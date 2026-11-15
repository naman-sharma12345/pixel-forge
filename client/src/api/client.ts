import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import { API_URL } from '@/lib/media'
import { useAuthStore } from '@/stores/auth'
import type { Envelope, Meta, ApiErrorDetail } from '@/types/api'

export class ApiClientError extends Error {
  status: number
  code: string
  details?: ApiErrorDetail[]

  constructor(status: number, code: string, message: string, details?: ApiErrorDetail[]) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export function isApiClientError(e: unknown): e is ApiClientError {
  return e instanceof ApiClientError
}

export const http: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 20_000,
})

// ---- request interceptor: attach bearer token ----
http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ---- refresh plumbing ----
let refreshPromise: Promise<{ accessToken: string; user: unknown }> | null = null
let refreshFailed = false

async function performRefresh(): Promise<{ accessToken: string; user: unknown }> {
  // cookie-based; no body needed
  const res = await axios.post<Envelope<{ user: never; accessToken: string }>>(
    `${API_URL}/auth/refresh`,
    {},
    { withCredentials: true, timeout: 20_000 },
  )
  return { accessToken: res.data.data.accessToken, user: res.data.data.user }
}

export function refreshSession(): Promise<{ accessToken: string; user: unknown }> {
  if (!refreshPromise) {
    refreshPromise = performRefresh()
      .then((session) => {
        refreshFailed = false
        const { setSession } = useAuthStore.getState()
        // user shape is UserMe; store typing accepts it
        setSession(session.user as never, session.accessToken)
        return session
      })
      .catch((err) => {
        refreshFailed = true
        useAuthStore.getState().clear()
        const next = encodeURIComponent(window.location.pathname + window.location.search)
        if (!window.location.pathname.startsWith('/login')) {
          window.location.assign(`/login?next=${next}`)
        }
        throw err
      })
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

function redirectToLogin() {
  useAuthStore.getState().clear()
  const next = encodeURIComponent(window.location.pathname + window.location.search)
  if (!window.location.pathname.startsWith('/login')) {
    window.location.assign(`/login?next=${next}`)
  }
}

// ---- response interceptor: unwrap + 401 refresh retry ----
http.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
    const status = error.response?.status ?? 0
    const body = error.response?.data as { error?: { code?: string; message?: string; details?: ApiErrorDetail[] } } | undefined
    const code = body?.error?.code ?? 'INTERNAL_ERROR'
    const message = body?.error?.message ?? error.message ?? 'Something went wrong'
    const details = body?.error?.details

    const apiError = new ApiClientError(status, code, message, details)

    if (status === 401 && code === 'TOKEN_EXPIRED' && original && !original._retried && !refreshFailed) {
      original._retried = true
      try {
        await refreshSession()
        return http(original)
      } catch {
        redirectToLogin()
        throw apiError
      }
    }

    if (status === 401 && (code === 'UNAUTHORIZED' || code === 'TOKEN_EXPIRED')) {
      // only hard-logout when the request actually carried a token
      if (useAuthStore.getState().accessToken) redirectToLogin()
    }

    throw apiError
  },
)

// ---- unwrap helpers ----
export interface ListResult<T> {
  items: T[]
  meta: Meta
}

export async function apiGet<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await http.get<Envelope<T>>(url, { params })
  return res.data.data
}

export async function apiGetList<T>(url: string, params?: Record<string, unknown>): Promise<ListResult<T>> {
  const res = await http.get<Envelope<T[]>>(url, { params })
  const meta = res.data.meta ?? { page: 1, limit: res.data.data.length, total: res.data.data.length, totalPages: 1, hasNext: false }
  return { items: res.data.data, meta }
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const res = await http.post<Envelope<T>>(url, body)
  return res.data.data
}

export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const res = await http.patch<Envelope<T>>(url, body)
  return res.data.data
}

export async function apiDelete<T>(url: string): Promise<T> {
  const res = await http.delete<Envelope<T>>(url)
  return res.data.data
}

export async function apiUpload<T>(
  url: string,
  formData: FormData,
  onProgress?: (percent: number) => void,
  method: 'post' | 'patch' = 'post',
): Promise<T> {
  const config: AxiosRequestConfig = {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
    },
  }
  const res =
    method === 'post'
      ? await http.post<Envelope<T>>(url, formData, config)
      : await http.patch<Envelope<T>>(url, formData, config)
  return res.data.data
}
