import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { ConnectionStatus } from './ConnectionStatus'
import { useAppStore } from '../store/useAppStore'

export function Layout() {
  const isLoading = useAppStore((state) => state.isLoading)
  
  return (
    <div className="min-h-screen bg-vw-gray-light">
      <Header />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 p-6">
          {isLoading && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
              <div className="bg-white rounded-lg p-8 flex items-center space-x-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-vw-blue"></div>
                <span className="text-lg font-medium">Loading...</span>
              </div>
            </div>
          )}
          
          <Outlet />
        </main>
      </div>
      
      <ConnectionStatus />
    </div>
  )
}