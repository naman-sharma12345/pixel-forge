import { useParams } from 'react-router-dom'
import { Placeholder } from '../Placeholder'

export default function StudioEditPage() {
  const { id } = useParams()
  return <Placeholder title="Edit asset" pageTitle="Edit asset — Pixel Forge" description={`Editing ${id ?? 'asset'}.`} seed="edit" kind="vfx" />
}
