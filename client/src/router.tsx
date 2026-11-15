import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom'
import { Navbar, Footer, GlobalPlayer, CartDrawer, ScrollToTop, ErrorBoundary } from '@/components/layout'
import { Spinner } from '@/components/ui'
import { AdminLayout, StudioLayout } from '@/components/dashboard/layouts'
import { useAuthStore } from '@/stores/auth'
import type { Role } from '@/types/api'

// ---------- guards ----------
function RequireAuth({ children }: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status)
  const location = useLocation()
  if (status === 'idle' || status === 'loading') {
    return <div className="flex min-h-[50vh] items-center justify-center"><Spinner /></div>
  }
  if (status !== 'authed') {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }
  return <>{children}</>
}

function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const user = useAuthStore((s) => s.user)
  const status = useAuthStore((s) => s.status)
  if (status === 'idle' || status === 'loading') {
    return <div className="flex min-h-[50vh] items-center justify-center"><Spinner /></div>
  }
  if (status !== 'authed') return <RequireAuth>{children}</RequireAuth>
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

// ---------- lazy pages ----------
const HomePage = lazy(() => import('@/pages/HomePage'))
const ExplorePage = lazy(() => import('@/pages/ExplorePage'))
const CategoryRedirect = lazy(() => import('@/pages/CategoryRedirect'))
const AssetDetailPage = lazy(() => import('@/pages/AssetDetailPage'))
const UserProfilePage = lazy(() => import('@/pages/UserProfilePage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/RegisterPage'))
const CartPage = lazy(() => import('@/pages/CartPage'))
const CheckoutSuccessPage = lazy(() => import('@/pages/CheckoutSuccessPage'))
const LibraryPage = lazy(() => import('@/pages/LibraryPage'))
const WishlistPage = lazy(() => import('@/pages/WishlistPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const StudioOverviewPage = lazy(() => import('@/pages/studio/StudioOverviewPage'))
const StudioAssetsPage = lazy(() => import('@/pages/studio/StudioAssetsPage'))
const StudioNewPage = lazy(() => import('@/pages/studio/StudioNewPage'))
const StudioEditPage = lazy(() => import('@/pages/studio/StudioEditPage'))
const StudioSalesPage = lazy(() => import('@/pages/studio/StudioSalesPage'))
const AdminOverviewPage = lazy(() => import('@/pages/admin/AdminOverviewPage'))
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'))
const AdminAssetsPage = lazy(() => import('@/pages/admin/AdminAssetsPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner />
    </div>
  )
}

function RootLayout() {
  return (
    <ErrorBoundary>
      <ScrollToTop />
      <Navbar />
      <main className="min-h-[60vh]">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <GlobalPlayer />
      <CartDrawer />
    </ErrorBoundary>
  )
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/explore', element: <ExplorePage /> },
      { path: '/category/:key', element: <CategoryRedirect /> },
      { path: '/asset/:slug', element: <AssetDetailPage /> },
      { path: '/u/:username', element: <UserProfilePage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/cart', element: <CartPage /> },
      { path: '/checkout/success', element: <CheckoutSuccessPage /> },
      {
        path: '/library',
        element: <RequireAuth><LibraryPage /></RequireAuth>,
      },
      {
        path: '/wishlist',
        element: <RequireAuth><WishlistPage /></RequireAuth>,
      },
      {
        path: '/settings',
        element: <RequireAuth><SettingsPage /></RequireAuth>,
      },
      {
        path: '/studio',
        element: <RequireRole roles={['creator', 'admin']}><StudioLayout /></RequireRole>,
        children: [
          { index: true, element: <StudioOverviewPage /> },
          { path: 'assets', element: <StudioAssetsPage /> },
          { path: 'new', element: <StudioNewPage /> },
          { path: 'edit/:id', element: <StudioEditPage /> },
          { path: 'sales', element: <StudioSalesPage /> },
        ],
      },
      {
        path: '/admin',
        element: <RequireRole roles={['admin']}><AdminLayout /></RequireRole>,
        children: [
          { index: true, element: <AdminOverviewPage /> },
          { path: 'users', element: <AdminUsersPage /> },
          { path: 'assets', element: <AdminAssetsPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

