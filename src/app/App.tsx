import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/display'
import { useBranding } from '@/components/common/Brand'
import { useRealtimeSync } from '@/hooks/useData'
import { useUiStore } from '@/stores/uiStore'
import { router } from './router'

const queryClient = new QueryClient({
  defaultOptions: {
    // Fase 1: dados locais. Fase 2: ajustar staleTime por recurso.
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
})

function Bootstrap() {
  useBranding()
  useRealtimeSync()
  const theme = useUiStore((s) => s.theme)
  const resolved = theme === 'system' ? 'system' : theme
  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors closeButton theme={resolved} toastOptions={{ duration: 4000 }} />
    </>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        <Bootstrap />
      </TooltipProvider>
    </QueryClientProvider>
  )
}
