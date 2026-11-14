import { useParams } from 'react-router-dom'
import { Placeholder } from './Placeholder'

export default function UserProfilePage() {
  const { username } = useParams()
  return (
    <Placeholder
      title={`@${username ?? 'creator'}`}
      pageTitle={`${username ?? 'Creator'} — Pixel Forge`}
      description="Public creator profile with stats and asset grid."
      seed={username ?? 'creator'}
      kind="characters"
    />
  )
}
