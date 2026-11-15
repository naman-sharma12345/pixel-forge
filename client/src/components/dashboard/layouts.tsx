import { BarChart3, Boxes, LayoutDashboard, Receipt, Shield, Upload, UserRound, Users } from 'lucide-react'
import { DashboardLayout, type DashNavItem } from './DashboardLayout'
import { useAuthStore } from '@/stores/auth'

const STUDIO_ITEMS: DashNavItem[] = [
  { to: '/studio', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/studio/assets', label: 'My assets', icon: Boxes },
  { to: '/studio/new', label: 'Upload new', icon: Upload, highlight: true },
  { to: '/studio/sales', label: 'Sales', icon: Receipt },
]

const ADMIN_ITEMS: DashNavItem[] = [
  { to: '/admin', label: 'Overview', icon: BarChart3, end: true },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/assets', label: 'Assets', icon: Boxes },
]

export function StudioLayout() {
  const username = useAuthStore((s) => s.user?.username)
  return (
    <DashboardLayout
      label="Creator Studio"
      badge="studio"
      items={STUDIO_ITEMS}
      footerLink={username ? { to: `/u/${username}`, label: 'View my profile', icon: UserRound } : undefined}
    />
  )
}

export function AdminLayout() {
  return <DashboardLayout label="Admin panel" badge="admin" items={ADMIN_ITEMS} footerLink={{ to: '/studio', label: 'Creator Studio', icon: Shield }} />
}
