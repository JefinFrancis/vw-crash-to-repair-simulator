import { Link, useLocation } from 'react-router-dom'
import { Car, Zap } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'

export function Header() {
  const location = useLocation()
  const { currentScreen, selectedVehicle } = useAppStore()
  
  return (
    <header className="bg-vw-blue text-white shadow-lg">
      <div className="vw-container">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Car className="h-8 w-8" />
                <Zap className="h-6 w-6 text-vw-accent" />
              </div>
              <div>
                <h1 className="text-xl font-bold">VW Brand Day</h1>
                <p className="text-xs text-blue-200">Experiência Batida ao Reparo</p>
              </div>
            </Link>
          </div>

          {/* Current Vehicle Info */}
          {selectedVehicle && (
            <div className="hidden md:flex items-center space-x-4 bg-vw-blue-dark px-4 py-2 rounded-lg">
              <Car className="h-5 w-5" />
              <div className="text-sm">
                <div className="font-medium">{selectedVehicle.make} {selectedVehicle.model}</div>
                <div className="text-blue-200">{selectedVehicle.year} • VIN: {selectedVehicle.vin.slice(-6)}</div>
              </div>
            </div>
          )}

          {/* Workflow Progress */}
          <div className="hidden lg:flex items-center space-x-2">
            <div className="flex items-center space-x-1 text-xs">
              <div className={`w-3 h-3 rounded-full ${
                ['landing', 'simulation', 'analysis', 'results', 'appointment'].includes(currentScreen)
                  ? 'bg-white' 
                  : 'bg-blue-400'
              }`}></div>
              <span className="text-blue-200">Simulação</span>
            </div>
            <div className="w-8 h-px bg-blue-400"></div>
            <div className="flex items-center space-x-1 text-xs">
              <div className={`w-3 h-3 rounded-full ${
                ['analysis', 'results', 'appointment'].includes(currentScreen)
                  ? 'bg-white' 
                  : 'bg-blue-400'
              }`}></div>
              <span className="text-blue-200">Análise</span>
            </div>
            <div className="w-8 h-px bg-blue-400"></div>
            <div className="flex items-center space-x-1 text-xs">
              <div className={`w-3 h-3 rounded-full ${
                ['appointment'].includes(currentScreen)
                  ? 'bg-white' 
                  : 'bg-blue-400'
              }`}></div>
              <span className="text-blue-200">Agendamentos</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => window.location.reload()}
              className="p-2 hover:bg-vw-blue-dark rounded-lg transition-colors"
              title="Reiniciar Sessão"
            >
              <Zap className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}