import { apiPost } from '../client'
import type { ConfirmResult, MockConfirmBody } from '@/types/api'

export interface PaymentsApi {
  mockConfirm(body: MockConfirmBody): Promise<ConfirmResult>
}

export const payments: PaymentsApi = {
  mockConfirm: (body) => apiPost('/payments/mock/confirm', body),
}
