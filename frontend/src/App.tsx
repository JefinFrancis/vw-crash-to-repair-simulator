import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AppRouter } from './Router'
import { AppProvider } from './store/AppProvider'
import { DemoModeProvider } from './hooks/useDemoMode'
import { DemoModeOverlay } from './components/DemoModeOverlay'
import { DemoModeToggle } from './components/DemoModeToggle'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      gcTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppProvider>
          <DemoModeProvider>
            <AppRouter />
            <DemoModeOverlay />
            <DemoModeToggle variant="floating" />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
              }}
            />
          </DemoModeProvider>
        </AppProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App