import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  Car, 
  Calendar,
  MapPin,
  Wrench,
  ClipboardList,
  FileText
} from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

export function Sidebar() {
  const location = useLocation()
  const currentScreen = useAppStore((state) => state.currentScreen)
  
  const mainWorkflowItems = [
    { icon: Home, label: 'Início', path: '/home', screen: 'landing' },
    { icon: FileText, label: 'Sinistros', path: '/results', screen: 'results' },
    { icon: Calendar, label: 'Agendamentos', path: '/appointment', screen: 'appointment' },
  ]
  
  const managementItems = [
    { icon: Car, label: 'Veículos', path: '/vehicles' },
    { icon: MapPin, label: 'Concessionárias', path: '/dealers' },
    { icon: Wrench, label: 'Peças', path: '/parts' },
    { icon: ClipboardList, label: 'Relatórios', path: '/damage-reports' },
  ]
  
  return (
    <aside className="w-64 bg-white shadow-lg border-r border-gray-200 min-h-screen">
      <div className="p-6">
        {/* Main Workflow */}
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Fluxo Principal
          </h2>
          <nav className="space-y-1">
            {mainWorkflowItems.map((item) => {
              const isActive = location.pathname === item.path
              const Icon = item.icon
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-vw-blue text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.label}
                  {isActive && (
                    <div className="ml-auto w-2 h-2 bg-vw-accent rounded-full"></div>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>
        
        {/* Management Section */}
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Gerenciamento
          </h2>
          <nav className="space-y-1">
            {managementItems.map((item) => {
              const isActive = location.pathname === item.path
              const Icon = item.icon
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-vw-blue text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
        
        {/* Quick Stats */}
        <div className="mt-8 p-4 bg-vw-gray-light rounded-lg">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Status do Sistema
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">BeamNG</span>
              <span className="status-dot-online"></span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">API Backend</span>
              <span className="status-dot-online"></span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}