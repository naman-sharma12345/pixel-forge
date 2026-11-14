import { useParams } from 'react-router-dom'
import { Placeholder } from './Placeholder'

export default function AssetDetailPage() {
  const { slug } = useParams()
  return (
    <Placeholder
      title="Asset detail"
      pageTitle={`${slug ?? 'Asset'} — Pixel Forge`}
      description="Gallery, description, license, reviews and buy box."
      seed={slug ?? 'asset'}
      kind="sprites"
    />
  )
}
