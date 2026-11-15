import { createElement, useCallback, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { api, isApiClientError } from '@/api'
import { keys } from '@/hooks/keys'
import { PixelPayModal } from './PixelPayModal'
import type { CheckoutResult } from '@/types/api'

/**
 * Opens the simulated PixelPay checkout for the whole cart (or given asset ids).
 * Renders `modal` — mount it once near the page root.
 */
export function useCheckout() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [checkout, setCheckout] = useState<CheckoutResult | null>(null)
  const [open, setOpen] = useState(false)
  const [isStarting, setStarting] = useState(false)
  const busy = useRef(false)

  const startCheckout = useCallback(
    async (assetIds?: string[]) => {
      if (busy.current) return
      busy.current = true
      setStarting(true)
      try {
        const res = await api.orders.checkout(assetIds ? { assetIds } : {})
        setCheckout(res)
        setOpen(true)
      } catch (err) {
        toast.error(isApiClientError(err) ? err.message : 'Could not start checkout')
      } finally {
        busy.current = false
        setStarting(false)
      }
    },
    [],
  )

  const close = useCallback(() => {
    setOpen(false)
    // brief delay so the exit animation isn't cut by navigation/state change
    window.setTimeout(() => setCheckout(null), 250)
  }, [])

  const handleClose = useCallback(() => {
    close()
    toast('Payment cancelled')
  }, [close])

  const handlePaid = useCallback(
    (orderId: string) => {
      qc.invalidateQueries({ queryKey: keys.cart })
      qc.invalidateQueries({ queryKey: keys.library.all })
      qc.invalidateQueries({ queryKey: ['assets'] })
      qc.invalidateQueries({ queryKey: keys.auth.me })
      close()
      navigate(`/checkout/success?order=${orderId}`)
    },
    [qc, navigate, close],
  )

  const modal: ReactNode = createElement(PixelPayModal, {
    open,
    checkout,
    onClose: handleClose,
    onPaid: handlePaid,
  })

  return { startCheckout, modal, isStarting }
}
