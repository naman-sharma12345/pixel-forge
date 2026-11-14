import { useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { Pencil, Star, Trash2 } from 'lucide-react'
import { api, isApiClientError } from '@/api'
import { Avatar, Button, Card, Modal, RatingStars, Skeleton, Textarea } from '@/components/ui'
import { useAuthStore } from '@/stores/auth'
import { timeAgo } from '@/lib/format'
import type { AssetDetail, Review } from '@/types/api'

export function ReviewForm({
  initial,
  onSubmit,
  pending,
  submitLabel,
}: {
  initial?: Review
  onSubmit: (rating: number, comment: string) => void
  pending: boolean
  submitLabel: string
}) {
  const [rating, setRating] = useState(initial?.rating ?? 0)
  const [comment, setComment] = useState(initial?.comment ?? '')
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-1.5 text-sm font-medium text-text">Your rating</p>
        <RatingStars value={rating} onChange={setRating} size={26} />
      </div>
      <Textarea
        label="Comment (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={1000}
        counter
        placeholder="What did you think?"
      />
      <div className="flex justify-end gap-2">
        <Button disabled={rating < 1 || pending} loading={pending} onClick={() => onSubmit(rating, comment.trim())}>
          {submitLabel}
        </Button>
      </div>
    </div>
  )
}

