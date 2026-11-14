import { Link } from 'react-router-dom'
import { Page } from '@/components/layout'
import { Button } from '@/components/ui'
import { AnvilMark } from '@/components/layout/Logo'

export default function NotFoundPage() {
  return (
    <Page title="404 — Pixel Forge" description="Page not found.">
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <AnvilMark className="h-16 w-16 opacity-60" />
        <div>
          <p className="font-pixel text-4xl text-gradient">404</p>
          <h1 className="mt-3 font-display text-xl font-semibold text-text">This page doesn't exist</h1>
          <p className="mt-1 text-sm text-muted">The pixels wandered off. Let's get you back to the forge.</p>
        </div>
        <Link to="/"><Button>Back home</Button></Link>
      </div>
    </Page>
  )
}
