import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, Lock, RotateCcw, ShieldCheck, X, XCircle } from 'lucide-react'
import { Modal, Button } from '@/components/ui'
import { api, isApiClientError } from '@/api'
import { mediaUrl } from '@/lib/media'
import { cn } from '@/lib/cn'
import type { CheckoutResult } from '@/types/api'

type Phase = 'form' | 'processing' | 'success' | 'failed'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const rupees = (n: number) => (n === 0 ? 'Free' : `₹${n.toLocaleString('en-IN')}`)
const STAGES = ['Contacting PixelPay…', 'Authorising card…', 'Confirming order…']

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  )
}

const inputCls =
  'h-11 w-full rounded-control border border-border bg-surface-2 px-3 font-mono text-sm text-text outline-none transition-colors focus:border-primary/60 focus:ring-2 focus:ring-primary/20 disabled:opacity-60'

/**
 * Our own simulated payment sheet. There is no real gateway and no payment
 * script is ever loaded; "Pay" calls api.payments.mockConfirm.
 */
export function PixelPayModal({
  open,
  checkout,
  onClose,
  onPaid,
}: {
  open: boolean
  checkout: CheckoutResult | null
  onClose: () => void
  onPaid: (orderId: string) => void
}) {
  const reduce = useReducedMotion()
  const [phase, setPhase] = useState<Phase>('form')
  const [stage, setStage] = useState(0)
  const [error, setError] = useState('')
  const [card, setCard] = useState({ number: '4242 4242 4242 4242', expiry: '12 / 30', cvc: '123', name: 'PIXEL FORGE DEMO' })
  const order = checkout?.order ?? null

  useEffect(() => {
    if (open) {
      setPhase('form')
      setStage(0)
      setError('')
    }
  }, [open, checkout])

  const pay = async (outcome: 'success' | 'failure') => {
    if (!order || phase === 'processing' || phase === 'success') return
    setPhase('processing')
    setError('')
    setStage(0)
    const s1 = window.setTimeout(() => setStage(1), 400)
    const s2 = window.setTimeout(() => setStage(2), 850)
    try {
      await sleep(1200)
      await api.payments.mockConfirm({ orderId: order._id, outcome })
      setPhase('success')
      await sleep(700)
      onPaid(order._id)
    } catch (err) {
      setPhase('failed')
      setError(
        isApiClientError(err) && err.code === 'PAYMENT_FAILED'
          ? 'Your bank declined this payment. Nothing was charged and your cart is untouched.'
          : isApiClientError(err)
            ? err.message
            : 'The payment didn’t go through. Nothing was charged.',
      )
    } finally {
      window.clearTimeout(s1)
      window.clearTimeout(s2)
    }
  }

  const busy = phase === 'processing' || phase === 'success'
  const last4 = card.number.replace(/\D/g, '').slice(-4).padStart(4, '•')

  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} className="max-w-[440px] overflow-hidden p-0" contentClassName="p-0">
      {order && (
        <div>
          {/* header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-gradient-to-br from-primary to-accent font-pixel text-[9px] text-white shadow-pixel-sm">P</span>
              <div className="leading-tight">
                <p className="font-display text-sm font-semibold text-text">PixelPay</p>
                <p className="flex items-center gap-1 text-[11px] text-subtle"><Lock className="h-2.5 w-2.5" /> Secure demo checkout</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              aria-label="Cancel payment"
              className="rounded-control p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-text disabled:opacity-30"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[calc(100vh-10rem)] overflow-y-auto p-5">
            {/* order summary */}
            <div className="rounded-card border border-border bg-surface-2/60">
              <ul className="divide-y divide-border/70">
                {order.items.slice(0, 3).map((i) => (
                  <li key={i.assetId} className="flex items-center gap-3 p-3">
                    {i.thumbnailUrl && <img src={mediaUrl(i.thumbnailUrl)} alt="" className="pixelated h-9 w-9 shrink-0 rounded-[6px] object-cover" />}
                    <span className="min-w-0 flex-1 truncate text-sm text-text">{i.title}</span>
                    <span className="font-mono text-xs text-muted">{rupees(i.price)}</span>
                  </li>
                ))}
                {order.items.length > 3 && <li className="px-3 py-2 text-xs text-subtle">+ {order.items.length - 3} more item{order.items.length - 3 === 1 ? '' : 's'}</li>}
              </ul>
              <div className="flex items-center justify-between border-t border-border px-3 py-3">
                <span className="text-sm text-muted">Total <span className="text-xs text-subtle">· fee included</span></span>
                <span className="font-mono text-lg font-semibold text-text">{rupees(order.total)}</span>
              </div>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {phase === 'failed' ? (
                <motion.div
                  key="failed"
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-5 rounded-card border border-danger/40 bg-danger/10 p-4"
                  role="alert"
                >
                  <div className="flex items-start gap-3">
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
                    <div>
                      <p className="font-semibold text-text">Payment failed</p>
                      <p className="mt-1 text-sm text-muted">{error}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
                    <Button className="flex-[2]" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={() => pay('success')}>Try again</Button>
                  </div>
                </motion.div>
              ) : phase === 'success' ? (
                <motion.div
                  key="success"
                  initial={reduce ? false : { opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-5 flex flex-col items-center gap-3 py-6 text-center"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success text-bg shadow-[0_0_0_8px_rgba(163,230,53,0.15)]">
                    <Check className="h-7 w-7" strokeWidth={3} />
                  </span>
                  <p className="font-display text-lg font-semibold text-text">Payment successful</p>
                  <p className="text-sm text-muted">Taking you to your downloads…</p>
                </motion.div>
              ) : (
                <motion.div key="form" initial={false} exit={{ opacity: 0 }}>
                  {/* card preview */}
                  <div className="relative mt-5 h-[150px] overflow-hidden rounded-[16px] bg-gradient-to-br from-[#4c1d95] via-primary to-[#0e7490] p-5 text-white shadow-[0_20px_40px_-12px_rgba(139,92,246,0.5)]">
                    <div className="dot-grid absolute inset-0 opacity-30" />
                    <div className="relative flex h-full flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <span className="h-7 w-9 rounded-[5px] bg-gradient-to-br from-[#fde68a] to-[#b45309] opacity-90" />
                        <span className="font-pixel text-[9px] tracking-wider">PIXELPAY</span>
                      </div>
                      <p className="font-mono text-lg tracking-[0.18em]">•••• •••• •••• {last4}</p>
                      <div className="flex justify-between font-mono text-[11px] uppercase opacity-90">
                        <span className="truncate">{card.name || 'Cardholder'}</span>
                        <span>{card.expiry}</span>
                      </div>
                    </div>
                  </div>

                  <fieldset disabled={busy} className="mt-5 grid gap-3">
                    <Field label="Card number">
                      <input value={card.number} onChange={(e) => setCard((c) => ({ ...c, number: e.target.value }))} inputMode="numeric" autoComplete="off" className={inputCls} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Expiry">
                        <input value={card.expiry} onChange={(e) => setCard((c) => ({ ...c, expiry: e.target.value }))} autoComplete="off" className={inputCls} />
                      </Field>
                      <Field label="CVC">
                        <input value={card.cvc} onChange={(e) => setCard((c) => ({ ...c, cvc: e.target.value }))} inputMode="numeric" autoComplete="off" className={inputCls} />
                      </Field>
                    </div>
                    <Field label="Name on card">
                      <input value={card.name} onChange={(e) => setCard((c) => ({ ...c, name: e.target.value }))} autoComplete="off" className={cn(inputCls, 'font-sans')} />
                    </Field>
                  </fieldset>

                  <div className="mt-5 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => pay('success')}
                      disabled={busy}
                      className="relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-control bg-primary text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-wait"
                    >
                      {phase === 'processing' && (
                        <motion.span
                          className="absolute inset-y-0 left-0 bg-white/15"
                          initial={{ width: '0%' }}
                          animate={{ width: '92%' }}
                          transition={{ duration: 1.2, ease: 'easeOut' }}
                        />
                      )}
                      <span className="relative flex items-center gap-2">
                        {phase === 'processing' ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            {STAGES[stage]}
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4" /> Pay {rupees(order.total)}
                          </>
                        )}
                      </span>
                    </button>
                    <Button variant="ghost" size="sm" className="w-full" disabled={busy} onClick={() => pay('failure')}>
                      Simulate failure
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="mt-4 flex items-center justify-center gap-1.5 rounded-control bg-warning/10 px-3 py-2 text-center text-[11px] font-medium text-warning">
              <ShieldCheck className="h-3.5 w-3.5" /> Demo mode - no real money is charged
            </p>
          </div>
        </div>
      )}
    </Modal>
  )
}
