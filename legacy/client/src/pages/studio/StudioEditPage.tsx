import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'
import { Page } from '@/components/layout'
import { DashHeader } from '@/components/dashboard/DashboardLayout'
import { StatusBadge } from '@/components/dashboard/table'
import { AssetWizard } from '@/features/studio/wizard/AssetWizard'
import { Button, EmptyState } from '@/components/ui'
import { api } from '@/api'
import { useAssetDetail } from '@/hooks/useAssets'

/** The edit route only carries the id; find its slug in the creator's own list. */
function useSlugForId(id: string | undefined) {
  return useQuery({
    queryKey: ['assets', 'mine', 'slug-for', id],
    enabled: !!id,
    queryFn: async () => {
      for (let page = 1; page <= 50; page++) {
        const res = await api.assets.mine({ page, limit: 48 })
        const hit = res.items.find((a) => a._id === id)
        if (hit) return hit.slug
        if (!res.meta.hasNext) break
      }
      return null
    },
  })
}

export default function StudioEditPage() {
  const { id } = useParams<{ id: string }>()
  const slugQ = useSlugForId(id)
  const detail = useAssetDetail(slugQ.data ?? undefined)
  const asset = detail.data
  const loading = slugQ.isLoading || (!!slugQ.data && detail.isLoading)

  return (
    <Page title={asset ? `Edit ${asset.title}` : 'Edit asset'}>
      <DashHeader
        eyebrow="Creator Studio"
        title={asset ? `Edit “${asset.title}”` : 'Edit asset'}
        subtitle={asset ? <span className="inline-flex items-center gap-2">Status <StatusBadge status={asset.status} /> · Only changed fields are saved</span> : 'Loading your asset…'}
        actions={asset && (
          <Link to={`/asset/${asset.slug}`}>
            <Button variant="secondary" leftIcon={<ExternalLink className="h-4 w-4" />}>View live page</Button>
          </Link>
        )}
      />
      {loading ? (
        <div className="space-y-4">
          <div className="h-16 animate-pulse rounded-panel border border-border bg-surface" />
          <div className="h-[520px] animate-pulse rounded-panel border border-border bg-surface" />
        </div>
      ) : !asset ? (
        <EmptyState
          art="ghost"
          title="We can’t find that asset in your studio"
          text="It may belong to another creator, or the link is out of date."
          action={<Link to="/studio/assets"><Button>Back to my assets</Button></Link>}
        />
      ) : (
        <AssetWizard key={asset._id} mode="edit" asset={asset} />
      )}
    </Page>
  )
}
