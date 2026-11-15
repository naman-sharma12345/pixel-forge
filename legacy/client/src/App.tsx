import { useEffect, useState } from 'react'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import { Toaster } from 'react-hot-toast'
import { router } from './router'
import { bootstrapAuth, useAuthStore } from './stores/auth'
import { AnvilMark } from './components/layout/Logo'
import { isApiClientError } from './api'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (isApiClientError(error) && error.status >= 400 && error.status < 500) return false
        return failureCount < 1
      },
      refetchOnWindowFocus: false,
    },
  },
})

function Splash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg">
      <div className="relative">
        <div className="absolute -inset-6 animate-pulse rounded-full bg-primary/20 blur-2xl" />
        <AnvilMark className="relative h-16 w-16" />
      </div>
      <p className="font-pixel text-xs text-gradient">PIXEL FORGE</p>
      <p className="font-pixel text-[9px] text-subtle animate-pixel-blink">LOADING…</p>
    </div>
  )
}

export default function App() {
  const [ready, setReady] = useState(false)
  const status = useAuthStore((s) => s.status)

  useEffect(() => {
    bootstrapAuth().finally(() => setReady(true))
  }, [])

  if (!ready || status === 'idle' || status === 'loading') return <Splash />

  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <RouterProvider router={router} />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#161622',
              color: '#EDEDF5',
              border: '1px solid #262636',
              borderRadius: '10px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#A3E635', secondary: '#08080D' } },
            error: { iconTheme: { primary: '#FB7185', secondary: '#08080D' } },
          }}
        />
      </HelmetProvider>
    </QueryClientProvider>
  )
}
