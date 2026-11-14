import { apiDelete, apiPatch, apiPost, http } from '../client'
import type { CreateReviewBody, Envelope, Meta, Review, ReviewList, ReviewListParams, UpdateReviewBody } from '@/types/api'

export interface ReviewListResult extends ReviewList {
  meta: Meta
}

export interface ReviewsApi {
  list(params: ReviewListParams): Promise<ReviewListResult>
  create(body: CreateReviewBody): Promise<Review>
  update(id: string, body: UpdateReviewBody): Promise<Review>
  remove(id: string): Promise<null>
}

export const reviews: ReviewsApi = {
  list: async (params) => {
    const res = await http.get<Envelope<ReviewList>>('/reviews', { params: { ...params } })
    return { ...res.data.data, meta: res.data.meta ?? { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false } }
  },
  create: (body) => apiPost('/reviews', body),
  update: (id, body) => apiPatch(`/reviews/${id}`, body),
  remove: (id) => apiDelete(`/reviews/${id}`),
}
