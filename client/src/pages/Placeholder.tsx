import type { ReactNode } from 'react'
import { Page } from '@/components/layout'
import { EmptyState } from '@/components/ui'
import { generateSpriteThumb } from '@/lib/pixelArt'

export function Placeholder({
  title,
  pageTitle,
  description,
  seed = 'soon',
  kind = 'sprites',
  children,
}: {
  title: string
  pageTitle: string
  description: string
  seed?: string
  kind?: string
  children?: ReactNode
}) {
  return (
    <Page title={pageTitle} description={description}>
      <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-text sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        {children ?? (
          <EmptyState
            seed={seed}
            kind={kind}
            title="Forging this page…"
            text="This section is being hammered out. Check back soon."
          />
        )}
      </div>
    </Page>
  )
}

export function art(seed: string, kind = 'sprites') {
  return generateSpriteThumb(seed, kind)
}
