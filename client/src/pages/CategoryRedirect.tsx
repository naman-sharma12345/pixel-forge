import { Navigate, useParams } from 'react-router-dom'

export default function CategoryRedirect() {
  const { key } = useParams<{ key: string }>()
  return <Navigate to={`/explore?category=${encodeURIComponent(key ?? '')}`} replace />
}
