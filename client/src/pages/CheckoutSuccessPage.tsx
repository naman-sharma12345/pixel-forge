import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Page } from '@/components/layout'
import { Button } from '@/components/ui'

export default function CheckoutSuccessPage() {
  useEffect(() => {
    const t = setTimeout(() => {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#8B5CF6', '#22D3EE', '#A3E635', '#F472B6'] })
    }, 300)
    return () => clearTimeout(t)
  }, [])

  return (
    <Page title="Order complete — Pixel Forge" description="Your purchase was successful.">
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex max-w-md flex-col items-center gap-4 text-center"
        >
          <CheckCircle2 className="h-16 w-16 text-success" />
          <h1 className="font-display text-2xl font-bold text-text">Purchase complete</h1>
          <p className="text-sm text-muted">
            Your assets are ready in the library. This is a demo — no real payment was processed.
          </p>
          <div className="mt-2 flex gap-3">
            <Link to="/library"><Button>Go to library</Button></Link>
            <Link to="/explore"><Button variant="secondary">Keep exploring</Button></Link>
          </div>
        </motion.div>
      </div>
    </Page>
  )
}
