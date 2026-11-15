import type { ReactNode } from 'react'
import { Helmet } from 'react-helmet-async'

export function Page({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <>
      <Helmet>
        <title>{title} — Pixel Forge</title>
        {description && <meta name="description" content={description} />}
      </Helmet>
      {children}
    </>
  )
}
