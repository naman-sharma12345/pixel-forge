import { Page } from '@/components/layout'
import { DashHeader } from '@/components/dashboard/DashboardLayout'
import { AssetWizard } from '@/features/studio/wizard/AssetWizard'

export default function StudioNewPage() {
  return (
    <Page title="Upload a new asset" description="Publish a new asset to Pixel Forge.">
      <DashHeader eyebrow="Creator Studio" title="Upload a new asset" subtitle="Five quick steps. Your text is saved as a draft while you work." />
      <AssetWizard mode="create" />
    </Page>
  )
}
