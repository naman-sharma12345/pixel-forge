import { apiPost, apiDelete } from '../client'
import type { UserMe } from '@/types/api'
import type { LoginBody, RegisterBody } from '@/types/api'

export interface AuthApi {
  register(body: RegisterBody): Promise<{ user: UserMe; accessToken: string }>
  login(body: LoginBody): Promise<{ user: UserMe; accessToken: string }>
  refresh(): Promise<{ user: UserMe; accessToken: string }>
  logout(): Promise<null>
}

export const auth: AuthApi = {
  register: (body) => apiPost('/auth/register', body),
  login: (body) => apiPost('/auth/login', body),
  refresh: () => apiPost('/auth/refresh'),
  logout: () => apiDelete('/auth/logout'),
}