function Summary({ avg, count, distribution }: { avg: number; count: number; distribution: Record<number, number> }) {
  const reduce = useReducedMotion()
  const total = Math.max(1, count)
  return (
    <div className="grid gap-6 sm:grid-cols-[160px_1fr] sm:items-center">
      <div className="flex flex-col items-center rounded-card bg-surface-2/60 px-4 py-5 text-center">
        <p className="font-display text-5xl font-bold tracking-tight text-text">{count ? avg.toFixed(1) : '–'}</p>
        <RatingStars value={Math.round(avg)} size={16} className="mt-2 justify-center gap-0" />
        <p className="mt-2 text-xs text-muted">{count} review{count === 1 ? '' : 's'}</p>
      </div>
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((star, i) => {
          const n = distribution[star] ?? 0
          const pct = (n / total) * 100
          return (
            <div key={star} className="flex items-center gap-3 text-xs">
              <span className="flex w-8 items-center gap-1 font-mono text-muted">{star}<Star className="h-3 w-3 fill-warning text-warning" /></span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-warning to-[#fde68a]"
                  initial={reduce ? false : { width: 0 }}
                  whileInView={{ width: `${pct}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  style={reduce ? { width: `${pct}%` } : undefined}
                />
              </div>
              <span className="w-10 text-right font-mono text-subtle">{Math.round(pct)}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ReviewsSection({ asset }: { asset: AssetDetail }) {
  const qc = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const status = useAuthStore((s) => s.status)
  const [writeOpen, setWriteOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Review | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null)

  const list = useInfiniteQuery({
    queryKey: ['reviews', asset._id, 'pages'],
    queryFn: ({ pageParam }) => api.reviews.list({ asset: asset._id, page: pageParam, limit: 5 }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.hasNext ? last.meta.page + 1 : undefined),
  })

  const reviews = useMemo(() => list.data?.pages.flatMap((p) => p.reviews) ?? [], [list.data])
  const summary = list.data?.pages[0]?.summary
  const myReview = reviews.find((r) => r.user._id === user?._id) ?? null

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['reviews', asset._id] })
    qc.invalidateQueries({ queryKey: ['assets'] })
  }

  const create = useMutation({
    mutationFn: (body: { rating: number; comment: string }) =>
      api.reviews.create({ assetId: asset._id, rating: body.rating, comment: body.comment || undefined }),
    onSuccess: () => { setWriteOpen(false); invalidate(); toast.success('Review posted') },
    onError: (e) => toast.error(isApiClientError(e) && e.code === 'CONFLICT' ? 'You already reviewed this asset.' : isApiClientError(e) && e.code === 'FORBIDDEN' ? 'Only owners can review this asset.' : isApiClientError(e) ? e.message : 'Could not post review'),
  })
  const update = useMutation({
    mutationFn: (body: { id: string; rating: number; comment: string }) =>
      api.reviews.update(body.id, { rating: body.rating, comment: body.comment }),
    onSuccess: () => { setEditTarget(null); invalidate(); toast.success('Review updated') },
    onError: (e) => toast.error(isApiClientError(e) ? e.message : 'Could not update review'),
  })
  const remove = useMutation({
    mutationFn: (id: string) => api.reviews.remove(id),
    onSuccess: () => { setDeleteTarget(null); invalidate(); toast.success('Review deleted') },
    onError: (e) => toast.error(isApiClientError(e) ? e.message : 'Could not delete review'),
  })

  const canReview = status === 'authed' && asset.isOwned && !asset.isMine
  const showWriteCard = canReview && !myReview

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        {summary && summary.count > 0 ? (
          <Summary avg={summary.avg} count={summary.count} distribution={summary.distribution as Record<number, number>} />
        ) : (
          <p className="text-sm text-muted">No reviews yet.</p>
        )}
      </Card>

      {showWriteCard && (
        <section className="rounded-panel border border-primary/30 bg-gradient-to-br from-primary/10 via-surface to-surface p-6">
          <h3 className="font-display text-lg font-semibold text-text">You own this. How is it?</h3>
          <p className="mb-5 mt-1 text-sm text-muted">Your review helps other devs decide, and helps the creator improve.</p>
          <ReviewForm
            pending={create.isPending}
            submitLabel="Post review"
            onSubmit={(rating, comment) => {
              if (rating < 1) { toast.error('Pick a star rating first'); return }
              create.mutate({ rating, comment })
            }}
          />
        </section>
      )}
      {canReview && myReview && (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-muted">You reviewed this asset.</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setEditTarget(myReview)} leftIcon={<Pencil className="h-3.5 w-3.5" />}>Edit</Button>
            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(myReview)} leftIcon={<Trash2 className="h-3.5 w-3.5" />}>Delete</Button>
          </div>
        </Card>
      )}

      {list.isLoading ? (
        <div className="flex flex-col gap-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : reviews.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">No written reviews yet — ratings only so far.</Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {reviews.map((r) => {
            const isMine = r.user._id === user?._id
            return (
              <li key={r._id}>
                <Card className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar src={r.user.avatarUrl} name={r.user.name} username={r.user.username} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-text">{r.user.name}</span>
                        <span className="text-xs text-subtle">@{r.user.username}</span>
                        <RatingStars value={r.rating} size={13} />
                        <span className="ml-auto text-xs text-subtle">{timeAgo(r.createdAt)}</span>
                      </div>
                      {r.comment && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">{r.comment}</p>}
                      {isMine && (
                        <div className="mt-2 flex gap-3">
                          <button type="button" onClick={() => setEditTarget(r)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                            <Pencil className="h-3 w-3" /> Edit
                          </button>
                          <button type="button" onClick={() => setDeleteTarget(r)} className="inline-flex items-center gap-1 text-xs text-danger hover:underline">
                            <Trash2 className="h-3 w-3" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      {list.hasNextPage && (
        <div className="flex justify-center">
          <Button variant="secondary" loading={list.isFetchingNextPage} onClick={() => list.fetchNextPage()}>
            Load more
          </Button>
        </div>
      )}

      <Modal open={writeOpen} onClose={() => setWriteOpen(false)} title="Write a review">
        <ReviewForm
          pending={create.isPending}
          submitLabel="Post review"
          onSubmit={(rating, comment) => { if (rating >= 1) create.mutate({ rating, comment }) }}
        />
        <div className="mt-3 flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => setWriteOpen(false)}>Cancel</Button>
        </div>
      </Modal>

      {editTarget && (
        <Modal open onClose={() => setEditTarget(null)} title="Edit review">
          <ReviewForm
            key={editTarget._id}
            initial={editTarget}
            pending={update.isPending}
            submitLabel="Save changes"
            onSubmit={(rating, comment) => { if (rating >= 1) update.mutate({ id: editTarget._id, rating, comment }) }}
          />
          <div className="mt-3 flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => setEditTarget(null)}>Cancel</Button>
          </div>
        </Modal>
      )}

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete review">
        <p className="text-sm text-muted">Delete your review? This can't be undone.</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" loading={remove.isPending} onClick={() => deleteTarget && remove.mutate(deleteTarget._id)}>Delete</Button>
        </div>
      </Modal>
    </div>
  )
}
